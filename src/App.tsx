import { useEffect, useMemo, useState, type ReactNode, type SyntheticEvent } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, MotionConfig, motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import {
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  Clock3,
  CreditCard,
  Mail,
  MapPin,
  Menu,
  Minus,
  Phone,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  X,
  type LucideIcon,
} from 'lucide-react'

const ESTELLE_IMAGE = 'https://images.ladepeche.fr/api/v1/images/view/652caa122bb9a5525c7dfb1d/large/image.jpg?v=1'
const MARKET_IMAGE = 'https://kamarasfoods.info/assets/store-interior-DskP_A47.jpg'
const PLANTAIN_IMAGE = 'https://hamburg.mitvergnuegen.com/wp-content/uploads/sites/2/2017/04/afro-shop3-afrikiko-bild-von-lisa.jpg'
const PRODUCE_IMAGE = 'https://plantbasednews.org/app/uploads/2025/05/african-heritage-diet-study-3-2048x1380.jpeg'
const FALLBACK_IMAGE = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900"><rect width="1200" height="900" fill="#123c2d"/><circle cx="600" cy="400" r="150" fill="none" stroke="#d9a55a" stroke-width="3" opacity=".6"/><text x="600" y="430" fill="#f3eee6" text-anchor="middle" font-family="Georgia,serif" font-size="82">AFROTARN</text><text x="600" y="495" fill="#d9a55a" text-anchor="middle" font-family="Arial,sans-serif" font-size="25" letter-spacing="8">GAILLAC</text></svg>')}`

const shop = {
  name: 'AFROTARN',
  city: 'Gaillac',
  phone: '06 07 07 71 58',
  phoneHref: '+33607077158',
  email: 'afrotarn@gmail.com',
  address: '70 rue du Château du Roi, 81600 Gaillac',
  map: 'https://www.google.com/maps/search/?api=1&query=70+rue+du+Chateau+du+Roi+81600+Gaillac',
}

type Product = {
  id: number
  name: string
  category: string
  description: string
  status: string
  image: string
  accent: string
  tag?: string
}

type ListState = Record<number, number>
type PaymentChoice = 'apple' | 'google' | 'card'

const products: Product[] = [
  { id: 1, name: 'Plantain', category: 'Fruits & légumes', description: 'Vert ou mûr, pour alloco, banane frite et recettes du quotidien.', status: 'Disponible en boutique', image: PLANTAIN_IMAGE, accent: '#d6a75f', tag: 'Incontournable' },
  { id: 2, name: 'Manioc', category: 'Fruits & légumes', description: 'Un incontournable à cuisiner bouilli, frit ou transformé.', status: 'Selon arrivage', image: PRODUCE_IMAGE, accent: '#9c6844', tag: 'Frais' },
  { id: 3, name: 'Attiéké', category: 'Épicerie', description: 'Semoule de manioc, idéale avec poisson, poulet ou légumes.', status: 'Disponible en boutique', image: MARKET_IMAGE, accent: '#e6c88c', tag: 'Essentiel' },
  { id: 4, name: 'Épices & sauces', category: 'Épicerie', description: 'Des bases parfumées pour retrouver les goûts de la maison.', status: 'Large choix', image: MARKET_IMAGE, accent: '#c75234', tag: 'Cuisine' },
  { id: 5, name: 'Poissons', category: 'Surgelés', description: 'Tilapia et références sélectionnées selon les arrivages.', status: 'Selon arrivage', image: MARKET_IMAGE, accent: '#566b75', tag: 'Surgelé' },
  { id: 6, name: 'Saka-saka & feuilles', category: 'Surgelés', description: 'Feuilles et légumes africains prêts à cuisiner.', status: 'Disponible en boutique', image: PRODUCE_IMAGE, accent: '#477658', tag: 'Cuisine' },
  { id: 7, name: 'Karité & soins', category: 'Cosmétiques', description: 'Soins nourrissants et hydratants pour la peau et les cheveux.', status: 'Disponible en boutique', image: ESTELLE_IMAGE, accent: '#b57f5e', tag: 'Beauté' },
  { id: 8, name: 'Boissons & douceurs', category: 'Boissons', description: 'Boissons, gourmandises et produits à découvrir en rayon.', status: 'Large choix', image: MARKET_IMAGE, accent: '#8f352c', tag: 'À découvrir' },
]

