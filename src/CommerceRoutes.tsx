import { useEffect, useMemo, useState, type SyntheticEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, BadgeCheck, ChevronRight, CreditCard, MapPin, Menu, Minus, Phone, Plus, Search, ShoppingBag, Store, X } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import './commerce-v2.css'

type StockMode = 'tracked' | 'store_only' | 'arrival'
type PaymentChoice = 'apple' | 'google' | 'card'
type ListState = Record<number, number>

type DbProduct = {
  id: string
  name: string
  category: string
  description: string | null
  price_cents: number | null
  active: boolean
  orderable: boolean
  stock_mode: StockMode
  stock_quantity: number | null
  safety_stock: number
  image_url: string | null
}

type Product = {
  id: number
  dbId: string
  name: string
  category: string
  description: string
  priceCents: number | null
  orderable: boolean
  stockMode: StockMode
  stockQuantity: number | null
  safetyStock: number
  status: string
  available: boolean
  image: string
  tag: string
  accent: string
}

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || 'https://whgnczmorqmhwdvmgtwt.supabase.co'
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoZ25jem1vcnFtaHdkdm1ndHd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5OTE3MTYsImV4cCI6MjEwMjU2NzcxNn0.GenTCUGdLzxiyW9TtI8740WsmIg9_TUy1x0j6itPAdI'
const shop = {
  phone: '06 07 07 71 58',
  phoneHref: '+33607077158',
  email: 'afrotarn@gmail.com',
  address: '70 rue du Château du Roi, 81600 Gaillac',
  map: 'https://www.google.com/maps/search/?api=1&query=70+rue+du+Chateau+du+Roi+81600+Gaillac',
}

const FALLBACK_IMAGE = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="1200" height="900" fill="#123c2d"/><circle cx="600" cy="400" r="150" fill="none" stroke="#d9a55a" stroke-width="3" opacity=".6"/><text x="600" y="430" fill="#f3eee6" text-anchor="middle" font-family="Georgia,serif" font-size="82">AFROTARN</text><text x="600" y="495" fill="#d9a55a" text-anchor="middle" font-family="Arial,sans-serif" font-size="25" letter-spacing="8">GAILLAC</text></svg>')}`

const fallbackProducts: Product[] = [
  { id: 1, dbId: '1', name: 'Plantain', category: 'Fruits & légumes', description: 'Vert ou mûr, pour alloco, banane frite et recettes du quotidien.', priceCents: null, orderable: false, stockMode: 'arrival', stockQuantity: null, safetyStock: 0, status: 'Selon arrivage', available: true, image: FALLBACK_IMAGE, tag: 'Fruits & légumes', accent: '#d6a75f' },
  { id: 2, dbId: '2', name: 'Manioc', category: 'Fruits & légumes', description: 'Un incontournable à cuisiner bouilli, frit ou transformé.', priceCents: null, orderable: false, stockMode: 'arrival', stockQuantity: null, safetyStock: 0, status: 'Selon arrivage', available: true, image: FALLBACK_IMAGE, tag: 'Fruits & légumes', accent: '#9c6844' },
]

function handleImageError(event: SyntheticEvent<HTMLImageElement>) {
  if (event.currentTarget.src === FALLBACK_IMAGE) return
  event.currentTarget.src = FALLBACK_IMAGE
}

function accentFor(category: string) {
  const normalized = category.toLocaleLowerCase('fr')
  if (normalized.includes('cosm')) return '#b57f5e'
  if (normalized.includes('surg') || normalized.includes('poisson')) return '#566b75'
  if (normalized.includes('boisson')) return '#8f352c'
  if (normalized.includes('fruit') || normalized.includes('légume')) return '#477658'
  return '#d6a75f'
}

