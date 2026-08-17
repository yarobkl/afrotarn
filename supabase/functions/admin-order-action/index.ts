import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const transitions: Record<string, Set<string>> = {
  paid: new Set(['preparing', 'cancelled']),
  preparing: new Set(['ready', 'cancelled']),
  ready: new Set(['collected']),
}

async function dispatchPendingReadyEmail(orderId: string) {
  const { data: outbox } = await admin
    .from('email_outbox')
    .select('id')
    .eq('order_id', orderId)
    .eq('template', 'order_ready')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!outbox) return

  const response = await fetch(`${SUPABASE_URL}/functions/v1/send-order-email`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ outbox_id: outbox.id }),
  })
  if (!response.ok) console.error('Ready email dispatch failed', await response.text())
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const authorization = req.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) {
    return Response.json({ error: 'Authentication required' }, { status: 401 })
  }

  const token = authorization.slice('Bearer '.length)
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } })
  const { data: userData, error: userError } = await userClient.auth.getUser(token)
  const user = userData.user
  if (userError || !user) return Response.json({ error: 'Invalid session' }, { status: 401 })

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (profileError || !profile || !['admin', 'staff'].includes(profile.role)) {
    return Response.json({ error: 'Not authorized' }, { status: 403 })
  }

  const body = await req.json() as { order_id?: string; status?: string }
  if (!body.order_id || !body.status) return Response.json({ error: 'Invalid order action' }, { status: 400 })

  const { data: current, error: orderError } = await admin
    .from('orders')
    .select('*')
    .eq('id', body.order_id)
    .single()
  if (orderError || !current) return Response.json({ error: 'Order not found' }, { status: 404 })

  if (!transitions[current.status]?.has(body.status)) {
    return Response.json({ error: `Transition ${current.status} → ${body.status} not allowed` }, { status: 409 })
  }

  const now = new Date().toISOString()
  const patch: Record<string, unknown> = { status: body.status }
  if (body.status === 'preparing') patch.preparing_at = now
  if (body.status === 'ready') patch.ready_at = now
  if (body.status === 'collected') patch.collected_at = now
  if (body.status === 'cancelled') patch.cancelled_at = now

  const { data: order, error: updateError } = await admin
    .from('orders')
    .update(patch)
    .eq('id', body.order_id)
    .select('*')
    .single()
  if (updateError) return Response.json({ error: updateError.message }, { status: 500 })

  await admin.from('order_events').insert({
    order_id: order.id,
    event_type: 'status_changed',
    from_status: current.status,
    to_status: body.status,
    actor_user_id: user.id,
  })

  if (body.status === 'ready') {
    const { data: outbox, error: outboxError } = await admin.from('email_outbox').insert({
      order_id: order.id,
      template: 'order_ready',
      recipient: order.customer_email,
      payload: { order_number: order.order_number },
    }).select('id').single()

    if (!outboxError && outbox) await dispatchPendingReadyEmail(order.id)
  }

  return Response.json({ ok: true, order })
})