const categories = ['Tous', 'Fruits & légumes', 'Épicerie', 'Surgelés', 'Cosmétiques', 'Boissons']
const validProductIds = new Set(products.map(product => product.id))

const hours: Record<number, Array<[number, number]>> = {
  2: [[600, 750], [870, 1200]],
  3: [[885, 1200]],
  4: [[600, 750], [870, 1200]],
  5: [[645, 1200]],
  6: [[645, 1200]],
}

function handleImageError(event: SyntheticEvent<HTMLImageElement>) {
  const image = event.currentTarget
  if (image.dataset.fallback === '1') return
  image.dataset.fallback = '1'
  image.removeAttribute('srcset')
  image.src = FALLBACK_IMAGE
}

function getShopStatus(date = new Date()) {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date)
  const weekday = parts.find(p => p.type === 'weekday')?.value.toLowerCase() ?? ''
  const hour = Number(parts.find(p => p.type === 'hour')?.value ?? 0)
  const minute = Number(parts.find(p => p.type === 'minute')?.value ?? 0)
  const dayMap: Record<string, number> = { lun: 1, mar: 2, mer: 3, jeu: 4, ven: 5, sam: 6, dim: 7 }
  const day = dayMap[weekday.slice(0, 3)] ?? 1
  const now = hour * 60 + minute
  const slots = hours[day] ?? []
  const active = slots.find(([start, end]) => now >= start && now < end)
  if (active) {
    const endH = Math.floor(active[1] / 60)
    const endM = active[1] % 60
    return { open: true, label: `Ouvert jusqu’à ${endH}h${endM ? String(endM).padStart(2, '0') : ''}` }
  }
  const later = slots.find(([start]) => now < start)
  if (later) {
    const startH = Math.floor(later[0] / 60)
    const startM = later[0] % 60
    return { open: false, label: `Ouvre aujourd’hui à ${startH}h${startM ? String(startM).padStart(2, '0') : ''}` }
  }
  const labels: Record<number, string> = { 1: 'lundi', 2: 'mardi', 3: 'mercredi', 4: 'jeudi', 5: 'vendredi', 6: 'samedi', 7: 'dimanche' }
  for (let offset = 1; offset <= 7; offset++) {
    const nextDay = ((day - 1 + offset) % 7) + 1
    const nextSlots = hours[nextDay]
    if (nextSlots?.length) {
      const start = nextSlots[0][0]
      const startH = Math.floor(start / 60)
      const startM = start % 60
      return { open: false, label: `Ouvre ${labels[nextDay]} à ${startH}h${startM ? String(startM).padStart(2, '0') : ''}` }
    }
  }
  return { open: false, label: 'Fermé' }
}

function useShopStatus() {
  const [status, setStatus] = useState(() => getShopStatus())
  useEffect(() => {
    const timer = window.setInterval(() => setStatus(getShopStatus()), 60000)
    return () => window.clearInterval(timer)
  }, [])
  return status
}

function readStoredList(): ListState {
  try {
    const parsed = JSON.parse(window.localStorage.getItem('afrotarn-list') || '{}') as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const safe: ListState = {}
    for (const [key, rawQty] of Object.entries(parsed)) {
      const id = Number(key)
      const qty = Math.floor(Number(rawQty))
      if (validProductIds.has(id) && Number.isFinite(qty) && qty > 0) safe[id] = Math.min(qty, 99)
    }
    return safe
  } catch {
    return {}
  }
}

function usePersistentList() {
  const [list, setList] = useState<ListState>(readStoredList)
  useEffect(() => {
    try {
      window.localStorage.setItem('afrotarn-list', JSON.stringify(list))
    } catch {
      // Storage may be unavailable in private/restricted browser contexts.
    }
  }, [list])
  const add = (id: number) => setList(current => ({ ...current, [id]: Math.min((current[id] || 0) + 1, 99) }))
  const remove = (id: number) => setList(current => {
    const next = { ...current }
    const qty = (next[id] || 0) - 1
    if (qty <= 0) delete next[id]
    else next[id] = qty
    return next
  })
  const clear = () => setList({})
  const count = Object.values(list).reduce((sum, qty) => sum + qty, 0)
  return { list, add, remove, clear, count }
}