function toProduct(row: DbProduct): Product | null {
  const id = Number(row.id)
  if (!Number.isFinite(id) || id <= 0) return null
  const quantity = row.stock_quantity ?? 0
  const status = row.stock_mode === 'tracked'
    ? quantity <= 0 ? 'Indisponible' : quantity <= row.safety_stock ? 'Plus que quelques articles' : 'Disponible'
    : row.stock_mode === 'arrival' ? 'Selon arrivage' : 'Disponible en boutique'
  return {
    id,
    dbId: row.id,
    name: row.name,
    category: row.category,
    description: row.description || 'Référence disponible chez AfroTarn.',
    priceCents: row.price_cents,
    orderable: row.orderable,
    stockMode: row.stock_mode,
    stockQuantity: row.stock_quantity,
    safetyStock: row.safety_stock,
    status,
    available: row.stock_mode !== 'tracked' || quantity > 0,
    image: row.image_url || FALLBACK_IMAGE,
    tag: row.category,
    accent: accentFor(row.category),
  }
}

function usePublicCatalog() {
  const [products, setProducts] = useState<Product[]>(fallbackProducts)
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)

  async function load() {
    try {
      const select = encodeURIComponent('id,name,category,description,price_cents,active,orderable,stock_mode,stock_quantity,safety_stock,image_url')
      const response = await fetch(`${SUPABASE_URL}/rest/v1/products?select=${select}&active=eq.true&order=category.asc,name.asc`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        cache: 'no-store',
      })
      if (!response.ok) throw new Error('Catalogue indisponible')
      const rows = await response.json() as DbProduct[]
      const live = rows.map(toProduct).filter((product): product is Product => Boolean(product))
      setProducts(live)
      setOffline(false)
    } catch {
      setOffline(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => void load(), 60000)
    const onVisibility = () => { if (document.visibilityState === 'visible') void load() }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return { products, loading, offline, reload: load }
}

function readList(): ListState {
  try {
    const parsed = JSON.parse(localStorage.getItem('afrotarn-list') || '{}') as Record<string, unknown>
    const safe: ListState = {}
    for (const [key, value] of Object.entries(parsed || {})) {
      const id = Number(key)
      const qty = Math.floor(Number(value))
      if (Number.isFinite(id) && id > 0 && Number.isFinite(qty) && qty > 0) safe[id] = Math.min(qty, 99)
    }
    return safe
  } catch {
    return {}
  }
}

function useList(products: Product[]) {
  const [list, setList] = useState<ListState>(readList)
  useEffect(() => {
    setList(current => {
      const next: ListState = {}
      for (const product of products) {
        const qty = current[product.id]
        if (!qty || !product.available) continue
        const max = product.stockMode === 'tracked' ? Math.max(0, product.stockQuantity ?? 0) : 99
        if (max > 0) next[product.id] = Math.min(qty, max, 99)
      }
      return next
    })
  }, [products])
  useEffect(() => {
    try { localStorage.setItem('afrotarn-list', JSON.stringify(list)) } catch { /* Safari private mode */ }
  }, [list])
  const add = (product: Product) => setList(current => {
    if (!product.available) return current
    const max = product.stockMode === 'tracked' ? Math.max(0, product.stockQuantity ?? 0) : 99
    if (max <= 0) return current
    return { ...current, [product.id]: Math.min((current[product.id] || 0) + 1, max, 99) }
  })
  const remove = (product: Product) => setList(current => {
    const next = { ...current }
    const qty = (next[product.id] || 0) - 1
    if (qty <= 0) delete next[product.id]
    else next[product.id] = qty
    return next
  })
  const clear = () => setList({})
  const count = Object.values(list).reduce((sum, qty) => sum + qty, 0)
  return { list, add, remove, clear, count }
}

function Wordmark() {
  return <Link to="/" className="wordmark"><span className="wordmark-seal"><span>AT</span></span><span className="wordmark-copy"><strong>AFROTARN</strong><small>GAILLAC · ÉPICERIE & CULTURE</small></span></Link>
}

