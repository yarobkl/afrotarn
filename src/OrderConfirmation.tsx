import { useEffect, useRef, useState } from 'react'
import { BadgeCheck, Clock3, Mail, MapPin, ShoppingBag } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { SUPABASE_URL, supabaseHeaders } from './supabase'
import './order-confirmation.css'

type OrderState = 'processing' | 'pending_payment' | 'paid' | 'preparing' | 'ready' | 'collected' | 'cancelled' | 'refunded'

type StatusPayload = {
  order_number?: string
  status?: OrderState
  total_cents?: number
  currency?: string
  paid_at?: string | null
  ready_at?: string | null
  error?: string
}

function money(cents?: number) {
  if (typeof cents !== 'number') return ''
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

export default function OrderConfirmation({ onConfirmed }: { onConfirmed?: () => void }) {
  const location = useLocation()
  const sessionId = new URLSearchParams(location.search).get('session_id') || ''
  const [data, setData] = useState<StatusPayload>({ status: 'processing' })
  const [error, setError] = useState('')
  const [timedOut, setTimedOut] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  const cleared = useRef(false)

  useEffect(() => {
    setError('')
    setTimedOut(false)
    setData({ status: 'processing' })

    if (!sessionId) {
      setError('Aucune session de paiement n’a été trouvée.')
      return
    }

    let cancelled = false
    let attempts = 0
    let timer: number | undefined

    const check = async () => {
      attempts += 1
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/checkout-status`, {
          method: 'POST',
          headers: supabaseHeaders(),
          body: JSON.stringify({ session_id: sessionId }),
        })
        const payload = await response.json() as StatusPayload
        if (cancelled) return

        if (!response.ok && response.status !== 202) {
          throw new Error(payload.error || 'Impossible de vérifier la commande.')
        }

        setData(payload)
        const confirmed = ['paid', 'preparing', 'ready', 'collected'].includes(payload.status || '')
        if (confirmed && !cleared.current) {
          cleared.current = true
          try { window.localStorage.removeItem('afrotarn-list') } catch { /* noop */ }
          onConfirmed?.()
        }

        const terminal = confirmed || payload.status === 'cancelled' || payload.status === 'refunded'
        if (!terminal && attempts < 10) {
          timer = window.setTimeout(check, 1800)
        } else if (!terminal && attempts >= 10) {
          setTimedOut(true)
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Impossible de vérifier la commande.')
      }
    }

    void check()
    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [sessionId, onConfirmed, retryKey])

  const status = data.status || 'processing'
  const confirmed = ['paid', 'preparing', 'ready', 'collected'].includes(status)
  const ready = status === 'ready' || status === 'collected'

  return (
    <section className="order-confirmation section">
      <div className="order-confirmation-card">
        <div className={`order-confirmation-icon ${confirmed ? 'is-confirmed' : ''}`}>
          {confirmed ? <BadgeCheck size={34} /> : <Clock3 size={34} />}
        </div>

        {error ? <>
          <span className="kicker">SUIVI DE COMMANDE</span>
          <h1>Nous n’arrivons pas encore à vérifier la commande.</h1>
          <p>{error}</p>
          <div className="order-confirmation-actions"><button className="button button-dark" type="button" onClick={() => setRetryKey(key => key + 1)}>Réessayer</button><Link className="button button-ghost" to="/click-collect">Retour au panier</Link></div>
        </> : timedOut ? <>
          <span className="kicker">CONFIRMATION EN COURS</span>
          <h1>La confirmation prend un peu plus de temps.</h1>
          <p>Votre paiement n’est pas déclaré échoué. Nous attendons simplement la confirmation serveur. Vous pouvez relancer la vérification sans repayer.</p>
          <div className="order-confirmation-actions"><button className="button button-dark" type="button" onClick={() => setRetryKey(key => key + 1)}>Vérifier à nouveau</button><Link className="button button-ghost" to="/">Retour à l’accueil</Link></div>
        </> : ready ? <>
          <span className="kicker">COMMANDE PRÊTE</span>
          <h1>Votre commande vous attend.</h1>
          <p>La préparation est terminée. Présentez votre numéro de commande à la boutique pour le retrait.</p>
        </> : confirmed ? <>
          <span className="kicker">PAIEMENT CONFIRMÉ</span>
          <h1>Merci, votre commande est prise en charge.</h1>
          <p>Le paiement est enregistré. AfroTarn prépare maintenant votre commande et vous recevrez un nouvel e-mail lorsqu’elle sera prête.</p>
        </> : <>
          <span className="kicker">VÉRIFICATION DU PAIEMENT</span>
          <h1>Quelques secondes…</h1>
          <p>Stripe nous renvoie la confirmation du paiement. Ne fermez pas cette page pour le moment.</p>
        </>}

        {data.order_number && <div className="order-number-block"><span>Numéro de commande</span><strong>{data.order_number}</strong>{typeof data.total_cents === 'number' && <small>{money(data.total_cents)}</small>}</div>}

        {confirmed && <div className="order-confirmation-timeline">
          <div className="is-done"><BadgeCheck size={18} /><span><strong>Paiement validé</strong><small>Commande enregistrée</small></span></div>
          <div className={['preparing','ready','collected'].includes(status) ? 'is-done' : 'is-current'}><ShoppingBag size={18} /><span><strong>Préparation</strong><small>Estelle prépare vos articles</small></span></div>
          <div className={ready ? 'is-done' : ''}><Mail size={18} /><span><strong>Commande prête</strong><small>Un e-mail vous prévient</small></span></div>
          <div className={status === 'collected' ? 'is-done' : ''}><MapPin size={18} /><span><strong>Retrait</strong><small>70 rue du Château du Roi, Gaillac</small></span></div>
        </div>}

        {confirmed && <div className="order-confirmation-actions"><Link className="button button-dark" to="/">Retour à l’accueil</Link><a className="button button-ghost" href="https://www.google.com/maps/search/?api=1&query=70+rue+du+Chateau+du+Roi+81600+Gaillac">Voir l’itinéraire</a></div>}
      </div>
    </section>
  )
}