function ScrollManager() {
  const { pathname, hash } = useLocation()
  const reduced = useReducedMotion()
  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, behavior: 'auto' })
      return
    }
    const timer = window.setTimeout(() => {
      try {
        const id = decodeURIComponent(hash.slice(1))
        document.getElementById(id)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
      } catch {
        window.scrollTo({ top: 0, behavior: 'auto' })
      }
    }, 80)
    return () => window.clearTimeout(timer)
  }, [pathname, hash, reduced])
  return null
}

function Wordmark() {
  return (
    <Link to="/" className="wordmark" aria-label="AfroTarn accueil">
      <span className="wordmark-seal"><span>AT</span></span>
      <span className="wordmark-copy"><strong>AFROTARN</strong><small>GAILLAC · ÉPICERIE & CULTURE</small></span>
    </Link>
  )
}

function StatusPill() {
  const status = useShopStatus()
  return <span className={`status-pill ${status.open ? 'is-open' : ''}`}><i />{status.label}</span>
}

function Layout({ children, listCount }: { children: ReactNode; listCount: number }) {
  const [open, setOpen] = useState(false)
  const [compact, setCompact] = useState(false)
  const location = useLocation()
  useEffect(() => setOpen(false), [location.pathname])
  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 18)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <div className="site-shell">
      <ScrollManager />
      <header className={`site-header ${compact ? 'is-compact' : ''}`}>
        <Wordmark />
        <div className="desktop-status"><StatusPill /></div>
        <nav className="desktop-nav" aria-label="Navigation principale">
          <NavLink to="/">Accueil</NavLink>
          <NavLink to="/produits">Produits</NavLink>
          <NavLink to="/click-collect">Retrait</NavLink>
          <a href={shop.map}>La boutique</a>
        </nav>
        <Link className="header-list" to="/click-collect#liste"><ShoppingBag size={17} /><span>Ma liste</span>{listCount > 0 && <b>{listCount}</b>}</Link>
        <button className="mobile-menu-button" onClick={() => setOpen(v => !v)} aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={open}>
          {open ? <X size={23} /> : <Menu size={23} />}
        </button>
        <AnimatePresence>
          {open && (
            <motion.div className="mobile-panel" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: .22 }}>
              <div className="mobile-panel-top"><StatusPill /></div>
              <NavLink to="/">Accueil <ChevronRight size={18} /></NavLink>
              <NavLink to="/produits">Explorer les produits <ChevronRight size={18} /></NavLink>
              <NavLink to="/click-collect">Préparer un retrait <ChevronRight size={18} /></NavLink>
              <a href={shop.map}>Itinéraire <ChevronRight size={18} /></a>
              <a href={`tel:${shop.phoneHref}`}>Appeler la boutique <ChevronRight size={18} /></a>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="page-stage">{children}</main>

      <footer className="site-footer">
        <div className="footer-grid">
          <div className="footer-brand"><Wordmark /><p>Une épicerie de proximité pour découvrir, retrouver et cuisiner les saveurs d’Afrique à Gaillac.</p></div>
          <div><span className="footer-label">Boutique</span><p>{shop.address}</p><a href={shop.map}>Voir l’itinéraire <ArrowRight size={15} /></a></div>
          <div><span className="footer-label">Contact</span><a href={`tel:${shop.phoneHref}`}>{shop.phone}</a><a href={`mailto:${shop.email}`}>{shop.email}</a></div>
          <div><span className="footer-label">Parcours rapide</span><Link to="/produits">Trouver un produit</Link><Link to="/click-collect">Préparer un retrait</Link><a href={shop.map}>Venir en boutique</a></div>
        </div>
        <div className="footer-bottom"><span>© 2026 AfroTarn</span><span>Gaillac · Tarn</span></div>
      </footer>

      <nav className="mobile-dock" aria-label="Navigation rapide">
        <NavLink to="/" end><Store size={19} /><span>Accueil</span></NavLink>
        <NavLink to="/produits"><Search size={19} /><span>Produits</span></NavLink>
        <NavLink className="dock-list" to="/click-collect#liste"><ShoppingBag size={19} /><span>Ma liste</span>{listCount > 0 && <b>{listCount}</b>}</NavLink>
        <a className="dock-primary" href={shop.map}><MapPin size={19} /><span>Venir</span></a>
      </nav>
    </div>
  )
}

