import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

type EmailTemplate = 'payment_confirmed' | 'order_ready' | 'order_cancelled' | 'order_refunded'

type RequestBody = { outbox_id?: string }

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const ORDER_FROM_EMAIL = Deno.env.get('ORDER_FROM_EMAIL')
const SHOP_ADDRESS = '70 rue du Château du Roi, 81600 Gaillac'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

function decodeRole(authorization: string | null) {
  if (!authorization?.startsWith('Bearer ')) return null
  const token = authorization.slice(7)
  const payload = token.split('.')[1]
  if (!payload) return null
  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    const json = JSON.parse(atob(padded))
    return typeof json?.role === 'string' ? json.role : null
  } catch {
    return null
  }
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function euro(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

function render(template: EmailTemplate, order: any, items: any[]) {
  const orderNumber = escapeHtml(order.order_number)
  const itemRows = items.map(item => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #eee">${escapeHtml(item.product_name)} × ${Number(item.quantity) || 0}</td>
      <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${escapeHtml(euro(Number(item.line_total_cents) || 0))}</td>
    </tr>`).join('')

  if (template === 'payment_confirmed') {
    return {
      subject: `Paiement confirmé — commande ${order.order_number}`,
      html: `
        <div style="font-family:Arial,sans-serif;color:#173c2d;max-width:620px;margin:auto">
          <h1 style="font-family:Georgia,serif">Merci pour votre commande.</h1>
          <p>Votre paiement a bien été validé. Votre commande <strong>${orderNumber}</strong> passe maintenant en préparation chez AfroTarn.</p>
          <table style="width:100%;border-collapse:collapse">${itemRows}</table>
          <p style="font-size:18px"><strong>Total payé : ${escapeHtml(euro(Number(order.total_cents) || 0))}</strong></p>
          <p>Nous vous enverrons un nouvel e-mail dès qu’Estelle aura terminé la préparation. Merci d’attendre ce message avant de vous déplacer.</p>
          <p><strong>Retrait :</strong><br>${escapeHtml(SHOP_ADDRESS)}</p>
        </div>`,
    }
  }

  if (template === 'order_ready') {
    return {
      subject: `Votre commande ${order.order_number} est prête 🎉`,
      html: `
        <div style="font-family:Arial,sans-serif;color:#173c2d;max-width:620px;margin:auto">
          <h1 style="font-family:Georgia,serif">Votre commande est prête.</h1>
          <p>Bonne nouvelle : Estelle a terminé la préparation de votre commande <strong>${orderNumber}</strong>.</p>
          <p>Vous pouvez maintenant venir la récupérer à la boutique.</p>
          <div style="padding:18px;border-radius:14px;background:#f4eee5;margin:24px 0">
            <strong>Numéro de commande</strong><br>
            <span style="font-size:28px">${orderNumber}</span>
          </div>
          <p><strong>Adresse de retrait :</strong><br>${escapeHtml(SHOP_ADDRESS)}</p>
          <p>Présentez simplement votre numéro de commande lors du retrait.</p>
        </div>`,
    }
  }

  if (template === 'order_cancelled') {
    return {
      subject: `Commande ${order.order_number} annulée`,
      html: `<div style="font-family:Arial,sans-serif;color:#173c2d;max-width:620px;margin:auto"><h1>Commande annulée</h1><p>Votre commande <strong>${orderNumber}</strong> a été annulée. Pour toute question, contactez AfroTarn.</p></div>`,
    }
  }

  return {
    subject: `Remboursement — commande ${order.order_number}`,
    html: `<div style="font-family:Arial,sans-serif;color:#173c2d;max-width:620px;margin:auto"><h1>Remboursement enregistré</h1><p>Le remboursement de votre commande <strong>${orderNumber}</strong> a été enregistré.</p></div>`,
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  if (decodeRole(req.headers.get('Authorization')) !== 'service_role') {
    return Response.json({ error: 'Not authorized' }, { status: 403 })
  }
  if (!RESEND_API_KEY || !ORDER_FROM_EMAIL) {
    return Response.json({ error: 'Transactional email is not configured' }, { status: 503 })
  }

  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }
  if (!body.outbox_id) return Response.json({ error: 'outbox_id required' }, { status: 400 })

  const { data: outbox, error: outboxError } = await supabase
    .from('email_outbox')
    .select('*')
    .eq('id', body.outbox_id)
    .single()
  if (outboxError || !outbox) return Response.json({ error: 'Email job not found' }, { status: 404 })
  if (outbox.status === 'sent') return Response.json({ ok: true, duplicate: true })

  const allowedTemplates = new Set<EmailTemplate>(['payment_confirmed', 'order_ready', 'order_cancelled', 'order_refunded'])
  if (!allowedTemplates.has(outbox.template as EmailTemplate)) return Response.json({ error: 'Invalid email template' }, { status: 400 })

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', outbox.order_id)
    .single()
  if (orderError || !order) return Response.json({ error: 'Order not found' }, { status: 404 })

  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', order.id)
    .order('created_at')
  if (itemsError) return Response.json({ error: itemsError.message }, { status: 400 })

  const recipient = String(outbox.recipient || order.customer_email || '').trim()
  if (!recipient || !recipient.includes('@')) {
    await supabase.from('email_outbox').update({ status: 'failed', last_error: 'Missing recipient' }).eq('id', outbox.id)
    return Response.json({ error: 'Missing recipient' }, { status: 400 })
  }

  const rendered = render(outbox.template as EmailTemplate, order, items || [])

  await supabase.from('email_outbox').update({
    status: 'sending',
    attempts: (outbox.attempts || 0) + 1,
    last_error: null,
  }).eq('id', outbox.id)

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: ORDER_FROM_EMAIL,
      to: [recipient],
      subject: rendered.subject,
      html: rendered.html,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    await supabase.from('email_outbox').update({ status: 'failed', last_error: errorText.slice(0, 2000) }).eq('id', outbox.id)
    return Response.json({ error: 'Email provider rejected the message' }, { status: 502 })
  }

  const result = await response.json()
  await supabase.from('email_outbox').update({
    status: 'sent',
    sent_at: new Date().toISOString(),
    last_error: null,
  }).eq('id', outbox.id)

  return Response.json({ ok: true, email: result, order_number: order.order_number })
})
