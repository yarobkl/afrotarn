import { useEffect, useMemo, useState } from 'react'
import {
  BadgeCheck,
  Boxes,
  CircleAlert,
  Clock3,
  LogOut,
  Minus,
  Package,
  PackageCheck,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShoppingBag,
  Store,
} from 'lucide-react'
import './admin-orders.css'
import './admin-access.css'
import './admin-stock.css'

type OrderStatus = 'pending_payment' | 'paid' | 'preparing' | 'ready' | 'collected' | 'cancelled' | 'refunded'
type AdminSection = 'orders' | 'stock'
type StockMode = 'tracked' | 'store_only' | 'arrival'

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

type AdminProduct = {
  id: string
  name: string
  category: string
  description: string | null
  price_cents: number | null
  currency: string
  active: boolean
  orderable: boolean
  stock_mode: StockMode
  stock_quantity: number | null
  safety_stock: number
  image_url: string | null
  updated_at: string
}

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || 'https://whgnczmorqmhwdvmgtwt.supabase.co'
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoZ25jem1vcnFtaHdkdm1ndHd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5OTE3MTYsImV4cCI6MjEwMjU2NzcxNn0.GenTCUGdLzxiyW9TtI8740WsmIg9_TUy1x0j6itPAdI'
const ADMIN_EMAIL = 'eliebakala@gmail.com'
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
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${token || SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  }
}

function stockState(product: AdminProduct) {
  if (product.stock_mode !== 'tracked') return { key: product.stock_mode, label: product.stock_mode === 'arrival' ? 'Selon arrivage' : 'Magasin uniquement' }
  const qty = product.stock_quantity ?? 0
  if (qty <= 0) return { key: 'out', label: 'Rupture' }
  if (qty <= product.safety_stock) return { key: 'low', label: 'Stock bas' }
  return { key: 'ok', label: 'En stock' }
}