function ParallaxHero() {
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 700], [0, 80])
  const scale = useTransform(scrollY, [0, 700], [1.035, 1.09])
  const reduced = useReducedMotion()
  return (
    <section className="home-hero">
      <div className="hero-media">
        <motion.img style={reduced ? undefined : { y, scale }} src={ESTELLE_IMAGE} alt="Estelle devant la boutique AfroTarn" onError={handleImageError} decoding="async" fetchPriority="high" />
        <div className="hero-shade" />
        <div className="hero-photo-tag"><span className="live-dot" /> 70 rue du Château du Roi</div>
      </div>
      <motion.div className="hero-copy" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7, ease: [0.22, 1, 0.36, 1] }}>
        <div className="hero-topline"><span className="kicker">ÉPICERIE AFRICAINE · GAILLAC</span><StatusPill /></div>
        <h1>Les saveurs d’Afrique, <em>sans détour.</em></h1>
        <p>Vous cherchez un produit précis, une idée de recette ou simplement une bonne adresse ? AfroTarn vous guide jusqu’au bon rayon.</p>
        <div className="hero-actions">
          <Link className="button button-dark" to="/produits">Trouver un produit <ArrowRight size={18} /></Link>
          <a className="button button-ghost" href={shop.map}><MapPin size={18} /> Venir en boutique</a>
        </div>
        <div className="hero-proof">
          <div className="stars"><Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /></div>
          <div><strong>5,0 / 5</strong><span>Une adresse appréciée à Gaillac</span></div>
        </div>
      </motion.div>
    </section>
  )
}

function IntentBar() {
  const intents = [
    { icon: Search, eyebrow: 'JE CHERCHE', title: 'Un produit précis', text: 'Rechercher par nom ou catégorie.', to: '/produits' },
    { icon: ShoppingBag, eyebrow: 'JE PRÉPARE', title: 'Un retrait', text: 'Créer une liste avant de venir.', to: '/click-collect' },
    { icon: MapPin, eyebrow: 'JE VIENS', title: 'À la boutique', text: 'Adresse, horaires et itinéraire.', href: shop.map },
  ]
  return (
    <section className="intent-shell section" aria-label="Choisir votre parcours">
      {intents.map(item => {
        const Icon = item.icon
        const content = <><span className="intent-icon"><Icon size={20} /></span><div><small>{item.eyebrow}</small><strong>{item.title}</strong><p>{item.text}</p></div><ArrowRight size={18} className="intent-arrow" /></>
        return item.to ? <Link key={item.title} className="intent-card" to={item.to}>{content}</Link> : <a key={item.title} className="intent-card" href={item.href}>{content}</a>
      })}
    </section>
  )
}

