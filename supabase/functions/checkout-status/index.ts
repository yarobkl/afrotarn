import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) })
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405)

  let body: { session_id?: string }
  try {
    body = await req.json()
  } catch {
    return json(req, { error: 'Invalid request' }, 400)
  }

  const sessionId = String(body.session_id || '').trim()
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId) || sessionId.length > 255) {
    return json(req, { error: 'Invalid checkout session' }, 400)
  }

  const { data: order, error } = await admin
    .from('orders')
    .select('order_number,status,total_cents,currency,paid_at,ready_at,created_at')
    .eq('stripe_checkout_session_id', sessionId)
    .maybeSingle()

  if (error) return json(req, { error: 'Unable to read order status' }, 500)
  if (!order) return json(req, { status: 'processing' }, 202)

  return json(req, {
    order_number: order.order_number,
    status: order.status,
    total_cents: order.total_cents,
    currency: order.currency,
    paid_at: order.paid_at,
    ready_at: order.ready_at,
  })
})