function CommerceLayout({ children, count }: { children: React.ReactNode; count: number }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  useEffect(() => setMenuOpen(false), [location.pathname])
  return <div className="site-shell commerce-v2-shell">
    <header className="site-header commerce-v2-header">
      <Wordmark />
      <nav className="desktop-nav"><NavLink to="/">Accueil</NavLink><NavLink to="/produits">Produits</NavLink><NavLink to="/click-collect">Retrait</NavLink><a href={shop.map}>La boutique</a></nav>
      <Link className="header-list" to="/click-collect"><ShoppingBag size={17} /><span>Ma liste</span>{count > 0 && <b>{count}</b>}</Link>
      <button className="mobile-menu-button" onClick={() => setMenuOpen(open => !open)} aria-label="Menu">{menuOpen ? <X size={23} /> : <Menu size={23} />}</button>
      <AnimatePresence>{menuOpen && <motion.div className="mobile-panel" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}><NavLink to="/">Accueil <ChevronRight size={18} /></NavLink><NavLink to="/produits">Explorer les produits <ChevronRight size={18} /></NavLink><NavLink to="/click-collect">Ma sélection <ChevronRight size={18} /></NavLink><a href={shop.map}>Itinéraire <ChevronRight size={18} /></a></motion.div>}</AnimatePresence>
    </header>
    <main className="page-stage">{children}</main>
    <footer className="site-footer"><div className="footer-grid"><div className="footer-brand"><Wordmark /><p>Épicerie africaine et cosmétiques à Gaillac.</p></div><div><span className="footer-label">Boutique</span><p>{shop.address}</p><a href={shop.map}>Voir l’itinéraire <ArrowRight size={15} /></a></div><div><span className="footer-label">Contact</span><a href={`tel:${shop.phoneHref}`}>{shop.phone}</a><a href={`mailto:${shop.email}`}>{shop.email}</a></div><div><span className="footer-label">Rapide</span><Link to="/produits">Produits</Link><Link to="/click-collect">Ma sélection</Link></div></div></footer>
    <nav className="mobile-dock"><NavLink to="/" end><Store size={19} /><span>Accueil</span></NavLink><NavLink to="/produits"><Search size={19} /><span>Produits</span></NavLink><NavLink className="dock-list" to="/click-collect"><ShoppingBag size={19} /><span>Ma liste</span>{count > 0 && <b>{count}</b>}</NavLink><a className="dock-primary" href={shop.map}><MapPin size={19} /><span>Venir</span></a></nav>
  </div>
}

function ProductCard({ product, add, onOpen }: { product: Product; add: (product: Product) => void; onOpen: (product: Product) => void }) {
  return <motion.article className={`product-card commerce-v2-product ${!product.available ? 'is-unavailable' : ''}`} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .1 }}>
    <button className="product-visual" onClick={() => onOpen(product)} style={{ '--accent': product.accent } as React.CSSProperties}><img src={product.image} alt="" loading="lazy" onError={handleImageError} /><span className="product-tag">{product.tag}</span></button>
    <div className="product-body"><div className="product-topline"><span>{product.category}</span><i className={!product.available ? 'commerce-v2-out' : ''}>{product.status}</i></div><button className="product-title" onClick={() => onOpen(product)}><h3>{product.name}</h3></button><p>{product.description}</p>{product.priceCents !== null && <strong className="commerce-v2-price">{money(product.priceCents)}</strong>}<div className="product-actions"><button className="add-button" disabled={!product.available} onClick={() => add(product)}>{product.available ? <><Plus size={17} /> Ajouter à ma liste</> : 'Indisponible'}</button><button className="icon-button" onClick={() => onOpen(product)}><ArrowRight size={17} /></button></div></div>
  </motion.article>
}

