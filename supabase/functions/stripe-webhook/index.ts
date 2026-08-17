import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function verifyStripeSignature(rawBody: string, signatureHeader: string, secret: string) {
  const parts = signatureHeader.split(',').map(part => part.trim())
  const timestamp = parts.find(part => part.startsWith('t='))?.slice(2)
  const signatures = parts.filter(part => part.startsWith('v1=')).map(part => part.slice(3))
  if (!timestamp || !signatures.length) return false

  const timestampNumber = Number(timestamp)
  if (!Number.isFinite(timestampNumber) || Math.abs(Date.now() / 1000 - timestampNumber) > 300) return false

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${rawBody}`))
  const expected = hex(digest)
  return signatures.some(signature => constantTimeEqual(signature, expected))
}

async function dispatchEmail(outboxId: string) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/send-order-email`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ outbox_id: outboxId }),
  })
  if (!response.ok) console.error('Email dispatch failed', await response.text())
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  if (!STRIPE_WEBHOOK_SECRET) return Response.json({ error: 'STRIPE_WEBHOOK_SECRET missing' }, { status: 503 })

  const signature = req.headers.get('stripe-signature')
  if (!signature) return Response.json({ error: 'Missing Stripe signature' }, { status: 400 })

  const rawBody = await req.text()
  if (!(await verifyStripeSignature(rawBody, signature, STRIPE_WEBHOOK_SECRET))) {
    return Response.json({ error: 'Invalid Stripe signature' }, { status: 400 })
  }

  const event = JSON.parse(rawBody)
  if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') {
    return Response.json({ received: true })
  }

  const session = event.data?.object
  if (!session || session.payment_status !== 'paid') return Response.json({ received: true })

  const orderId = session.metadata?.order_id
  if (!orderId) return Response.json({ error: 'Missing order_id metadata' }, { status: 400 })

  const { data: existing, error: lookupError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()
  if (lookupError) return Response.json({ error: lookupError.message }, { status: 400 })

  // Idempotent: Stripe may retry webhooks.
  if (['paid', 'preparing', 'ready', 'collected'].includes(existing.status)) {
    return Response.json({ received: true, duplicate: true, order_number: existing.order_number })
  }

  const paymentMethodType = session.payment_method_types?.[0]
  const paymentMethod = paymentMethodType === 'card' ? 'card' : 'other'

  const { data: order, error: updateError } = await supabase
    .from('orders')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      payment_method: paymentMethod,
    })
    .eq('id', orderId)
    .select('*')
    .single()
  if (updateError) return Response.json({ error: updateError.message }, { status: 500 })

  await supabase.from('order_events').insert({
    order_id: order.id,
    event_type: 'payment_confirmed',
    from_status: existing.status,
    to_status: 'paid',
    metadata: { stripe_event_id: event.id, stripe_checkout_session_id: session.id },
  })

  const { data: outbox, error: outboxError } = await supabase.from('email_outbox').insert({
    order_id: order.id,
    template: 'payment_confirmed',
    recipient: order.customer_email,
    payload: { order_number: order.order_number },
  }).select('*').single()

  if (!outboxError && outbox) await dispatchEmail(outbox.id)

  return Response.json({ received: true, order_number: order.order_number })
})
