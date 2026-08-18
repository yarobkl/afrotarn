import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Mail, MapPin, Minus, Phone, Plus, Search, ShoppingBag, Store } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import './cart-simple.css'

type DbProduct = {
  id: string
  name: string
  category: string
  description: string | null
  active: boolean
  stock_mode: 'tracked' | 'store_only' | 'arrival'
  stock_quantity: number | null
  image_url: string | null
}

type CartState = Record<number, number>

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || 'https://whgnczmorqmhwdvmgtwt.supabase.co'
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const SHOP_EMAIL = 'afrotarn@gmail.com'
const SHOP_PHONE = '06 07 07 71 58'
const SHOP_PHONE_HREF = '+33607077158'
const SHOP_MAP = 'https://www.google.com/maps/search/?api=1&query=70+rue+du+Chateau+du+Roi+81600+Gaillac'

function readCart(): CartState {
  try {
    const parsed = JSON.parse(localStorage.getItem('afrotarn-list') || '{}') as Record<string, unknown>
    const safe: CartState = {}
    for (const [rawId, rawQty] of Object.entries(parsed || {})) {
      const id = Number(rawId)
      const qty = Math.floor(Number(rawQty))
      if (Number.isFinite(id) && id > 0 && Number.isFinite(qty) && qty > 0) safe[id] = Math.min(qty, 99)
    }
    return safe
  } catch {
    return {}
  }
}

function availability(product: DbProduct) {
  if (product.stock_mode === 'tracked') {
    const quantity = product.stock_quantity ?? 0
    return quantity > 0 ? 'Disponible' : 'Indisponible'
  }
  return product.stock_mode === 'arrival' ? 'Selon arrivage' : 'Disponible en boutique'
}