function money(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

function CatalogContent({ products, add, count, loading, offline }: { products: Product[]; add: (product: Product) => void; count: number; loading: boolean; offline: boolean }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Tous')
  const [selected, setSelected] = useState<Product | null>(null)
  const categories = useMemo(() => ['Tous', ...Array.from(new Set(products.map(product => product.category))).sort((a, b) => a.localeCompare(b, 'fr'))], [products])
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('fr')
    return products.filter(product => (category === 'Tous' || product.category === category) && (!normalized || `${product.name} ${product.category} ${product.description}`.toLocaleLowerCase('fr').includes(normalized)))
  }, [products, query, category])

  return <>
    <section className="section catalog-hero commerce-v2-hero"><div><span className="kicker">CATALOGUE EN DIRECT</span><h1>Le stock du magasin, <em>plus clair.</em></h1></div><p>Les disponibilités affichées viennent maintenant du stock géré dans l’espace AfroTarn.</p></section>
    {offline && <div className="section commerce-v2-sync-warning">Connexion au stock momentanément indisponible. Les dernières références connues restent affichées.</div>}
    <section className="catalog-tools-wrap"><div className="section catalog-tools"><label className="catalog-search"><Search size={20} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Rechercher un produit…" />{query && <button onClick={() => setQuery('')}><X size={18} /></button>}</label><div className="category-scroll">{categories.map(item => <button key={item} className={item === category ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div></div></section>
    <section className="section catalog-content"><div className="results-line"><span>{loading ? 'Mise à jour…' : <><strong>{filtered.length}</strong> résultat{filtered.length > 1 ? 's' : ''}</>}</span>{count > 0 && <Link to="/click-collect">Ma liste · {count} <ArrowRight size={15} /></Link>}</div>{filtered.length ? <div className="product-grid">{filtered.map(product => <ProductCard key={product.dbId} product={product} add={add} onOpen={setSelected} />)}</div> : <div className="empty-results"><Search size={30} /><h3>Aucun produit trouvé</h3><p>Essayez un autre mot-clé ou contactez la boutique.</p></div>}</section>
    <AnimatePresence>{selected && <><motion.button className="sheet-backdrop" onClick={() => setSelected(null)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} /><motion.aside className="product-sheet" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}><button className="sheet-close" onClick={() => setSelected(null)}><X size={20} /></button><div className="sheet-image"><img src={selected.image} alt={selected.name} onError={handleImageError} /></div><div className="sheet-content"><span className="kicker">{selected.category}</span><h2>{selected.name}</h2><span className={`availability ${!selected.available ? 'commerce-v2-out' : ''}`}><i />{selected.status}</span>{selected.priceCents !== null && <strong className="commerce-v2-sheet-price">{money(selected.priceCents)}</strong>}<p>{selected.description}</p><button className="button button-dark full" disabled={!selected.available} onClick={() => { add(selected); setSelected(null) }}>{selected.available ? <><Plus size={18} /> Ajouter à ma liste</> : 'Produit indisponible'}</button><a className="button button-ghost full" href={`tel:${shop.phoneHref}`}><Phone size={18} /> Appeler AfroTarn</a></div></motion.aside></>}</AnimatePresence>
  </>
}