function Home({ addToList }: { addToList: (id: number) => void }) {
  return (
    <>
      <ParallaxHero />
      <IntentBar />

      <section className="section home-products">
        <motion.div className="section-intro" initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .25 }} transition={{ duration: .65 }}>
          <span className="kicker">COMMENCER SIMPLEMENT</span>
          <h2>Les produits que l’on vient chercher <span>le plus souvent.</span></h2>
          <p>Une première sélection pour aller droit au but. Le catalogue sera enrichi progressivement avec les références réelles du magasin.</p>
        </motion.div>
        <div className="home-product-grid">
          {products.slice(0, 4).map((product, index) => <ProductCard key={product.id} product={product} compact addToList={addToList} index={index} />)}
        </div>
        <div className="center-action"><Link className="text-link" to="/produits">Voir tous les produits <ArrowRight size={17} /></Link></div>
      </section>

      <section className="section estelle-story">
        <motion.div className="story-photo" initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: .2 }} transition={{ duration: .75 }}><img src={ESTELLE_IMAGE} alt="Estelle, gérante d’AfroTarn" loading="lazy" decoding="async" onError={handleImageError} /><span className="photo-index">01</span></motion.div>
        <motion.div className="story-copy" initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: .2 }} transition={{ duration: .75, delay: .08 }}>
          <span className="kicker">ESTELLE · « ESTOU »</span>
          <h2>Le conseil fait partie du produit.</h2>
          <p className="story-lead">AfroTarn est une boutique où l’on peut aussi demander : « Comment ça se prépare ? », « Avec quoi je le cuisine ? » ou « Quel produit choisir ? ».</p>
          <p>Une recette à retrouver, un produit découvert en voyage, une sauce à associer, un soin à choisir : Estelle accompagne, explique et transmet.</p>
          <div className="story-actions"><a className="text-link" href={`tel:${shop.phoneHref}`}>Demander un conseil <ArrowRight size={17} /></a></div>
        </motion.div>
      </section>

      <section className="section shop-experience">
        <motion.div className="experience-copy" initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .2 }} transition={{ duration: .65 }}>
          <span className="kicker">EN BOUTIQUE</span>
          <h2>Tout ce qu’il faut, sans perdre de temps.</h2>
          <p>Le site prépare la visite : vous repérez les produits, créez votre liste et vérifiez les informations pratiques avant de vous déplacer.</p>
          <div className="experience-features">
            <Feature icon={Search} title="Trouver vite" text="Recherche instantanée et catégories simples." />
            <Feature icon={ShoppingBag} title="Préparer sa liste" text="Gardez vos produits pour votre prochain retrait." />
            <Feature icon={Sparkles} title="Demander conseil" text="Estelle reste au centre de l’expérience." />
          </div>
        </motion.div>
        <motion.div className="experience-media" initial={{ opacity: 0, scale: .97 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, amount: .2 }} transition={{ duration: .75 }}><img src={MARKET_IMAGE} alt="Ambiance d’une épicerie africaine" loading="lazy" decoding="async" onError={handleImageError} /><div className="image-caption"><span>Épicerie</span><strong>Des essentiels aux découvertes.</strong></div></motion.div>
      </section>

      <section className="section practical-section">
        <motion.div className="practical-card practical-main" initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div><span className="kicker light">INFOS PRATIQUES</span><h2>On vous attend à Gaillac.</h2><StatusPill /></div>
          <div className="practical-address"><MapPin size={24} /><div><strong>70 rue du Château du Roi</strong><span>81600 Gaillac</span></div></div>
          <div className="practical-actions"><a className="button button-light" href={shop.map}>Itinéraire <ArrowRight size={17} /></a><a className="button button-outline-light" href={`tel:${shop.phoneHref}`}>Appeler</a></div>
        </motion.div>
        <motion.div className="practical-card hours-card" initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: .08 }}>
          <div className="hours-title"><Clock3 size={22} /><h3>Horaires</h3></div>
          <div className="hours-list"><div><span>Mar</span><strong>10h–12h30 · 14h30–20h</strong></div><div><span>Mer</span><strong>14h45–20h</strong></div><div><span>Jeu</span><strong>10h–12h30 · 14h30–20h</strong></div><div><span>Ven</span><strong>10h45–20h</strong></div><div><span>Sam</span><strong>10h45–20h</strong></div><div className="closed"><span>Lun & Dim</span><strong>Fermé</strong></div></div>
        </motion.div>
      </section>
    </>
  )
}

function ProductCard({ product, addToList, compact = false, index = 0, onOpen }: { product: Product; addToList: (id: number) => void; compact?: boolean; index?: number; onOpen?: (product: Product) => void }) {
  return (
    <motion.article className={`product-card ${compact ? 'is-compact-card' : ''}`} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .12 }} transition={{ duration: .55, delay: Math.min(index * .05, .2) }} whileHover={{ y: -4 }}>
      <button className="product-visual" onClick={() => onOpen?.(product)} aria-label={`Voir ${product.name}`} style={{ '--accent': product.accent } as React.CSSProperties}>
        <img src={product.image} alt="" loading="lazy" decoding="async" onError={handleImageError} />
        <span className="product-tag">{product.tag}</span>
      </button>
      <div className="product-body">
        <div className="product-topline"><span>{product.category}</span><i>{product.status}</i></div>
        <button className="product-title" onClick={() => onOpen?.(product)}><h3>{product.name}</h3></button>
        <p>{product.description}</p>
        <div className="product-actions"><button className="add-button" onClick={() => addToList(product.id)}><Plus size={17} /> Ajouter à ma liste</button>{onOpen && <button className="icon-button" onClick={() => onOpen(product)} aria-label="Voir le détail"><ArrowRight size={17} /></button>}</div>
      </div>
    </motion.article>
  )
}

