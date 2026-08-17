import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

type EmailTemplate = 'payment_confirmed' | 'order_ready' | 'order_cancelled' | 'order_refunded'

type RequestBody = {
  outbox_id?: string
  order_id?: string
  template?: EmailTemplate
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const ORDER_FROM_EMAIL = Deno.env.get('ORDER_FROM_EMAIL') || 'AfroTarn <commandes@afrotarn.fr>'
const SHOP_ADDRESS = '70 rue du Château du Roi, 81600 Gaillac'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

function euro(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

function render(template: EmailTemplate, order: any, items: any[]) {
  const itemRows = items.map(item => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #eee">${item.product_name} × ${item.quantity}</td>
      <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${euro(item.line_total_cents)}</td>
    </tr>`).join('')

  if (template === 'payment_confirmed') {
    return {
      subject: `Paiement confirmé — commande ${order.order_number}`,
      html: `
        <div style="font-family:Arial,sans-serif;color:#173c2d;max-width:620px;margin:auto">
          <h1 style="font-family:Georgia,serif">Merci pour votre commande.</h1>
          <p>Votre paiement a bien été validé. Votre commande <strong>${order.order_number}</strong> passe maintenant en préparation chez AfroTarn.</p>
          <table style="width:100%;border-collapse:collapse">${itemRows}</table>
          <p style="font-size:18px"><strong>Total payé : ${euro(order.total_cents)}</strong></p>
          <p>Nous vous enverrons un nouvel e-mail dès qu’Estelle aura terminé la préparation. Merci d’attendre ce message avant de vous déplacer.</p>
          <p><strong>Retrait :</strong><br>${SHOP_ADDRESS}</p>
        </div>`,
    }
  }

  if (template === 'order_ready') {
    return {
      subject: `Votre commande ${order.order_number} est prête 🎉`,
      html: `
        <div style="font-family:Arial,sans-serif;color:#173c2d;max-width:620px;margin:auto">
          <h1 style="font-family:Georgia,serif">Votre commande est prête.</h1>
          <p>Bonne nouvelle : Estelle a terminé la préparation de votre commande <strong>${order.order_number}</strong>.</p>
          <p>Vous pouvez maintenant venir la récupérer à la boutique.</p>
          <div style="padding:18px;border-radius:14px;background:#f4eee5;margin:24px 0">
            <strong>Numéro de commande</strong><br>
            <span style="font-size:28px">${order.order_number}</span>
          </div>
          <p><strong>Adresse de retrait :</strong><br>${SHOP_ADDRESS}</p>
          <p>Présentez simplement votre numéro de commande lors du retrait.</p>
        </div>`,
    }
  }

  if (template === 'order_cancelled') {
    return {
      subject: `Commande ${order.order_number} annulée`,
      html: `<p>Votre commande <strong>${order.order_number}</strong> a été annulée. Pour toute question, contactez AfroTarn.</p>`,
    }
  }

  return {
    subject: `Remboursement — commande ${order.order_number}`,
    html: `<p>Le remboursement de votre commande <strong>${order.order_number}</strong> a été enregistré.</p>`,
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  if (!RESEND_API_KEY) {
    return Response.json({ error: 'RESEND_API_KEY is not configured' }, { status: 503 })
  }

  const body = await req.json() as RequestBody

  let outbox: any = null
  if (body.outbox_id) {
    const { data, error } = await supabase.from('email_outbox').select('*').eq('id', body.outbox_id).single()
    if (error) return Response.json({ error: error.message }, { status: 400 })
    outbox = data
  } else if (body.order_id && body.template) {
    const { data, error } = await supabase.from('email_outbox')
      .insert({ order_id: body.order_id, template: body.template, recipient: '' })
      .select('*').single()
    if (error) return Response.json({ error: error.message }, { status: 400 })
    outbox = data
  } else {
    return Response.json({ error: 'outbox_id or order_id + template required' }, { status: 400 })
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', outbox.order_id)
    .single()
  if (orderError) return Response.json({ error: orderError.message }, { status: 400 })

  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', order.id)
    .order('created_at')
  if (itemsError) return Response.json({ error: itemsError.message }, { status: 400 })

  const recipient = outbox.recipient || order.customer_email
  const rendered = render(outbox.template as EmailTemplate, order, items || [])

  await supabase.from('email_outbox').update({ status: 'sending', attempts: (outbox.attempts || 0) + 1 }).eq('id', outbox.id)

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
    await supabase.from('email_outbox').update({ status: 'failed', last_error: errorText }).eq('id', outbox.id)
    return Response.json({ error: errorText }, { status: 502 })
  }

  const result = await response.json()
  await supabase.from('email_outbox').update({ status: 'sent', sent_at: new Date().toISOString(), last_error: null }).eq('id', outbox.id)

  return Response.json({ ok: true, email: result, order_number: order.order_number })
})
