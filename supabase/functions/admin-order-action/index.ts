import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const allowedStatuses = new Set(['preparing', 'ready', 'collected', 'cancelled'])

async function dispatchPendingReadyEmail(orderId: string) {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
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
  if (!authorization) return Response.json({ error: 'Authentication required' }, { status: 401 })

  const body = await req.json() as { order_id?: string; status?: string }
  if (!body.order_id || !body.status || !allowedStatuses.has(body.status)) {
    return Response.json({ error: 'Invalid order action' }, { status: 400 })
  }

  const client = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  })

  const { data: order, error } = await client.rpc('set_order_status', {
    p_order_id: body.order_id,
    p_status: body.status,
  })

  if (error) {
    const status = error.message.toLowerCase().includes('authorized') ? 403 : 400
    return Response.json({ error: error.message }, { status })
  }

  if (body.status === 'ready') await dispatchPendingReadyEmail(body.order_id)

  return Response.json({ ok: true, order })
})