export default function AdminDashboard() {
  const [token, setToken] = useState(() => sessionStorage.getItem('afrotarn-admin-token') || '')
  const [accessMode, setAccessMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState(ADMIN_EMAIL)
  const [password, setPassword] = useState('')
  const [section, setSection] = useState<AdminSection>('orders')
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [productQuery, setProductQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('Tous')
  const [loading, setLoading] = useState(false)
  const [savingProduct, setSavingProduct] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const selected = useMemo(() => orders.find(order => order.id === selectedId) || orders[0] || null, [orders, selectedId])
  const selectedProduct = useMemo(() => products.find(product => product.id === selectedProductId) || products[0] || null, [products, selectedProductId])
  const activeCount = orders.filter(order => ['paid', 'preparing'].includes(order.status)).length
  const readyCount = orders.filter(order => order.status === 'ready').length
  const trackedProducts = products.filter(product => product.stock_mode === 'tracked')
  const lowStockCount = trackedProducts.filter(product => (product.stock_quantity ?? 0) > 0 && (product.stock_quantity ?? 0) <= product.safety_stock).length
  const outOfStockCount = trackedProducts.filter(product => (product.stock_quantity ?? 0) <= 0).length
  const categories = useMemo(() => ['Tous', ...Array.from(new Set(products.map(product => product.category))).sort((a, b) => a.localeCompare(b, 'fr'))], [products])
  const filteredProducts = useMemo(() => {
    const query = productQuery.trim().toLocaleLowerCase('fr')
    return products.filter(product => {
      const categoryMatches = categoryFilter === 'Tous' || product.category === categoryFilter
      const queryMatches = !query || `${product.name} ${product.category}`.toLocaleLowerCase('fr').includes(query)
      return categoryMatches && queryMatches
    })
  }, [products, productQuery, categoryFilter])

  function expireSession() {
    sessionStorage.removeItem('afrotarn-admin-token')
    setToken('')
  }

  async function login(event: React.FormEvent) {
    event.preventDefault()
    if (!configured) return
    setLoading(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
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

  async function signup(event: React.FormEvent) {
    event.preventDefault()
    if (!configured) return
    setLoading(true)
    setError('')
    setNotice('')
    try {
      if (email.trim().toLowerCase() !== ADMIN_EMAIL) throw new Error(`La création du compte administrateur est réservée à ${ADMIN_EMAIL}.`)
      if (password.length < 10) throw new Error('Choisissez un mot de passe d’au moins 10 caractères.')

      const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({
          email: ADMIN_EMAIL,
          password,
          data: { full_name: 'Administrateur AfroTarn', source: 'afrotarn-admin' },
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.msg || data?.error_description || 'Création du compte impossible')

      setPassword('')
      setAccessMode('login')
      setNotice('Compte créé. Vérifiez votre e-mail si Supabase demande une confirmation. Les droits administrateur doivent ensuite être validés une seule fois.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Création du compte impossible')
    } finally {
      setLoading(false)
    }
  }

  async function loadOrders(currentToken = token) {
    if (!configured || !currentToken) return
    const query = encodeURIComponent('*,order_items(*)')
    const response = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=${query}&order=created_at.desc&limit=100`, {
      headers: { ...apiHeaders(currentToken), Prefer: 'count=exact' },
    })
    if (response.status === 401) {
      expireSession()
      throw new Error('Votre session a expiré.')
    }
    const data = await response.json()
    if (!response.ok) throw new Error(data?.message || 'Impossible de charger les commandes')
    setOrders(data)
    setSelectedId(current => current && data.some((order: Order) => order.id === current) ? current : data[0]?.id || null)
  }

  async function loadProducts(currentToken = token) {
    if (!configured || !currentToken) return
    const select = encodeURIComponent('id,name,category,description,price_cents,currency,active,orderable,stock_mode,stock_quantity,safety_stock,image_url,updated_at')
    const response = await fetch(`${SUPABASE_URL}/rest/v1/products?select=${select}&order=category.asc,name.asc`, {
      headers: apiHeaders(currentToken),
    })
    if (response.status === 401) {
      expireSession()
      throw new Error('Votre session a expiré.')
    }
    const data = await response.json()
    if (!response.ok) throw new Error(data?.message || 'Impossible de charger le stock')
    setProducts(data)
    setSelectedProductId(current => current && data.some((product: AdminProduct) => product.id === current) ? current : data[0]?.id || null)
  }

  async function refreshAll(currentToken = token) {
    if (!currentToken) return
    setLoading(true)
    setError('')
    try {
      await Promise.all([loadOrders(currentToken), loadProducts(currentToken)])
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
    } finally {
      setLoading(false)
    }
  }

  function patchLocalProduct(id: string, patch: Partial<AdminProduct>) {
    setProducts(current => current.map(product => product.id === id ? { ...product, ...patch } : product))
  }

  function changeQuantity(delta: number) {
    if (!selectedProduct) return
    const current = selectedProduct.stock_quantity ?? 0
    patchLocalProduct(selectedProduct.id, { stock_mode: 'tracked', stock_quantity: Math.max(0, current + delta) })
  }

  async function saveProduct() {
    if (!selectedProduct || !token) return
    setSavingProduct(true)
    setError('')
    setNotice('')
    try {
      const safeQuantity = selectedProduct.stock_mode === 'tracked' ? Math.max(0, selectedProduct.stock_quantity ?? 0) : null
      const safeSafetyStock = Math.max(0, selectedProduct.safety_stock || 0)
      const canOrder = selectedProduct.orderable && selectedProduct.active && selectedProduct.price_cents !== null && selectedProduct.stock_mode === 'tracked'
      const patch = {
        price_cents: selectedProduct.price_cents,
        active: selectedProduct.active,
        orderable: canOrder,
        stock_mode: selectedProduct.stock_mode,
        stock_quantity: safeQuantity,
        safety_stock: safeSafetyStock,
        updated_at: new Date().toISOString(),
      }
      const response = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${encodeURIComponent(selectedProduct.id)}`, {
        method: 'PATCH',
        headers: { ...apiHeaders(token), Prefer: 'return=representation' },
        body: JSON.stringify(patch),
      })
      if (response.status === 401) {
        expireSession()
        throw new Error('Votre session a expiré.')
      }
      const data = await response.json()
      if (!response.ok) throw new Error(data?.message || 'Impossible d’enregistrer le stock')
      const saved = data[0] as AdminProduct | undefined
      if (saved) patchLocalProduct(saved.id, saved)
      setNotice(`${selectedProduct.name} a bien été mis à jour.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible d’enregistrer le stock')
    } finally {
      setSavingProduct(false)
    }
  }

  useEffect(() => {
    if (token) void refreshAll(token)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  if (!configured) {
    return (
      <main className="admin-shell admin-setup">
        <div className="admin-setup-card">
          <span className="admin-brand"><Store size={24} /> AFROTARN</span>
          <h1>Espace admin prêt à être connecté.</h1>
          <p>Le tableau commandes et stock est installé. Il sera activé dès que la base Supabase AfroTarn est reliée au site.</p>
          <a href="/">Retour au site</a>
        </div>
      </main>
    )
  }

  if (!token) {
    return (
      <main className="admin-shell admin-login">
        <form className="admin-login-card" onSubmit={accessMode === 'login' ? login : signup}>
          <span className="admin-brand"><Store size={24} /> AFROTARN</span>
          <small>ESPACE ADMIN · COMMANDES & STOCK</small>
          <h1>{accessMode === 'login' ? 'Connexion' : 'Créer mon accès'}</h1>
          <p>{accessMode === 'login' ? 'Accès réservé à l’administration, aux commandes et au stock AfroTarn.' : `Première mise en service de l’espace admin avec ${ADMIN_EMAIL}.`}</p>
          <label>Adresse e-mail<input type="email" value={email} onChange={event => setEmail(event.target.value)} required autoComplete="email" placeholder={ADMIN_EMAIL} /></label>
          <label>Mot de passe<input type="password" value={password} onChange={event => setPassword(event.target.value)} required minLength={accessMode === 'signup' ? 10 : undefined} autoComplete={accessMode === 'signup' ? 'new-password' : 'current-password'} /></label>
          {notice && <div className="admin-notice">{notice}</div>}
          {error && <div className="admin-error">{error}</div>}
          <button disabled={loading}>{loading ? 'Patientez…' : accessMode === 'login' ? 'Se connecter' : 'Créer l’accès admin'}</button>
          <button className="admin-access-switch" type="button" onClick={() => { setAccessMode(mode => mode === 'login' ? 'signup' : 'login'); setError(''); setNotice(''); setPassword(''); setEmail(ADMIN_EMAIL) }}>
            {accessMode === 'login' ? 'Première connexion ? Créer l’accès' : 'J’ai déjà un accès'}
          </button>
          <a href="/">Retour à la boutique</a>
        </form>
      </main>
    )
  }

  return (
    <main className="admin-shell admin-dashboard">
      <header className="admin-header">
        <div><span className="admin-brand"><Store size={22} /> AFROTARN</span><small>ESPACE ADMIN</small></div>
        <div className="admin-header-actions">
          <button onClick={() => refreshAll()} disabled={loading || savingProduct}><RefreshCw size={17} /> Actualiser</button>
          <button onClick={expireSession}><LogOut size={17} /> Quitter</button>
        </div>
      </header>

      <nav className="admin-section-tabs" aria-label="Sections de l’administration">
        <button className={section === 'orders' ? 'is-active' : ''} onClick={() => setSection('orders')}><ShoppingBag size={18} /> Commandes {activeCount > 0 && <span>{activeCount}</span>}</button>
        <button className={section === 'stock' ? 'is-active' : ''} onClick={() => setSection('stock')}><Boxes size={18} /> Stock & produits {(lowStockCount + outOfStockCount) > 0 && <span>{lowStockCount + outOfStockCount}</span>}</button>
      </nav>

      {section === 'orders' ? (
        <>
          <section className="admin-stats">
            <div><ShoppingBag /><span>À préparer</span><strong>{activeCount}</strong></div>
            <div><PackageCheck /><span>Prêtes</span><strong>{readyCount}</strong></div>
            <div><BadgeCheck /><span>Commandes aujourd’hui</span><strong>{orders.filter(order => new Date(order.created_at).toDateString() === new Date().toDateString()).length}</strong></div>
          </section>

          {error && <div className="admin-error admin-error-wide">{error}</div>}
          {notice && <div className="admin-notice admin-notice-wide">{notice}</div>}

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
        </>
      ) : (
        <>
          <section className="admin-stats admin-stock-stats">
            <div><Package /><span>Produits</span><strong>{products.length}</strong></div>
            <div><CircleAlert /><span>Stock bas</span><strong>{lowStockCount}</strong></div>
            <div><Boxes /><span>Ruptures</span><strong>{outOfStockCount}</strong></div>
          </section>

          {error && <div className="admin-error admin-error-wide">{error}</div>}
          {notice && <div className="admin-notice admin-notice-wide">{notice}</div>}

          <section className="admin-stock-tools">
            <label className="admin-stock-search"><Search size={18} /><input value={productQuery} onChange={event => setProductQuery(event.target.value)} placeholder="Rechercher un produit…" /></label>
            <select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)} aria-label="Filtrer par catégorie">
              {categories.map(category => <option key={category}>{category}</option>)}
            </select>
          </section>

          <section className="admin-stock-workspace">
            <div className="admin-stock-list">
              <div className="admin-list-title"><div><small>CATALOGUE & STOCK</small><h1>Produits</h1></div><span>{filteredProducts.length}</span></div>
              {filteredProducts.length === 0 && <div className="admin-empty">Aucun produit ne correspond à la recherche.</div>}
              {filteredProducts.map(product => {
                const state = stockState(product)
                return (
                  <button key={product.id} className={`admin-product-row ${selectedProduct?.id === product.id ? 'is-active' : ''}`} onClick={() => { setSelectedProductId(product.id); setNotice('') }}>
                    <div><strong>{product.name}</strong><span>{product.category}</span></div>
                    <div><span className={`admin-stock-pill stock-${state.key}`}>{state.label}</span>{product.stock_mode === 'tracked' && <b>{product.stock_quantity ?? 0}</b>}</div>
                  </button>
                )
              })}
            </div>

            <div className="admin-stock-detail">
              {!selectedProduct ? <div className="admin-empty">Sélectionnez un produit.</div> : <>
                <div className="admin-stock-detail-head">
                  <div><small>GESTION DU PRODUIT</small><h2>{selectedProduct.name}</h2><span>{selectedProduct.category}</span></div>
                  <span className={`admin-stock-pill stock-${stockState(selectedProduct).key}`}>{stockState(selectedProduct).label}</span>
                </div>

                <div className="admin-stock-form">
                  <div className="admin-stock-field admin-stock-mode-field">
                    <label>Mode de stock</label>
                    <div className="admin-segmented">
                      <button className={selectedProduct.stock_mode === 'tracked' ? 'is-active' : ''} onClick={() => patchLocalProduct(selectedProduct.id, { stock_mode: 'tracked', stock_quantity: selectedProduct.stock_quantity ?? 0 })}>Quantifié</button>
                      <button className={selectedProduct.stock_mode === 'arrival' ? 'is-active' : ''} onClick={() => patchLocalProduct(selectedProduct.id, { stock_mode: 'arrival', stock_quantity: null, orderable: false })}>Arrivage</button>
                      <button className={selectedProduct.stock_mode === 'store_only' ? 'is-active' : ''} onClick={() => patchLocalProduct(selectedProduct.id, { stock_mode: 'store_only', stock_quantity: null, orderable: false })}>Magasin</button>
                    </div>
                  </div>

                  {selectedProduct.stock_mode === 'tracked' && <>
                    <div className="admin-stock-field">
                      <label>Quantité disponible</label>
                      <div className="admin-quantity-editor">
                        <button onClick={() => changeQuantity(-1)} aria-label="Retirer une unité"><Minus size={20} /></button>
                        <input type="number" inputMode="numeric" min="0" value={selectedProduct.stock_quantity ?? 0} onChange={event => patchLocalProduct(selectedProduct.id, { stock_quantity: Math.max(0, Number(event.target.value) || 0) })} />
                        <button onClick={() => changeQuantity(1)} aria-label="Ajouter une unité"><Plus size={20} /></button>
                      </div>
                    </div>

                    <div className="admin-stock-field">
                      <label>Seuil d’alerte stock bas</label>
                      <input type="number" inputMode="numeric" min="0" value={selectedProduct.safety_stock} onChange={event => patchLocalProduct(selectedProduct.id, { safety_stock: Math.max(0, Number(event.target.value) || 0) })} />
                      <small>Une alerte apparaît quand la quantité atteint ce seuil.</small>
                    </div>
                  </>}

                  <div className="admin-stock-field">
                    <label>Prix TTC</label>
                    <div className="admin-price-input"><input type="number" inputMode="decimal" min="0" step="0.01" value={selectedProduct.price_cents === null ? '' : (selectedProduct.price_cents / 100).toFixed(2)} placeholder="Non renseigné" onChange={event => { const value = event.target.value; patchLocalProduct(selectedProduct.id, { price_cents: value === '' ? null : Math.max(0, Math.round(Number(value.replace(',', '.')) * 100)) }) }} /><span>€</span></div>
                    <small>Le produit ne peut pas être payé en ligne tant qu’aucun prix n’est renseigné.</small>
                  </div>

                  <div className="admin-stock-switches">
                    <label><span><strong>Visible sur le site</strong><small>Masquer temporairement le produit sans le supprimer.</small></span><input type="checkbox" checked={selectedProduct.active} onChange={event => patchLocalProduct(selectedProduct.id, { active: event.target.checked, orderable: event.target.checked ? selectedProduct.orderable : false })} /></label>
                    <label className={selectedProduct.price_cents === null || selectedProduct.stock_mode !== 'tracked' ? 'is-disabled' : ''}><span><strong>Click & Collect</strong><small>Autoriser la réservation et le paiement de ce produit.</small></span><input type="checkbox" checked={selectedProduct.orderable} disabled={selectedProduct.price_cents === null || selectedProduct.stock_mode !== 'tracked' || !selectedProduct.active} onChange={event => patchLocalProduct(selectedProduct.id, { orderable: event.target.checked })} /></label>
                  </div>
                </div>

                <div className="admin-stock-savebar">
                  <div><small>Dernière mise à jour</small><strong>{dateTime(selectedProduct.updated_at)}</strong></div>
                  <button onClick={saveProduct} disabled={savingProduct}><Save size={18} /> {savingProduct ? 'Enregistrement…' : 'Enregistrer'}</button>
                </div>
              </>}
            </div>
          </section>
        </>
      )}
    </main>
  )
}