function ClickCollectContent({ products, list, add, remove, clear }: { products: Product[]; list: ListState; add: (product: Product) => void; remove: (product: Product) => void; clear: () => void }) {
  const [payment, setPayment] = useState<PaymentChoice | null>(null)
  const selected = products.filter(product => list[product.id])
  const count = selected.reduce((sum, product) => sum + (list[product.id] || 0), 0)
  const paymentLabel = payment === 'apple' ? 'Apple Pay' : payment === 'google' ? 'Google Pay' : payment === 'card' ? 'Carte bancaire' : 'À choisir'
  return <>
    <section className="click-hero section commerce-v2-click-hero"><div><span className="kicker">CLICK & COLLECT</span><h1>Votre sélection, <em>avec le stock réel.</em></h1><p>Une rupture dans l’admin est automatiquement prise en compte ici.</p></div><div className="journey-steps"><div className={count ? 'done' : 'active'}><span>1</span><strong>Sélection</strong><small>{count ? `${count} article${count > 1 ? 's' : ''}` : 'Ma liste'}</small></div><div className={payment ? 'done' : count ? 'active' : ''}><span>2</span><strong>Paiement</strong><small>{paymentLabel}</small></div><div className={payment ? 'active' : ''}><span>3</span><strong>Confirmation</strong><small>AfroTarn</small></div><div><span>4</span><strong>Retrait</strong><small>Gaillac</small></div></div></section>
    <section className="section list-layout commerce-v2-list-layout"><div className="list-panel"><div className="list-panel-head"><div><span className="kicker">1 · MA SÉLECTION</span><h2>{count ? `${count} article${count > 1 ? 's' : ''}` : 'Votre liste est vide'}</h2></div>{count > 0 && <button className="clear-button" onClick={clear}>Vider</button>}</div>{selected.length ? <><div className="list-items">{selected.map(product => <div className="list-item" key={product.dbId}><img src={product.image} alt="" onError={handleImageError} /><div className="list-copy"><strong>{product.name}</strong><span>{product.status}{product.priceCents !== null ? ` · ${money(product.priceCents)}` : ''}</span></div><div className="qty-control"><button onClick={() => remove(product)}><Minus size={16} /></button><b>{list[product.id]}</b><button onClick={() => add(product)} disabled={product.stockMode === 'tracked' && (list[product.id] || 0) >= (product.stockQuantity ?? 0)}><Plus size={16} /></button></div></div>)}</div><div className="checkout-payment-step"><div className="checkout-payment-head"><div><span className="kicker">2 · PAIEMENT</span><strong>Comment souhaitez-vous payer ?</strong><p>Le moyen choisi sera utilisé quand Stripe sera activé.</p></div></div><div className="checkout-payment-methods"><button className={`checkout-payment-method apple ${payment === 'apple' ? 'is-selected' : ''}`} onClick={() => setPayment('apple')}>Apple Pay</button><button className={`checkout-payment-method google ${payment === 'google' ? 'is-selected' : ''}`} onClick={() => setPayment('google')}>Google Pay</button><button className={`checkout-payment-method card ${payment === 'card' ? 'is-selected' : ''}`} onClick={() => setPayment('card')}><CreditCard size={18} /> Carte bancaire</button></div><div className="checkout-payment-note"><BadgeCheck size={15} /><span>Aucun débit n’est effectué tant que Stripe n’est pas activé.</span></div></div></> : <div className="empty-list"><ShoppingBag size={32} /><p>Ajoutez d’abord vos produits.</p><Link className="button button-dark" to="/produits">Explorer les produits</Link></div>}</div><aside className="confirmation-card"><span className="kicker light">3 · CONFIRMATION</span><h2>Finaliser</h2><p>La commande sera réellement créée après activation du paiement sécurisé.</p>{count > 0 && <div className="selected-payment-summary"><span>Paiement choisi</span><strong>{paymentLabel}</strong></div>}<button className="button button-light full" disabled={!count || !payment}><CreditCard size={18} /> {payment ? 'Paiement bientôt disponible' : 'Choisir le paiement'}</button><a className="button button-outline-light full" href={`tel:${shop.phoneHref}`}><Phone size={18} /> Appeler la boutique</a></aside></section>
  </>
}

export function CatalogRoute() {
  const catalog = usePublicCatalog()
  const list = useList(catalog.products)
  return <CommerceLayout count={list.count}><CatalogContent products={catalog.products} add={list.add} count={list.count} loading={catalog.loading} offline={catalog.offline} /></CommerceLayout>
}

export function ClickCollectRoute() {
  const catalog = usePublicCatalog()
  const list = useList(catalog.products)
  return <CommerceLayout count={list.count}><ClickCollectContent products={catalog.products} list={list.list} add={list.add} remove={list.remove} clear={list.clear} /></CommerceLayout>
}
