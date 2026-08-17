import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import {
  BadgeCheck,
  Boxes,
  CircleAlert,
  Clock3,
  ImagePlus,
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
  X,
} from 'lucide-react'
import './admin-orders.css'
import './admin-access.css'
import './admin-v2.css'
import './admin-quick-actions.css'

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
const FALLBACK_PRODUCT_IMAGE = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="700"><rect width="900" height="700" fill="#153e2f"/><text x="450" y="350" fill="#f5f0e8" text-anchor="middle" font-family="Georgia" font-size="64">AFROTARN</text></svg>')}`

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

function money(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

function dateTime(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

function stockState(product: AdminProduct) {
  if (product.stock_mode !== 'tracked') {
    return { key: product.stock_mode, label: product.stock_mode === 'arrival' ? 'Selon arrivage' : 'Magasin uniquement' }
  }
  const quantity = product.stock_quantity ?? 0
  if (quantity <= 0) return { key: 'out', label: 'Rupture' }
  if (quantity <= product.safety_stock) return { key: 'low', label: 'Stock bas' }
  return { key: 'ok', label: 'En stock' }
}

function emptyProduct(): AdminProduct {
  const now = new Date().toISOString()
  return {
    id: String(Date.now()),
    name: '',
    category: 'Épicerie',
    description: '',
    price_cents: null,
    currency: 'EUR',
    active: true,
    orderable: false,
    stock_mode: 'tracked',
    stock_quantity: 0,
    safety_stock: 2,
    image_url: null,
    updated_at: now,
  }
}

export default function AdminDashboardV2() {
  const [token, setToken] = useState(() => sessionStorage.getItem('afrotarn-admin-token') || '')
  const [accessMode, setAccessMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState(ADMIN_EMAIL)
  const [password, setPassword] = useState('')
  const [section, setSection] = useState<AdminSection>('orders')
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [draft, setDraft] = useState<AdminProduct | null>(null)
  const [creating, setCreating] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [productQuery, setProductQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('Tous')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const selectedOrder = useMemo(() => orders.find(order => order.id === selectedOrderId) || orders[0] || null, [orders, selectedOrderId])
  const activeCount = orders.filter(order => ['paid', 'preparing'].includes(order.status)).length
  const readyCount = orders.filter(order => order.status === 'ready').length
  const trackedProducts = products.filter(product => product.stock_mode === 'tracked')
  const lowStockCount = trackedProducts.filter(product => (product.stock_quantity ?? 0) > 0 && (product.stock_quantity ?? 0) <= product.safety_stock).length
  const outOfStockCount = trackedProducts.filter(product => (product.stock_quantity ?? 0) <= 0).length
  const categories = useMemo(() => ['Tous', ...Array.from(new Set(products.map(product => product.category).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'fr'))], [products])
  const categorySuggestions = useMemo(() => Array.from(new Set(['Épicerie', 'Fruits & légumes', 'Surgelés', 'Poissons', 'Boissons', 'Cosmétiques', 'Épices & sauces', ...products.map(product => product.category)])).filter(Boolean).sort((a, b) => a.localeCompare(b, 'fr')), [products])
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
    setOrders([])
    setProducts([])
    setDraft(null)
  }

  function resetMessages() {
    setError('')
    setNotice('')
  }

  async function login(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    resetMessages()
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

  async function signup(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    resetMessages()
    try {
      if (email.trim().toLowerCase() !== ADMIN_EMAIL) throw new Error(`La création du compte administrateur est réservée à ${ADMIN_EMAIL}.`)
      if (password.length < 10) throw new Error('Choisissez un mot de passe d’au moins 10 caractères.')
      const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ email: ADMIN_EMAIL, password, options: { emailRedirectTo: 'https://afrotarn.vercel.app/admin' }, data: { full_name: 'Administrateur AfroTarn', source: 'afrotarn-admin' } }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.msg || data?.error_description || 'Création du compte impossible')
      setPassword('')
      setAccessMode('login')
      setNotice('Compte créé. Vérifiez votre e-mail si une confirmation est demandée.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Création du compte impossible')
    } finally {
      setLoading(false)
    }
  }

  async function loadOrders(currentToken = token) {
    if (!currentToken) return
    const query = encodeURIComponent('*,order_items(*)')
    const response = await fetch(`${SUPABASE_URL}/rest/v1/orders?select=${query}&order=created_at.desc&limit=150`, { headers: apiHeaders(currentToken) })
    if (response.status === 401) {
      expireSession()
      throw new Error('Votre session a expiré.')
    }
    const data = await response.json()
    if (!response.ok) throw new Error(data?.message || 'Impossible de charger les commandes')
    setOrders(data)
    setSelectedOrderId(current => current && data.some((order: Order) => order.id === current) ? current : data[0]?.id || null)
  }

  async function loadProducts(currentToken = token, preserveDraft = false) {
    if (!currentToken) return
    const select = encodeURIComponent('id,name,category,description,price_cents,currency,active,orderable,stock_mode,stock_quantity,safety_stock,image_url,updated_at')
    const response = await fetch(`${SUPABASE_URL}/rest/v1/products?select=${select}&order=category.asc,name.asc`, { headers: apiHeaders(currentToken) })
    if (response.status === 401) {
      expireSession()
      throw new Error('Votre session a expiré.')
    }
    const data = await response.json()
    if (!response.ok) throw new Error(data?.message || 'Impossible de charger les produits')
    const loaded = data as AdminProduct[]
    setProducts(loaded)
    if (!preserveDraft && !creating) {
      const id = selectedProductId && loaded.some(product => product.id === selectedProductId) ? selectedProductId : loaded[0]?.id || null
      setSelectedProductId(id)
      setDraft(id ? { ...loaded.find(product => product.id === id)! } : null)
      setDirty(false)
    }
  }

  async function refreshAll(currentToken = token) {
    if (!currentToken) return
    setLoading(true)
    resetMessages()
    try {
      await Promise.all([loadOrders(currentToken), loadProducts(currentToken)])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  async function changeStatus(orderId: string, status: 'preparing' | 'ready' | 'collected' | 'cancelled') {
    if (!token) return
    setLoading(true)
    resetMessages()
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

  function editDraft(patch: Partial<AdminProduct>) {
    setDraft(current => current ? { ...current, ...patch } : current)
    setDirty(true)
  }

  function chooseProduct(product: AdminProduct) {
    if (dirty && !window.confirm('Abandonner les modifications non enregistrées ?')) return
    setCreating(false)
    setSelectedProductId(product.id)
    setDraft({ ...product })
    setDirty(false)
    resetMessages()
  }

  function showProducts() {
    setSection('stock')
  }

  function startNewProduct() {
    if (dirty && !window.confirm('Abandonner les modifications non enregistrées ?')) return
    const product = emptyProduct()
    setSection('stock')
    setCreating(true)
    setSelectedProductId(null)
    setDraft(product)
    setDirty(true)
    resetMessages()
  }

  function cancelNewProduct() {
    setCreating(false)
    const fallback = products.find(product => product.id === selectedProductId) || products[0] || null
    setSelectedProductId(fallback?.id || null)
    setDraft(fallback ? { ...fallback } : null)
    setDirty(false)
    resetMessages()
  }

  function changeQuantity(delta: number) {
    if (!draft) return
    const current = draft.stock_quantity ?? 0
    editDraft({ stock_mode: 'tracked', stock_quantity: Math.max(0, current + delta) })
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !draft || !token) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Format accepté : JPG, PNG ou WebP.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('La photo doit faire moins de 5 Mo.')
      return
    }
    setUploading(true)
    resetMessages()
    try {
      const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
      const path = `${draft.id}/${Date.now()}.${extension}`
      const response = await fetch(`${SUPABASE_URL}/storage/v1/object/product-images/${path}`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${token}`,
          'Content-Type': file.type,
          'x-upsert': 'true',
        },
        body: file,
      })
      if (response.status === 401) {
        expireSession()
        throw new Error('Votre session a expiré.')
      }
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.message || data?.error || 'Envoi de la photo impossible')
      }
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/product-images/${path}`
      editDraft({ image_url: publicUrl })
      setNotice('Photo chargée. Enregistrez le produit pour valider la modification.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Envoi de la photo impossible')
    } finally {
      setUploading(false)
    }
  }

  async function saveProduct() {
    if (!draft || !token) return
    const name = draft.name.trim()
    const category = draft.category.trim()
    if (!name) {
      setError('Le nom du produit est obligatoire.')
      return
    }
    if (!category) {
      setError('La catégorie est obligatoire.')
      return
    }

    setSaving(true)
    resetMessages()
    try {
      const quantity = draft.stock_mode === 'tracked' ? Math.max(0, Math.floor(draft.stock_quantity ?? 0)) : null
      const safetyStock = Math.max(0, Math.floor(draft.safety_stock || 0))
      const orderable = Boolean(draft.orderable && draft.active && draft.price_cents !== null && draft.stock_mode === 'tracked' && (quantity ?? 0) > 0)
      const payload: AdminProduct = {
        ...draft,
        name,
        category,
        description: draft.description?.trim() || null,
        price_cents: draft.price_cents === null ? null : Math.max(0, Math.floor(draft.price_cents)),
        stock_quantity: quantity,
        safety_stock: safetyStock,
        orderable,
        updated_at: new Date().toISOString(),
      }

      const endpoint = creating
        ? `${SUPABASE_URL}/rest/v1/products`
        : `${SUPABASE_URL}/rest/v1/products?id=eq.${encodeURIComponent(payload.id)}`
      const response = await fetch(endpoint, {
        method: creating ? 'POST' : 'PATCH',
        headers: { ...apiHeaders(token), Prefer: 'return=representation' },
        body: JSON.stringify(payload),
      })
      if (response.status === 401) {
        expireSession()
        throw new Error('Votre session a expiré.')
      }
      const data = await response.json()
      if (!response.ok) throw new Error(data?.message || 'Impossible d’enregistrer le produit')
      const saved = data[0] as AdminProduct | undefined
      if (!saved) throw new Error('Le produit n’a pas été retourné après enregistrement.')

      setCreating(false)
      setSelectedProductId(saved.id)
      setDraft({ ...saved })
      setDirty(false)
      await loadProducts(token, true)
      setNotice(`${saved.name} a bien été ${creating ? 'ajouté' : 'mis à jour'}. Le catalogue public utilisera cette donnée.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible d’enregistrer le produit')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (token) void refreshAll(token)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  if (!token) {
    return (
      <main className="admin-shell admin-login">
        <form className="admin-login-card" onSubmit={accessMode === 'login' ? login : signup}>
          <span className="admin-brand"><Store size={24} /> AFROTARN</span>
          <small>ESPACE ADMIN · COMMANDES & STOCK</small>
          <h1>{accessMode === 'login' ? 'Connexion' : 'Créer mon accès'}</h1>
          <p>{accessMode === 'login' ? 'Accès réservé à la gestion AfroTarn.' : `Création de l’accès avec ${ADMIN_EMAIL}.`}</p>
          <label>Adresse e-mail<input type="email" value={email} onChange={event => setEmail(event.target.value)} required autoComplete="email" /></label>
          <label>Mot de passe<input type="password" value={password} onChange={event => setPassword(event.target.value)} required minLength={accessMode === 'signup' ? 10 : undefined} autoComplete={accessMode === 'signup' ? 'new-password' : 'current-password'} /></label>
          {notice && <div className="admin-notice">{notice}</div>}
          {error && <div className="admin-error">{error}</div>}
          <button disabled={loading}>{loading ? 'Patientez…' : accessMode === 'login' ? 'Se connecter' : 'Créer l’accès admin'}</button>
          <button className="admin-access-switch" type="button" onClick={() => { setAccessMode(mode => mode === 'login' ? 'signup' : 'login'); resetMessages(); setPassword('') }}>
            {accessMode === 'login' ? 'Première connexion ? Créer l’accès' : 'J’ai déjà un accès'}
          </button>
          <a href="/">Retour à la boutique</a>
        </form>
      </main>
    )
  }

  return (
    <main className="admin-shell admin-dashboard admin-v2">
      <header className="admin-header admin-v2-header">
        <div className="admin-v2-container admin-v2-header-inner">
          <div><span className="admin-brand"><Store size={22} /> AFROTARN</span><small>BACK-OFFICE</small></div>
          <div className="admin-header-actions">
            <div className="admin-quick-actions" aria-label="Actions produits rapides">
              <button type="button" className="admin-quick-products" onClick={showProducts}>
                <Boxes size={17} />
                <span className="admin-quick-long">Produits / modifier</span>
                <span className="admin-quick-short">Produits</span>
              </button>
              <button type="button" className="admin-quick-create" onClick={startNewProduct}>
                <Plus size={17} />
                <span className="admin-quick-long">Ajouter un produit</span>
                <span className="admin-quick-short">Ajouter</span>
              </button>
            </div>
            <button onClick={() => refreshAll()} disabled={loading || saving || uploading}><RefreshCw size={17} /> Actualiser</button>
            <button onClick={expireSession}><LogOut size={17} /> Quitter</button>
          </div>
        </div>
      </header>

      <div className="admin-v2-container">
        <nav className="admin-section-tabs admin-v2-tabs" aria-label="Sections de l’administration">
          <button className={section === 'orders' ? 'is-active' : ''} onClick={() => setSection('orders')}><ShoppingBag size={18} /> Commandes {activeCount > 0 && <span>{activeCount}</span>}</button>
          <button className={section === 'stock' ? 'is-active' : ''} onClick={() => setSection('stock')}><Boxes size={18} /> Stock & produits {(lowStockCount + outOfStockCount) > 0 && <span>{lowStockCount + outOfStockCount}</span>}</button>
        </nav>

        {section === 'orders' ? (
          <>
            <section className="admin-stats admin-v2-stats">
              <div><ShoppingBag /><span>À préparer</span><strong>{activeCount}</strong></div>
              <div><PackageCheck /><span>Prêtes</span><strong>{readyCount}</strong></div>
              <div><BadgeCheck /><span>Aujourd’hui</span><strong>{orders.filter(order => new Date(order.created_at).toDateString() === new Date().toDateString()).length}</strong></div>
            </section>
            {error && <div className="admin-error admin-v2-message">{error}</div>}
            {notice && <div className="admin-notice admin-v2-message">{notice}</div>}
            <section className="admin-workspace admin-v2-order-workspace">
              <div className="admin-orders-list admin-v2-list-pane">
                <div className="admin-list-title"><div><small>FILE DE PRÉPARATION</small><h1>Commandes</h1></div><span>{orders.length}</span></div>
                {orders.length === 0 && <div className="admin-empty">Aucune commande pour le moment.</div>}
                {orders.map(order => (
                  <button key={order.id} className={`admin-order-row ${selectedOrder?.id === order.id ? 'is-active' : ''}`} onClick={() => setSelectedOrderId(order.id)}>
                    <div><strong>{order.order_number}</strong><span>{order.customer_name || order.customer_email}</span></div>
                    <div><span className={`admin-status status-${order.status}`}>{statusLabel[order.status]}</span><b>{money(order.total_cents)}</b></div>
                  </button>
                ))}
              </div>
              <div className="admin-order-detail">
                {!selectedOrder ? <div className="admin-empty">Sélectionnez une commande.</div> : <>
                  <div className="admin-detail-head"><div><small>COMMANDE</small><h2>{selectedOrder.order_number}</h2><span className={`admin-status status-${selectedOrder.status}`}>{statusLabel[selectedOrder.status]}</span></div><strong>{money(selectedOrder.total_cents)}</strong></div>
                  <div className="admin-customer"><div><small>CLIENT</small><strong>{selectedOrder.customer_name || 'Client AfroTarn'}</strong><span>{selectedOrder.customer_email}</span>{selectedOrder.customer_phone && <span>{selectedOrder.customer_phone}</span>}</div><div><small>PAYÉE LE</small><strong>{dateTime(selectedOrder.paid_at || selectedOrder.created_at)}</strong><span>{selectedOrder.payment_method || 'Paiement en ligne'}</span></div></div>
                  <div className="admin-items"><small>ARTICLES À PRÉPARER</small>{selectedOrder.order_items?.map(item => <div key={item.id}><span className="admin-qty">{item.quantity}×</span><strong>{item.product_name}</strong><span>{money(item.line_total_cents)}</span></div>)}</div>
                  <div className="admin-next-action">
                    {selectedOrder.status === 'paid' && <button className="admin-primary" onClick={() => changeStatus(selectedOrder.id, 'preparing')} disabled={loading}><Clock3 /> Commencer la préparation</button>}
                    {selectedOrder.status === 'preparing' && <button className="admin-primary admin-ready" onClick={() => changeStatus(selectedOrder.id, 'ready')} disabled={loading}><PackageCheck /> Commande prête</button>}
                    {selectedOrder.status === 'ready' && <button className="admin-primary" onClick={() => changeStatus(selectedOrder.id, 'collected')} disabled={loading}><BadgeCheck /> Commande retirée</button>}
                    {selectedOrder.status === 'collected' && <div className="admin-complete"><BadgeCheck /> Commande terminée</div>}
                  </div>
                </>}
              </div>
            </section>
          </>
        ) : (
          <>
            <section className="admin-stats admin-v2-stats">
              <div><Package /><span>Produits</span><strong>{products.length}</strong></div>
              <div><CircleAlert /><span>Stock bas</span><strong>{lowStockCount}</strong></div>
              <div><Boxes /><span>Ruptures</span><strong>{outOfStockCount}</strong></div>
            </section>

            {error && <div className="admin-error admin-v2-message">{error}</div>}
            {notice && <div className="admin-notice admin-v2-message">{notice}</div>}

            <section className="admin-v2-stock-toolbar">
              <label><Search size={18} /><input value={productQuery} onChange={event => setProductQuery(event.target.value)} placeholder="Rechercher un produit…" /></label>
              <select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)} aria-label="Filtrer par catégorie">
                {categories.map(category => <option key={category}>{category}</option>)}
              </select>
              <button className="admin-v2-new" onClick={startNewProduct}><Plus size={18} /> Nouveau produit</button>
            </section>

            <section className="admin-v2-stock-workspace">
              <aside className="admin-v2-products-pane">
                <div className="admin-list-title"><div><small>CATALOGUE</small><h1>Produits</h1></div><span>{filteredProducts.length}</span></div>
                <div className="admin-v2-product-scroll">
                  {filteredProducts.length === 0 && <div className="admin-empty">Aucun produit trouvé.</div>}
                  {filteredProducts.map(product => {
                    const state = stockState(product)
                    return (
                      <button key={product.id} className={`admin-product-row ${!creating && draft?.id === product.id ? 'is-active' : ''}`} onClick={() => chooseProduct(product)}>
                        <div className="admin-v2-row-main">
                          <img src={product.image_url || FALLBACK_PRODUCT_IMAGE} alt="" onError={event => { event.currentTarget.src = FALLBACK_PRODUCT_IMAGE }} />
                          <span><strong>{product.name}</strong><small>{product.category}</small></span>
                        </div>
                        <div><span className={`admin-stock-pill stock-${state.key}`}>{state.label}</span>{product.stock_mode === 'tracked' && <b>{product.stock_quantity ?? 0}</b>}</div>
                      </button>
                    )
                  })}
                </div>
              </aside>

              <section className="admin-v2-editor-pane">
                {!draft ? <div className="admin-empty">Sélectionnez ou ajoutez un produit.</div> : <>
                  <div className="admin-v2-editor-head">
                    <div><small>{creating ? 'NOUVEAU PRODUIT' : 'FICHE PRODUIT'}</small><h2>{draft.name || 'Nouveau produit'}</h2><span>{creating ? 'Complétez les informations puis enregistrez.' : `Référence ${draft.id}`}</span></div>
                    <div className="admin-v2-head-actions">
                      {dirty && <span className="admin-v2-unsaved">Non enregistré</span>}
                      {!creating && <span className={`admin-stock-pill stock-${stockState(draft).key}`}>{stockState(draft).label}</span>}
                      {creating && <button className="admin-v2-icon" onClick={cancelNewProduct} aria-label="Annuler"><X size={18} /></button>}
                    </div>
                  </div>

                  <div className="admin-v2-editor-grid">
                    <div className="admin-v2-photo-card">
                      <div className="admin-v2-photo-preview"><img src={draft.image_url || FALLBACK_PRODUCT_IMAGE} alt={draft.name || 'Produit AfroTarn'} onError={event => { event.currentTarget.src = FALLBACK_PRODUCT_IMAGE }} /></div>
                      <label className="admin-v2-upload"><ImagePlus size={18} /> {uploading ? 'Envoi…' : 'Changer la photo'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadImage} disabled={uploading || saving} /></label>
                      <small>JPG, PNG ou WebP · 5 Mo maximum.</small>
                    </div>

                    <div className="admin-v2-fields">
                      <label className="admin-v2-field"><span>Nom du produit</span><input value={draft.name} onChange={event => editDraft({ name: event.target.value })} placeholder="Ex. Plantain vert" /></label>
                      <label className="admin-v2-field"><span>Catégorie</span><input list="afrotarn-categories" value={draft.category} onChange={event => editDraft({ category: event.target.value })} placeholder="Épicerie" /><datalist id="afrotarn-categories">{categorySuggestions.map(category => <option key={category} value={category} />)}</datalist></label>
                      <label className="admin-v2-field admin-v2-field-wide"><span>Description</span><textarea rows={4} value={draft.description || ''} onChange={event => editDraft({ description: event.target.value })} placeholder="Description visible par le client…" /></label>
                      <label className="admin-v2-field"><span>Prix TTC</span><div className="admin-v2-money"><input type="number" min="0" step="0.01" inputMode="decimal" value={draft.price_cents === null ? '' : (draft.price_cents / 100).toFixed(2)} onChange={event => { const value = event.target.value.replace(',', '.'); editDraft({ price_cents: value === '' ? null : Math.max(0, Math.round(Number(value) * 100)) }) }} placeholder="0,00" /><b>€</b></div></label>
                      <div className="admin-v2-field"><span>Mode de stock</span><div className="admin-v2-segmented"><button className={draft.stock_mode === 'tracked' ? 'is-active' : ''} onClick={() => editDraft({ stock_mode: 'tracked', stock_quantity: draft.stock_quantity ?? 0 })}>Quantifié</button><button className={draft.stock_mode === 'arrival' ? 'is-active' : ''} onClick={() => editDraft({ stock_mode: 'arrival', stock_quantity: null, orderable: false })}>Arrivage</button><button className={draft.stock_mode === 'store_only' ? 'is-active' : ''} onClick={() => editDraft({ stock_mode: 'store_only', stock_quantity: null, orderable: false })}>Magasin</button></div></div>

                      {draft.stock_mode === 'tracked' && <>
                        <div className="admin-v2-field"><span>Quantité disponible</span><div className="admin-v2-quantity"><button onClick={() => changeQuantity(-1)}><Minus size={18} /></button><input type="number" min="0" inputMode="numeric" value={draft.stock_quantity ?? 0} onChange={event => editDraft({ stock_quantity: Math.max(0, Math.floor(Number(event.target.value) || 0)) })} /><button onClick={() => changeQuantity(1)}><Plus size={18} /></button></div></div>
                        <label className="admin-v2-field"><span>Seuil stock bas</span><input type="number" min="0" inputMode="numeric" value={draft.safety_stock} onChange={event => editDraft({ safety_stock: Math.max(0, Math.floor(Number(event.target.value) || 0)) })} /></label>
                      </>}
                    </div>
                  </div>

                  <div className="admin-v2-switches">
                    <label><span><strong>Visible sur le site</strong><small>Le produit apparaît dans le catalogue client.</small></span><input type="checkbox" checked={draft.active} onChange={event => editDraft({ active: event.target.checked, orderable: event.target.checked ? draft.orderable : false })} /></label>
                    <label className={draft.price_cents === null || draft.stock_mode !== 'tracked' || (draft.stock_quantity ?? 0) <= 0 || !draft.active ? 'is-disabled' : ''}><span><strong>Click & Collect</strong><small>Autoriser la réservation/paiement quand Stripe sera activé.</small></span><input type="checkbox" checked={draft.orderable} disabled={draft.price_cents === null || draft.stock_mode !== 'tracked' || (draft.stock_quantity ?? 0) <= 0 || !draft.active} onChange={event => editDraft({ orderable: event.target.checked })} /></label>
                  </div>

                  <div className="admin-v2-savebar">
                    <div><small>{creating ? 'Création' : 'Dernière mise à jour'}</small><strong>{creating ? 'Nouvelle référence' : dateTime(draft.updated_at)}</strong></div>
                    <button onClick={saveProduct} disabled={saving || uploading || !dirty}><Save size={18} /> {saving ? 'Enregistrement…' : creating ? 'Ajouter le produit' : 'Enregistrer les modifications'}</button>
                  </div>
                </>}
              </section>
            </section>
          </>
        )}
      </div>
    </main>
  )
}