function ProductSheet({ product, onClose, addToList }: { product: Product | null; onClose: () => void; addToList: (id: number) => void }) {
  useEffect(() => {
    if (!product) return
    const old = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = old
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [product, onClose])
  return (
    <AnimatePresence>
      {product && <>
        <motion.button className="sheet-backdrop" aria-label="Fermer" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
        <motion.aside className="product-sheet" role="dialog" aria-modal="true" aria-label={`Détails de ${product.name}`} initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}>
          <button className="sheet-close" onClick={onClose} aria-label="Fermer"><X size={20} /></button>
          <div className="sheet-image"><img src={product.image} alt={product.name} decoding="async" onError={handleImageError} /></div>
          <div className="sheet-content"><span className="kicker">{product.category}</span><h2>{product.name}</h2><span className="availability"><i />{product.status}</span><p>{product.description}</p><div className="sheet-tip"><Sparkles size={18} /><div><strong>Besoin d’un conseil ?</strong><span>Estelle peut vous guider sur l’usage et la préparation.</span></div></div><button className="button button-dark full" onClick={() => { addToList(product.id); onClose() }}><Plus size={18} /> Ajouter à ma liste</button><a className="button button-ghost full" href={`tel:${shop.phoneHref}`}><Phone size={18} /> Appeler AfroTarn</a></div>
        </motion.aside>
      </>}
    </AnimatePresence>
  )
}