export default function CartRoute() {
  const [products, setProducts] = useState<DbProduct[]>([])
  const [cart, setCart] = useState<CartState>(readCart)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        if (!SUPABASE_KEY) throw new Error('Configuration catalogue indisponible')
        const select = encodeURIComponent('id,name,category,description,active,stock_mode,stock_quantity,image_url')
        const response = await fetch(`${SUPABASE_URL}/rest/v1/products?select=${select}&active=eq.true&order=category.asc,name.asc`, {
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
          cache: 'no-store',
        })
        if (!response.ok) throw new Error('Catalogue indisponible')
        const rows = await response.json() as DbProduct[]
        if (!cancelled) setProducts(rows)
      } catch {
        if (!cancelled) setProducts([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    try { localStorage.setItem('afrotarn-list', JSON.stringify(cart)) } catch { /* navigateur restreint */ }
  }, [cart])

  const selected = useMemo(() => products.filter(product => cart[Number(product.id)]), [products, cart])
  const count = selected.reduce((sum, product) => sum + (cart[Number(product.id)] || 0), 0)

  function change(product: DbProduct, delta: number) {
    const id = Number(product.id)
    setCart(current => {
      const next = { ...current }
      const currentQty = next[id] || 0
      const max = product.stock_mode === 'tracked' ? Math.max(0, product.stock_quantity ?? 0) : 99
      const nextQty = Math.max(0, Math.min(currentQty + delta, max || 0, 99))
      if (nextQty <= 0) delete next[id]
      else next[id] = nextQty
      return next
    })
  }

  function clear() {
    setCart({})
  }

  const mailBody = encodeURIComponent(`Bonjour AfroTarn,\n\nJe souhaite préparer un retrait avec les produits suivants :\n${selected.map(product => `- ${product.name} x${cart[Number(product.id)]}`).join('\n')}\n\nPouvez-vous me confirmer la disponibilité et le retrait en boutique ?\n\nMerci.`)
  const mailSubject = encodeURIComponent('Préparation de retrait AfroTarn')
  const requestMailto = `mailto:${SHOP_EMAIL}?subject=${mailSubject}&body=${mailBody}`

  return <div className="simple-cart-shell">
    <header className="simple-cart-header">
      <Link to="/" className="simple-cart-brand"><span>AT</span><div><strong>AFROTARN</strong><small>GAILLAC · ÉPICERIE & CULTURE</small></div></Link>
      <nav><NavLink to="/">Accueil</NavLink><NavLink to="/produits">Produits</NavLink><NavLink to="/click-collect" className="active"><ShoppingBag size={17} /> Panier{count > 0 && <b>{count}</b>}</NavLink></nav>
    </header>

    <main className="simple-cart-main">
      <section className="simple-cart-hero">
        <span>RETRAIT EN BOUTIQUE</span>
        <h1>Votre panier</h1>
        <p>Vérifiez vos produits puis demandez leur préparation avant de venir chez AfroTarn.</p>
        <div className="simple-cart-steps"><strong>1. Panier</strong><span>→</span><strong>2. Préparation</strong><span>→</span><strong>3. Retrait en boutique</strong></div>
      </section>

      <section className="simple-cart-layout">
        <div className="simple-cart-panel">
          <div className="simple-cart-panel-head"><div><small>PANIER</small><h2>{count ? `${count} article${count > 1 ? 's' : ''}` : 'Votre panier est vide'}</h2></div>{count > 0 && <button onClick={clear}>Vider le panier</button>}</div>

          {loading ? <div className="simple-cart-empty"><ShoppingBag size={30} /><p>Chargement de votre panier…</p></div> : selected.length ? <div className="simple-cart-items">
            {selected.map(product => {
              const id = Number(product.id)
              const qty = cart[id] || 0
              return <article className="simple-cart-item" key={product.id}>
                <div className="simple-cart-image">{product.image_url ? <img src={product.image_url} alt={product.name} /> : <span>AT</span>}</div>
                <div className="simple-cart-copy"><small>{product.category}</small><strong>{product.name}</strong><span>{availability(product)}</span></div>
                <div className="simple-cart-qty" aria-label={`Quantité ${product.name}`}><button onClick={() => change(product, -1)} aria-label={`Retirer un ${product.name}`}><Minus size={16} /></button><b>{qty}</b><button onClick={() => change(product, 1)} aria-label={`Ajouter un ${product.name}`}><Plus size={16} /></button></div>
              </article>
            })}
          </div> : <div className="simple-cart-empty"><ShoppingBag size={34} /><h3>Votre panier est vide</h3><p>Ajoutez les produits qui vous intéressent avant de préparer votre retrait.</p><Link to="/produits">Voir les produits <ArrowRight size={17} /></Link></div>}
        </div>

        <aside className="simple-cart-summary">
          <small>VOTRE RETRAIT</small>
          <h2>Préparer mon retrait</h2>
          <p>AfroTarn vérifie la disponibilité avant votre venue. Aucun paiement n’est effectué sur cette étape.</p>
          {count > 0 ? <a className="simple-cart-primary" href={requestMailto}><Mail size={18} /> Préparer mon retrait</a> : <Link className="simple-cart-primary" to="/produits"><Search size={18} /> Ajouter des produits</Link>}
          <a className="simple-cart-secondary" href={`tel:${SHOP_PHONE_HREF}`}><Phone size={18} /> {SHOP_PHONE}</a>
          <a className="simple-cart-secondary" href={SHOP_MAP}><MapPin size={18} /> Itinéraire boutique</a>
          <div className="simple-cart-reassurance"><Store size={18} /><span>Retrait au 70 rue du Château du Roi, 81600 Gaillac.</span></div>
        </aside>
      </section>
    </main>

    <nav className="simple-cart-mobile-nav" aria-label="Navigation rapide"><NavLink to="/"><Store size={19} /><span>Accueil</span></NavLink><NavLink to="/produits"><Search size={19} /><span>Produits</span></NavLink><NavLink to="/click-collect" className="active"><ShoppingBag size={19} /><span>Panier</span>{count > 0 && <b>{count}</b>}</NavLink><a href={SHOP_MAP}><MapPin size={19} /><span>Venir</span></a></nav>
  </div>
}
