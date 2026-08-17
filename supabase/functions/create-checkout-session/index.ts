import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
const SITE_URL = Deno.env.get('SITE_URL') || 'https://afrotarn.vercel.app'

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })

function originFor(req: Request) {
  const origin = req.headers.get('origin') || ''
  if (origin === 'https://afrotarn.vercel.app' || origin === 'http://localhost:5173') return origin
  if (/^https:\/\/afrotarn-[a-z0-9-]+-yarobkls-projects\.vercel\.app$/i.test(origin)) return origin
  return 'https://afrotarn.vercel.app'
}

function cors(req: Request) {
  return {
    'Access-Control-Allow-Origin': originFor(req),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

function json(req: Request, body: unknown, status = 200) {
  return Response.json(body, { status, headers: cors(req) })
}

type CheckoutItem = { product_id?: string; quantity?: number }
type CheckoutBody = { items?: CheckoutItem[]; customer_name?: string; customer_phone?: string }

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) })
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405)
  if (!STRIPE_SECRET_KEY) return json(req, { error: 'Online payment is not activated yet' }, 503)

  let body: CheckoutBody
  try {
    body = await req.json()
  } catch {
    return json(req, { error: 'Invalid request' }, 400)
  }

  const incoming = Array.isArray(body.items) ? body.items : []
  if (!incoming.length || incoming.length > 30) return json(req, { error: 'Your cart is empty or too large' }, 400)

  const quantities = new Map<string, number>()
  for (const item of incoming) {
    const id = String(item.product_id || '').trim()
    const qty = Math.floor(Number(item.quantity))
    if (!id || !Number.isFinite(qty) || qty < 1 || qty > 20) return json(req, { error: 'Invalid cart item' }, 400)
    quantities.set(id, Math.min((quantities.get(id) || 0) + qty, 20))
  }

  const ids = [...quantities.keys()]
  const { data: productRows, error: productError } = await admin
    .from('products')
    .select('id,name,price_cents,currency,active,orderable,stock_mode,stock_quantity,safety_stock')
    .in('id', ids)

  if (productError) return json(req, { error: 'Unable to validate products' }, 500)
  const byId = new Map((productRows || []).map(product => [String(product.id), product]))

  const lines: Array<{ id: string; name: string; quantity: number; price_cents: number }> = []
  for (const id of ids) {
    const product = byId.get(id)
    const qty = quantities.get(id) || 0
    if (!product || !product.active || !product.orderable || product.price_cents == null) {
      return json(req, { error: 'One or more products are not yet available for online payment', product_id: id }, 409)
    }
    if (product.currency !== 'EUR') return json(req, { error: 'Unsupported currency' }, 409)
    if (product.stock_mode === 'tracked' && (product.stock_quantity == null || product.stock_quantity < qty)) {
      return json(req, { error: `${product.name} is no longer available in the requested quantity`, product_id: id }, 409)
    }
    lines.push({ id, name: product.name, quantity: qty, price_cents: product.price_cents })
  }

  const total = lines.reduce((sum, line) => sum + line.quantity * line.price_cents, 0)
  if (total <= 0) return json(req, { error: 'Invalid order total' }, 409)

  const { data: order, error: orderError } = await admin.from('orders').insert({
    status: 'pending_payment',
    customer_email: null,
    customer_name: body.customer_name?.trim().slice(0, 120) || null,
    customer_phone: body.customer_phone?.trim().slice(0, 40) || null,
    subtotal_cents: total,
    total_cents: total,
    currency: 'EUR',
  }).select('*').single()

  if (orderError || !order) return json(req, { error: 'Unable to create order' }, 500)

  const { error: itemsError } = await admin.from('order_items').insert(lines.map(line => ({
    order_id: order.id,
    product_id: line.id,
    product_name: line.name,
    quantity: line.quantity,
    unit_price_cents: line.price_cents,
  })))

  if (itemsError) {
    await admin.from('orders').update({ status: 'cancelled', cancelled_at: new Date().toISOString(), notes: 'Order item creation failed' }).eq('id', order.id)
    return json(req, { error: 'Unable to create order items' }, 500)
  }

  const params = new URLSearchParams()
  params.set('mode', 'payment')
  params.set('locale', 'fr')
  params.set('success_url', `${SITE_URL}/commande/confirmee?session_id={CHECKOUT_SESSION_ID}`)
  params.set('cancel_url', `${SITE_URL}/click-collect?paiement=annule`)
  params.set('client_reference_id', order.id)
  params.set('metadata[order_id]', order.id)
  params.set('automatic_payment_methods[enabled]', 'true')

  lines.forEach((line, index) => {
    params.set(`line_items[${index}][price_data][currency]`, 'eur')
    params.set(`line_items[${index}][price_data][unit_amount]`, String(line.price_cents))
    params.set(`line_items[${index}][price_data][product_data][name]`, line.name)
    params.set(`line_items[${index}][quantity]`, String(line.quantity))
  })

  const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  })

  const session = await stripeResponse.json()
  if (!stripeResponse.ok || !session?.id || !session?.url) {
    const message = typeof session?.error?.message === 'string' ? session.error.message : 'Stripe checkout creation failed'
    await admin.from('orders').update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      notes: message.slice(0, 500),
    }).eq('id', order.id)
    return json(req, { error: 'Unable to start secure payment' }, 502)
  }

  await admin.from('orders').update({ stripe_checkout_session_id: session.id }).eq('id', order.id)
  await admin.from('order_events').insert({
    order_id: order.id,
    event_type: 'checkout_created',
    from_status: 'pending_payment',
    to_status: 'pending_payment',
    metadata: { stripe_checkout_session_id: session.id },
  })

  return json(req, { checkout_url: session.url, order_number: order.order_number })
})