function Products({ addToList, listCount }: { addToList: (id: number) => void; listCount: number }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Tous')
  const [selected, setSelected] = useState<Product | null>(null)
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return products.filter(product => (category === 'Tous' || product.category === category) && (!normalized || `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(normalized)))
  }, [query, category])

  return (
    <div className="catalog-page">
      <section className="section catalog-hero">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .55 }}><span className="kicker">CATALOGUE AFROTARN</span><h1>Trouvez d’abord. <em>Venez ensuite.</em></h1></motion.div>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .15 }}>Le catalogue est pensé pour préparer votre visite : recherchez un produit, gardez-le dans votre liste, puis confirmez sa disponibilité si besoin.</motion.p>
      </section>

      <section className="catalog-tools-wrap">
        <div className="section catalog-tools">
          <label className="catalog-search"><Search size={20} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher : plantain, manioc, karité…" autoComplete="off" aria-label="Rechercher un produit" />{query && <button onClick={() => setQuery('')} aria-label="Effacer"><X size={18} /></button>}</label>
          <div className="category-scroll" role="tablist" aria-label="Catégories">{categories.map(item => <button key={item} role="tab" aria-selected={item === category} className={item === category ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div>
        </div>
      </section>

      <section className="section catalog-content">
        <div className="results-line" aria-live="polite"><span><strong>{filtered.length}</strong> résultat{filtered.length > 1 ? 's' : ''}</span>{listCount > 0 && <Link to="/click-collect#liste">Ma liste · {listCount} produit{listCount > 1 ? 's' : ''} <ArrowRight size={15} /></Link>}</div>
        {filtered.length > 0 ? <div className="product-grid">{filtered.map((product, index) => <ProductCard key={product.id} product={product} addToList={addToList} index={index} onOpen={setSelected} />)}</div> : <div className="empty-results"><Search size={30} /><h3>Aucun produit trouvé</h3><p>Essayez un autre mot-clé ou appelez la boutique : Estelle pourra vous renseigner.</p><a className="button button-dark" href={`tel:${shop.phoneHref}`}>Appeler la boutique</a></div>}
      </section>
      <ProductSheet product={selected} onClose={() => setSelected(null)} addToList={addToList} />
      <AnimatePresence>{listCount > 0 && <motion.div className="floating-list" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}><div><ShoppingBag size={18} /><span><strong>{listCount}</strong> dans ma liste</span></div><Link to="/click-collect#liste">Continuer <ArrowRight size={16} /></Link></motion.div>}</AnimatePresence>
    </div>
  )
}

function ClickCollect({ list, add, remove, clear }: { list: ListState; add: (id: number) => void; remove: (id: number) => void; clear: () => void }) {
  const [paymentChoice, setPaymentChoice] = useState<PaymentChoice | null>(null)
  const selected = products.filter(product => list[product.id])
  const count = selected.reduce((sum, product) => sum + (list[product.id] || 0), 0)
  const paymentLabel = paymentChoice === 'apple' ? 'Apple Pay' : paymentChoice === 'google' ? 'Google Pay' : paymentChoice === 'card' ? 'Carte bancaire' : 'À choisir'
  const subject = encodeURIComponent('Demande de retrait AfroTarn')
  const body = encodeURIComponent(`Bonjour AfroTarn,\n\nJe souhaite vérifier la disponibilité des produits suivants :\n${selected.map(product => `- ${product.name} x${list[product.id]}`).join('\n')}\n\nPréférence de paiement : ${paymentLabel}.\n\nMerci de me confirmer la disponibilité et le retrait en boutique.\n`)
  const mailto = `mailto:${shop.email}?subject=${subject}&body=${body}`

  useEffect(() => {
    if (!count) setPaymentChoice(null)
  }, [count])

  return (
    <div className="click-page">
      <section className="click-hero section">
        <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}><span className="kicker">RETRAIT EN BOUTIQUE</span><h1>Préparez votre visite. <em>On s’occupe du reste.</em></h1><p>Sélectionnez vos produits, choisissez votre futur moyen de paiement, puis envoyez la demande à AfroTarn pour confirmation avant le retrait.</p></motion.div>
        <div className="journey-steps">
          <div className={count ? 'done' : 'active'}><span>1</span><strong>Je sélectionne</strong><small>{count ? `${count} produit${count > 1 ? 's' : ''}` : 'Ma liste'}</small></div>
          <div className={paymentChoice ? 'done' : count ? 'active' : ''}><span>2</span><strong>Je choisis le paiement</strong><small>{paymentChoice ? paymentLabel : 'Apple Pay · Google Pay · Carte'}</small></div>
          <div className={paymentChoice ? 'active' : ''}><span>3</span><strong>AfroTarn confirme</strong><small>Disponibilité</small></div>
          <div><span>4</span><strong>Je retire</strong><small>En boutique</small></div>
        </div>
      </section>

      <section className="section list-layout" id="liste">
        <div className="list-panel">
          <div className="list-panel-head"><div><span className="kicker">1 · MA SÉLECTION</span><h2>{count ? `${count} produit${count > 1 ? 's' : ''} sélectionné${count > 1 ? 's' : ''}` : 'Votre liste est vide'}</h2></div>{count > 0 && <button className="clear-button" onClick={clear}>Vider</button>}</div>
          {selected.length ? (
            <>
              <div className="list-items">{selected.map(product => <div className="list-item" key={product.id}><img src={product.image} alt="" loading="lazy" decoding="async" onError={handleImageError} /><div className="list-copy"><strong>{product.name}</strong><span>{product.status}</span></div><div className="qty-control"><button onClick={() => remove(product.id)} aria-label={`Retirer un ${product.name}`}><Minus size={16} /></button><b>{list[product.id]}</b><button onClick={() => add(product.id)} aria-label={`Ajouter un ${product.name}`}><Plus size={16} /></button></div></div>)}</div>

              <motion.div className="checkout-payment-step" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
                <div className="checkout-payment-head">
                  <div><span className="kicker">2 · PAIEMENT</span><strong>Comment souhaitez-vous payer ?</strong><p>Choisissez déjà votre préférence. L’encaissement Stripe sera activé dans une prochaine étape.</p></div>
                  <span>Préparation</span>
                </div>
                <div className="checkout-payment-methods" role="radiogroup" aria-label="Choisir un moyen de paiement">
                  <button type="button" role="radio" aria-checked={paymentChoice === 'apple'} className={`checkout-payment-method apple ${paymentChoice === 'apple' ? 'is-selected' : ''}`} onClick={() => setPaymentChoice('apple')}>Apple Pay</button>
                  <button type="button" role="radio" aria-checked={paymentChoice === 'google'} className={`checkout-payment-method google ${paymentChoice === 'google' ? 'is-selected' : ''}`} onClick={() => setPaymentChoice('google')}>Google Pay</button>
                  <button type="button" role="radio" aria-checked={paymentChoice === 'card'} className={`checkout-payment-method card ${paymentChoice === 'card' ? 'is-selected' : ''}`} onClick={() => setPaymentChoice('card')}><CreditCard size={18} /> Carte bancaire</button>
                </div>
                <div className="checkout-payment-note"><BadgeCheck size={15} /><span>Aucun débit n’est effectué actuellement. Cette sélection prépare le futur paiement sécurisé Stripe.</span></div>
              </motion.div>
            </>
          ) : <div className="empty-list"><ShoppingBag size={32} /><p>Commencez par ajouter les produits que vous souhaitez trouver ou réserver.</p><Link className="button button-dark" to="/produits">Explorer les produits</Link></div>}
        </div>

        <aside className="confirmation-card">
          <span className="kicker light">3 · CONFIRMATION</span>
          <h2>Finaliser la demande</h2>
          <p>Les stocks magasin peuvent évoluer dans la journée. Une confirmation d’AfroTarn reste nécessaire avant de venir retirer la commande.</p>
          <div className="confirmation-points"><div><BadgeCheck size={19} /><span>Votre sélection est reprise automatiquement.</span></div><div><Clock3 size={19} /><span>AfroTarn confirme la disponibilité avant votre déplacement.</span></div><div><MapPin size={19} /><span>Retrait au 70 rue du Château du Roi.</span></div></div>
          {count > 0 && <div className="selected-payment-summary"><span>Mode de paiement prévu</span><strong>{paymentLabel}</strong></div>}
          {count > 0 && paymentChoice ? <a className="button button-light full" href={mailto}><Mail size={18} /> Finaliser ma demande</a> : count > 0 ? <a className="button button-light full is-disabled" aria-disabled="true"><CreditCard size={18} /> Choisir le paiement d’abord</a> : <Link className="button button-light full" to="/produits"><Search size={18} /> Choisir mes produits</Link>}
          <a className="button button-outline-light full" href={`tel:${shop.phoneHref}`}><Phone size={18} /> Appeler directement</a>
          <small className="confirmation-note">Apple Pay, Google Pay et carte bancaire sont affichés pour préparer le parcours. Aucun paiement réel n’est encore encaissé tant que Stripe n’est pas connecté.</small>
        </aside>
      </section>
    </div>
  )
}

function Feature({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return <div className="feature"><Icon /><div><strong>{title}</strong><span>{text}</span></div></div>
}

function Admin() {
  return <section className="section admin-page"><div className="admin-title"><span className="kicker">ESPACE DE GESTION · PROTOTYPE</span><h1>Administration AfroTarn</h1><p>La prochaine étape sera de connecter cet espace à Supabase pour gérer les vrais produits, stocks, disponibilités et demandes de retrait.</p></div><div className="admin-preview"><div className="admin-stat"><span>Produits</span><strong>08</strong><small>Catalogue démo</small></div><div className="admin-stat"><span>Liste client</span><strong>✓</strong><small>Active côté navigateur</small></div><div className="admin-stat"><span>Base de données</span><strong>—</strong><small>À connecter</small></div></div></section>
}

export default function App() {
  const location = useLocation()
  const { list, add, remove, clear, count } = usePersistentList()
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: .35, ease: [0.22, 1, 0.36, 1] }}>
      <Layout listCount={count}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={location.pathname} className="route-transition" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .28 }}>
            <Routes location={location}>
              <Route path="/" element={<Home addToList={add} />} />
              <Route path="/produits" element={<Products addToList={add} listCount={count} />} />
              <Route path="/click-collect" element={<ClickCollect list={list} add={add} remove={remove} clear={clear} />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </Layout>
    </MotionConfig>
  )
}
