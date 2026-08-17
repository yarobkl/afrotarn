import { useEffect, useMemo, useState } from 'react'
import { BadgeCheck, Clock3, LogOut, PackageCheck, RefreshCw, ShoppingBag, Store } from 'lucide-react'
import './admin-orders.css'

type OrderStatus = 'pending_payment' | 'paid' | 'preparing' | 'ready' | 'collected' | 'cancelled' | 'refunded'

type OrderItem = {
  id: string
  product_name: string
  quantity: number
  unit_price_cents: number
  line_total_cents: number
}

type Order = {
  id: string
  order_number: string
  status: OrderStatus
  customer_email: string
  customer_name: string | null
  customer_phone: string | null
  total_cents: number
  payment_method: string | null
  paid_at: string | null
  created_at: string
  order_items: OrderItem[]
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const configured = Boolean(SUPABASE_URL && SUPABASE_KEY)

function money(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

function dateTime(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

const statusLabel: Record<OrderStatus, string> = {
  pending_payment: 'Paiement en attente',
  paid: 'Payée',
  preparing: 'En préparation',
  ready: 'Prête au retrait',
  collected: 'Retirée',
  cancelled: 'Annulée',
  refunded: 'Remboursée',
}

function apiHeaders(token?: string) {
  return {
    apikey: SUPABASE_KEY || '',
    Authorization: `Bearer ${token || SUPABASE_KEY || ''}`,
    'Content-Type': 'application/json',
  }
}

export default function AdminApp() {
  const [token, setToken] = useState(() => sessionStorage.getItem('afrotarn-admin-token') || '')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selected = useMemo(() => orders.find(order => order.id === selectedId) || orders[0] || null, [orders, selectedId])
  const activeCount = orders.filter(order => ['paid', 'preparing'].includes(order.status)).length
  const readyCount = orders.filter(order => order.status === 'ready').length

  async function login(event: React.FormEvent) {
    event.preventDefault()
    if (!configured) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.msg || data?.error_description || 'Connexion impossible')
      sessionStorage.setItem('afrotarn-admin-token', data.access_token)
      setToken(data.access_token)
      setPassword('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Connexion impossible')
    } finally {
      setLoading(false)
    }
  }

  async function loadOrders(currentToken = token) {
    if (!configured || !currentToken) return
    setLoading(true)
    setError('')
    try {
      const query = encodeURIComponent('*,order_items(*)')
      const response = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=${query}&order=created_at.desc&limit=100`, {
        headers: { ...apiHeaders(currentToken), Prefer: 'count=exact' },
      })
      if (response.status === 401) {
        sessionStorage.removeItem('afrotarn-admin-token')
        setToken('')
        throw new Error('Votre session a expiré.')
      }
      const data = await response.json()
      if (!response.ok) throw new Error(data?.message || 'Impossible de charger les commandes')
      setOrders(data)
      setSelectedId(current => current || data[0]?.id || null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  async function changeStatus(orderId: string, status: 'preparing' | 'ready' | 'collected' | 'cancelled') {
    if (!configured || !token) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-order-action`, {
        method: 'POST',
        headers: apiHeaders(token),
        body: JSON.stringify({ order_id: orderId, status }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Action impossible')
      await loadOrders(token)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Action impossible')
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) void loadOrders(token)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  if (!configured) {
    return (
      <main className="admin-shell admin-setup">
        <div className="admin-setup-card">
          <span className="admin-brand"><Store size={24} /> AFROTARN</span>
          <h1>Espace commandes prêt à être connecté.</h1>
          <p>Le tableau de préparation est installé. Il sera activé dès que la base Supabase AfroTarn et ses clés publiques seront reliées au site.</p>
          <a href="/">Retour au site</a>
        </div>
      </main>
    )
  }

  if (!token) {
    return (
      <main className="admin-shell admin-login">
        <form className="admin-login-card" onSubmit={login}>
          <span className="admin-brand"><Store size={24} /> AFROTARN</span>
          <small>ESPACE ESTELLE · COMMANDES</small>
          <h1>Connexion</h1>
          <p>Accès réservé à la préparation et au suivi des commandes AfroTarn.</p>
          <label>Adresse e-mail<input type="email" value={email} onChange={event => setEmail(event.target.value)} required autoComplete="email" /></label>
          <label>Mot de passe<input type="password" value={password} onChange={event => setPassword(event.target.value)} required autoComplete="current-password" /></label>
          {error && <div className="admin-error">{error}</div>}
          <button disabled={loading}>{loading ? 'Connexion…' : 'Se connecter'}</button>
          <a href="/">Retour à la boutique</a>
        </form>
      </main>
    )
  }

  return (
    <main className="admin-shell admin-dashboard">
      <header className="admin-header">
        <div><span className="admin-brand"><Store size={22} /> AFROTARN</span><small>COMMANDES · ESTELLE</small></div>
        <div className="admin-header-actions"><button onClick={() => loadOrders()} disabled={loading}><RefreshCw size={17} /> Actualiser</button><button onClick={() => { sessionStorage.removeItem('afrotarn-admin-token'); setToken('') }}><LogOut size={17} /> Quitter</button></div>
      </header>

      <section className="admin-stats">
        <div><ShoppingBag /><span>À préparer</span><strong>{activeCount}</strong></div>
        <div><PackageCheck /><span>Prêtes</span><strong>{readyCount}</strong></div>
        <div><BadgeCheck /><span>Commandes aujourd’hui</span><strong>{orders.filter(order => new Date(order.created_at).toDateString() === new Date().toDateString()).length}</strong></div>
      </section>

      {error && <div className="admin-error admin-error-wide">{error}</div>}

      <section className="admin-workspace">
        <div className="admin-orders-list">
          <div className="admin-list-title"><div><small>FILE DE PRÉPARATION</small><h1>Commandes</h1></div><span>{orders.length}</span></div>
          {orders.length === 0 && <div className="admin-empty">Aucune commande pour le moment.</div>}
          {orders.map(order => (
            <button key={order.id} className={`admin-order-row ${selected?.id === order.id ? 'is-active' : ''}`} onClick={() => setSelectedId(order.id)}>
              <div><strong>{order.order_number}</strong><span>{order.customer_name || order.customer_email}</span></div>
              <div><span className={`admin-status status-${order.status}`}>{statusLabel[order.status]}</span><b>{money(order.total_cents)}</b></div>
            </button>
          ))}
        </div>

        <div className="admin-order-detail">
          {!selected ? <div className="admin-empty">Sélectionnez une commande.</div> : <>
            <div className="admin-detail-head"><div><small>COMMANDE</small><h2>{selected.order_number}</h2><span className={`admin-status status-${selected.status}`}>{statusLabel[selected.status]}</span></div><strong>{money(selected.total_cents)}</strong></div>

            <div className="admin-customer"><div><small>CLIENT</small><strong>{selected.customer_name || 'Client AfroTarn'}</strong><span>{selected.customer_email}</span>{selected.customer_phone && <span>{selected.customer_phone}</span>}</div><div><small>PAYÉE LE</small><strong>{dateTime(selected.paid_at || selected.created_at)}</strong><span>{selected.payment_method || 'Paiement en ligne'}</span></div></div>

            <div className="admin-items"><small>ARTICLES À PRÉPARER</small>{selected.order_items?.map(item => <div key={item.id}><span className="admin-qty">{item.quantity}×</span><strong>{item.product_name}</strong><span>{money(item.line_total_cents)}</span></div>)}</div>

            <div className="admin-next-action">
              {selected.status === 'paid' && <button className="admin-primary" onClick={() => changeStatus(selected.id, 'preparing')} disabled={loading}><Clock3 /> Commencer la préparation</button>}
              {selected.status === 'preparing' && <button className="admin-primary admin-ready" onClick={() => changeStatus(selected.id, 'ready')} disabled={loading}><PackageCheck /> Commande prête</button>}
              {selected.status === 'ready' && <button className="admin-primary" onClick={() => changeStatus(selected.id, 'collected')} disabled={loading}><BadgeCheck /> Commande retirée</button>}
              {selected.status === 'collected' && <div className="admin-complete"><BadgeCheck /> Commande terminée</div>}
              {['cancelled','refunded'].includes(selected.status) && <div className="admin-complete">Aucune action requise</div>}
              <p>{selected.status === 'preparing' ? 'En validant « Commande prête », le client recevra automatiquement son e-mail avec le numéro de commande et les informations de retrait.' : selected.status === 'paid' ? 'Le paiement est confirmé. Commencez la préparation lorsque vous prenez la commande en charge.' : selected.status === 'ready' ? 'Le client a été informé. Marquez la commande comme retirée lorsqu’il vient la récupérer.' : ''}</p>
            </div>
          </>}
        </div>
      </section>
    </main>
  )
}
