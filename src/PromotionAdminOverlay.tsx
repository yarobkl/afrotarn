import { useEffect, useMemo, useState } from 'react'
import { BadgePercent, RefreshCw, Save, X } from 'lucide-react'
import './promotion.css'

type PromoProduct = {
  id: string
  name: string
  category: string
  price_cents: number | null
  promotion_active: boolean
  promo_price_cents: number | null
  promo_label: string | null
}

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || 'https://whgnczmorqmhwdvmgtwt.supabase.co'
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoZ25jem1vcnFtaHdkdm1ndHd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5OTE3MTYsImV4cCI6MjEwMjU2NzcxNn0.GenTCUGdLzxiyW9TtI8740WsmIg9_TUy1x0j6itPAdI'

function headers(token: string) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

function centsToInput(value: number | null) {
  return value === null ? '' : (value / 100).toFixed(2)
}

function inputToCents(value: string) {
  const normalized = value.replace(',', '.').trim()
  if (!normalized) return null
  const amount = Number(normalized)
  return Number.isFinite(amount) ? Math.max(0, Math.round(amount * 100)) : null
}

export default function PromotionAdminOverlay() {
  const [token, setToken] = useState(() => sessionStorage.getItem('afrotarn-admin-token') || '')
  const [open, setOpen] = useState(false)
  const [products, setProducts] = useState<PromoProduct[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const timer = window.setInterval(() => {
      const next = sessionStorage.getItem('afrotarn-admin-token') || ''
      setToken(current => current === next ? current : next)
    }, 700)
    return () => window.clearInterval(timer)
  }, [])

  async function load(currentToken = token) {
    if (!currentToken) return
    setLoading(true)
    setMessage('')
    try {
      const select = encodeURIComponent('id,name,category,price_cents,promotion_active,promo_price_cents,promo_label')
      const response = await fetch(`${SUPABASE_URL}/rest/v1/products?select=${select}&order=name.asc`, { headers: headers(currentToken) })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.message || 'Impossible de charger les promotions')
      setProducts(data as PromoProduct[])
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && token) void load(token)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, token])

  const visibleProducts = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('fr')
    if (!normalized) return products
    return products.filter(product => `${product.name} ${product.category}`.toLocaleLowerCase('fr').includes(normalized))
  }, [products, query])

  function edit(id: string, patch: Partial<PromoProduct>) {
    setProducts(current => current.map(product => product.id === id ? { ...product, ...patch } : product))
    setMessage('')
  }

  async function save(product: PromoProduct) {
    if (!token) return
    if (product.promotion_active && product.price_cents !== null && product.promo_price_cents !== null && product.promo_price_cents >= product.price_cents) {
      setMessage(`Le prix promo de ${product.name} doit être inférieur au prix habituel.`)
      return
    }

    setSavingId(product.id)
    setMessage('')
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${encodeURIComponent(product.id)}`, {
        method: 'PATCH',
        headers: { ...headers(token), Prefer: 'return=representation' },
        body: JSON.stringify({
          price_cents: product.price_cents,
          promotion_active: product.promotion_active,
          promo_price_cents: product.promo_price_cents,
          promo_label: product.promo_label?.trim() || 'PROMO',
          updated_at: new Date().toISOString(),
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.message || 'Impossible d’enregistrer la promotion')
      const saved = data[0] as PromoProduct | undefined
      if (saved) edit(product.id, saved)
      setMessage(product.promotion_active
        ? (product.price_cents !== null && product.promo_price_cents !== null ? `Promotion enregistrée pour ${product.name}.` : `${product.name} est marqué en promotion. Ajoutez les deux prix pour afficher le prix barré.`)
        : `Promotion désactivée pour ${product.name}.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erreur d’enregistrement')
    } finally {
      setSavingId(null)
    }
  }

  if (!token) return null

  return <>
    <button className="admin-promo-launcher" type="button" onClick={() => setOpen(true)}><BadgePercent size={18} /><span>Promotions</span></button>
    {open && <div className="admin-promo-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false) }}>
      <section className="admin-promo-drawer" role="dialog" aria-modal="true" aria-label="Gérer les promotions">
        <header><div><small>CATALOGUE</small><h2>Promotions</h2><p>Activez une promo, renseignez le prix habituel et le prix remisé.</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Fermer"><X size={20} /></button></header>
        <div className="admin-promo-tools"><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Rechercher un produit…" /><button type="button" onClick={() => load()} disabled={loading}><RefreshCw size={17} /> {loading ? 'Chargement…' : 'Actualiser'}</button></div>
        {message && <div className="admin-promo-message" role="status">{message}</div>}
        <div className="admin-promo-list">
          {visibleProducts.map(product => <article key={product.id} className={`admin-promo-item ${product.promotion_active ? 'is-active' : ''}`}>
            <div className="admin-promo-item-head"><div><strong>{product.name}</strong><span>{product.category}</span></div><label className="admin-promo-toggle"><input type="checkbox" checked={product.promotion_active} onChange={event => edit(product.id, { promotion_active: event.target.checked, promo_label: product.promo_label || 'PROMO' })} /><span /></label></div>
            <div className="admin-promo-grid">
              <label><span>Prix habituel</span><div><input type="number" min="0" step="0.01" inputMode="decimal" value={centsToInput(product.price_cents)} onChange={event => edit(product.id, { price_cents: inputToCents(event.target.value) })} placeholder="0,00" /><b>€</b></div></label>
              <label><span>Prix promo</span><div><input type="number" min="0" step="0.01" inputMode="decimal" value={centsToInput(product.promo_price_cents)} onChange={event => edit(product.id, { promo_price_cents: inputToCents(event.target.value) })} placeholder="0,00" /><b>€</b></div></label>
              <label className="admin-promo-label"><span>Libellé</span><input value={product.promo_label || ''} onChange={event => edit(product.id, { promo_label: event.target.value })} placeholder="PROMO" maxLength={24} /></label>
            </div>
            <button className="admin-promo-save" type="button" onClick={() => save(product)} disabled={savingId === product.id}><Save size={16} /> {savingId === product.id ? 'Enregistrement…' : 'Enregistrer'}</button>
          </article>)}
        </div>
      </section>
    </div>}
  </>
}
