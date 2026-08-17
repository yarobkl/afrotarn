import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  CreditCard,
  Heart,
  Mail,
  MapPin,
  Menu,
  Minus,
  PackageCheck,
  Phone,
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
}

const products: Product[] = [
  { id: 1, name: 'Plantain', category: 'Fruits & légumes', description: 'Vert ou mûr, pour alloco, banane frite et recettes du quotidien.', status: 'Disponible en boutique', image: PLANTAIN_IMAGE, accent: '#d6a75f' },
  { id: 2, name: 'Manioc', category: 'Fruits & légumes', description: 'Un incontournable à cuisiner bouilli, frit ou transformé.', status: 'Selon arrivage', image: PRODUCE_IMAGE, accent: '#9c6844' },
  { id: 3, name: 'Attiéké', category: 'Épicerie', description: 'Semoule de manioc, idéale avec poisson, poulet ou légumes.', status: 'Disponible en boutique', image: MARKET_IMAGE, accent: '#e6c88c' },
  { id: 4, name: 'Épices & sauces', category: 'Épicerie', description: 'Des bases parfumées pour retrouver les goûts de la maison.', status: 'Large choix', image: MARKET_IMAGE, accent: '#c75234' },
  { id: 5, name: 'Poissons', category: 'Surgelés', description: 'Tilapia et références sélectionnées selon les arrivages.', status: 'Selon arrivage', image: MARKET_IMAGE, accent: '#566b75' },
  { id: 6, name: 'Saka-saka & feuilles', category: 'Surgelés', description: 'Feuilles et légumes africains prêts à cuisiner.', status: 'Disponible en boutique', image: PRODUCE_IMAGE, accent: '#477658' },
  { id: 7, name: 'Karité & soins', category: 'Cosmétiques', description: 'Soins nourrissants et hydratants pour la peau et les cheveux.', status: 'Disponible en boutique', image: ESTELLE_IMAGE, accent: '#b57f5e' },
  { id: 8, name: 'Boissons & douceurs', category: 'Boissons', description: 'Boissons, gourmandises et produits à découvrir en rayon.', status: 'Large choix', image: MARKET_IMAGE, accent: '#8f352c' },
]

const categories = ['Tous', 'Fruits & légumes', 'Épicerie', 'Surgelés', 'Cosmétiques', 'Boissons']

function useReveal() {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))
    const observer = new IntersectionObserver(
      entries => entries.forEach(entry => entry.isIntersecting && entry.target.classList.add('is-visible')),
      { threshold: 0.12, rootMargin: '0px 0px -40px' },
    )
    elements.forEach(element => observer.observe(element))
    return () => observer.disconnect()
  })
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }), [pathname])
  return null
}

function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return <div className={`reveal ${className}`} data-reveal style={{ '--delay': `${delay}ms` } as React.CSSProperties}>{children}</div>
}

function Wordmark() {
  return (
    <Link to="/" className="wordmark" aria-label="AfroTarn accueil">
      <span className="wordmark-seal"><span>AT</span></span>
      <span className="wordmark-copy"><strong>AFROTARN</strong><small>GAILLAC · ÉPICERIE & CULTURE</small></span>
    </Link>
  )
}

function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  useReveal()

  useEffect(() => setOpen(false), [location.pathname])

  return (
    <div className="site-shell">
      <ScrollToTop />
      <header className="site-header">
        <Wordmark />
        <nav className="desktop-nav" aria-label="Navigation principale">
          <NavLink to="/">Accueil</NavLink>
          <NavLink to="/produits">Produits</NavLink>
          <NavLink to="/click-collect">Click & Collect</NavLink>
          <a href={shop.map}>La boutique</a>
        </nav>
        <a className="header-cta" href={`tel:${shop.phoneHref}`}><Phone size={16} /> Appeler</a>
        <button className="mobile-menu-button" onClick={() => setOpen(v => !v)} aria-label="Ouvrir le menu">
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
        <div className={`mobile-panel ${open ? 'is-open' : ''}`}>
          <NavLink to="/">Accueil</NavLink>
          <NavLink to="/produits">Nos produits</NavLink>
          <NavLink to="/click-collect">Click & Collect</NavLink>
          <a href={shop.map}>Itinéraire</a>
          <a href={`tel:${shop.phoneHref}`}>Appeler la boutique</a>
        </div>
      </header>

      <main>{children}</main>

      <footer className="site-footer">
        <div className="footer-grid">
          <div className="footer-brand"><Wordmark /><p>Une épicerie de proximité pour découvrir, retrouver et cuisiner les saveurs d’Afrique à Gaillac.</p></div>
          <div><span className="footer-label">Boutique</span><p>{shop.address}</p><a href={shop.map}>Voir l’itinéraire <ArrowRight size={15} /></a></div>
          <div><span className="footer-label">Contact</span><a href={`tel:${shop.phoneHref}`}>{shop.phone}</a><a href={`mailto:${shop.email}`}>{shop.email}</a></div>
          <div><span className="footer-label">Navigation</span><Link to="/produits">Produits</Link><Link to="/click-collect">Click & Collect</Link><Link to="/admin">Administration</Link></div>
        </div>
        <div className="footer-bottom"><span>© 2026 AfroTarn</span><span>Gaillac · Tarn</span></div>
      </footer>

      <nav className="mobile-dock" aria-label="Actions rapides">
        <a href={`tel:${shop.phoneHref}`}><Phone size={19} /><span>Appeler</span></a>
        <Link to="/produits"><Search size={19} /><span>Produits</span></Link>
        <a className="dock-primary" href={shop.map}><MapPin size={19} /><span>Venir</span></a>
      </nav>
    </div>
  )
}

function Home() {
  return (
    <>
      <section className="home-hero">
        <div className="hero-media">
          <img src={ESTELLE_IMAGE} alt="Estelle devant la boutique AfroTarn" />
          <div className="hero-shade" />
          <div className="hero-photo-tag"><span className="live-dot" /> À Gaillac, rue du Château du Roi</div>
        </div>
        <div className="hero-copy">
          <span className="kicker">ÉPICERIE AFRICAINE · GAILLAC</span>
          <h1>Les produits qui racontent <em>une histoire.</em></h1>
          <p>Chez AfroTarn, on vient pour trouver un produit. On revient pour les conseils, les recettes et l’accueil d’Estelle.</p>
          <div className="hero-actions">
            <Link className="button button-dark" to="/produits">Explorer les produits <ArrowRight size={18} /></Link>
            <a className="button button-ghost" href={shop.map}><MapPin size={18} /> Venir en boutique</a>
          </div>
          <div className="hero-proof">
            <div className="stars"><Star size={17} fill="currentColor" /><Star size={17} fill="currentColor" /><Star size={17} fill="currentColor" /><Star size={17} fill="currentColor" /><Star size={17} fill="currentColor" /></div>
            <div><strong>5,0 / 5</strong><span>Une adresse appréciée à Gaillac</span></div>
          </div>
        </div>
      </section>

      <Reveal className="marquee-wrap">
        <div className="marquee-track">
          <span>PLANTAINS</span><i /> <span>MANIOC</span><i /> <span>ATTIEKE</span><i /> <span>EPICES</span><i /> <span>POISSONS</span><i /> <span>KARITE</span><i /> <span>SAKA-SAKA</span><i /> <span>IGNAMES</span>
        </div>
      </Reveal>

      <section className="section editorial-section">
        <Reveal className="section-intro">
          <span className="kicker">UNE ÉPICERIE À EXPLORER</span>
          <h2>Pas des rayons anonymes. <span>Des produits à comprendre.</span></h2>
          <p>Frais, sec, surgelé, cosmétique : la sélection s’organise par usages, envies et découvertes.</p>
        </Reveal>
        <div className="editorial-grid">
          <Reveal className="editorial-card editorial-large" delay={60}>
            <img src={PLANTAIN_IMAGE} alt="Plantains et produits d’épicerie africaine" loading="lazy" />
            <div className="editorial-overlay"><span>Frais & essentiels</span><h3>Les incontournables du quotidien</h3><Link to="/produits">Voir la sélection <ArrowRight size={17} /></Link></div>
          </Reveal>
          <Reveal className="editorial-card editorial-small" delay={120}>
            <img src={PRODUCE_IMAGE} alt="Manioc et produits frais" loading="lazy" />
            <div className="editorial-overlay"><span>Primeur</span><h3>Manioc, ignames, piments</h3></div>
          </Reveal>
          <Reveal className="editorial-card editorial-small dark-card" delay={180}>
            <div className="pattern-orb" />
            <span className="kicker light">SERVICE</span>
            <h3>Vous ne connaissez pas un produit ?</h3>
            <p>Demandez à Estelle. L’usage, la cuisson et les associations font partie de l’expérience.</p>
            <a href={`tel:${shop.phoneHref}`}>Appeler la boutique <ArrowRight size={17} /></a>
          </Reveal>
        </div>
      </section>

      <section className="section estelle-story">
        <Reveal className="story-photo"><img src={ESTELLE_IMAGE} alt="Estelle, gérante d’AfroTarn" loading="lazy" /><span className="photo-index">01</span></Reveal>
        <Reveal className="story-copy" delay={120}>
          <span className="kicker">ESTELLE · « ESTOU »</span>
          <h2>Le conseil fait partie du produit.</h2>
          <p className="story-lead">AfroTarn est née avec une idée simple : rendre les cuisines africaines plus accessibles, même quand on ne connaît pas encore les ingrédients.</p>
          <p>Une recette à retrouver, un produit découvert en voyage, une sauce à associer, un soin à choisir : Estelle accompagne, explique et transmet.</p>
          <div className="story-signature"><span>ESTOU</span><small>AfroTarn · Gaillac</small></div>
        </Reveal>
      </section>

      <section className="section shop-experience">
        <Reveal className="experience-copy">
          <span className="kicker">EN BOUTIQUE</span>
          <h2>Petit format. Grande richesse.</h2>
          <p>Une adresse de quartier, dense en références, où chaque rayon ouvre une porte vers une cuisine, une habitude ou un souvenir.</p>
          <div className="experience-features">
            <Feature icon={ShoppingBag} title="À emporter" text="Choisissez sur place, repartez avec vos produits." />
            <Feature icon={CreditCard} title="Paiement facile" text="Espèces, sans contact et Visa." />
            <Feature icon={Sparkles} title="Conseils personnalisés" text="Produits, recettes, soins et usages." />
          </div>
        </Reveal>
        <Reveal className="experience-media" delay={100}><img src={MARKET_IMAGE} alt="Ambiance d’une épicerie africaine" loading="lazy" /><div className="image-caption"><span>Épicerie</span><strong>Des essentiels aux découvertes.</strong></div></Reveal>
      </section>

      <section className="section practical-section">
        <Reveal className="practical-card practical-main">
          <div><span className="kicker">INFOS PRATIQUES</span><h2>On vous attend à Gaillac.</h2></div>
          <div className="practical-address"><MapPin size={24} /><div><strong>70 rue du Château du Roi</strong><span>81600 Gaillac</span></div></div>
          <div className="practical-actions"><a className="button button-light" href={shop.map}>Itinéraire <ArrowRight size={17} /></a><a className="button button-outline-light" href={`tel:${shop.phoneHref}`}>Appeler</a></div>
        </Reveal>
        <Reveal className="practical-card hours-card" delay={80}>
          <div className="hours-title"><Clock3 size={22} /><h3>Horaires</h3></div>
          <div className="hours-list"><div><span>Mar</span><strong>10h–12h30 · 14h30–20h</strong></div><div><span>Mer</span><strong>14h45–20h</strong></div><div><span>Jeu</span><strong>10h–12h30 · 14h30–20h</strong></div><div><span>Ven</span><strong>10h45–20h</strong></div><div><span>Sam</span><strong>10h45–20h</strong></div><div className="closed"><span>Lun & Dim</span><strong>Fermé</strong></div></div>
        </Reveal>
      </section>

      <section className="section click-teaser">
        <Reveal className="click-content">
          <span className="kicker">BIENTÔT · CLICK & COLLECT</span>
          <h2>Préparez votre panier. Passez seulement pour le plaisir.</h2>
          <p>Le catalogue est conçu pour évoluer vers la réservation et le retrait en boutique, sans transformer AfroTarn en supermarché impersonnel.</p>
          <Link className="button button-dark" to="/click-collect">Découvrir le parcours <ArrowRight size={18} /></Link>
        </Reveal>
        <Reveal className="click-steps" delay={90}>
          <Step number="01" title="Je choisis" text="Je trouve les références disponibles." />
          <Step number="02" title="AfroTarn confirme" text="La boutique prépare la commande." />
          <Step number="03" title="Je retire" text="Je passe récupérer sur place." />
        </Reveal>
      </section>
    </>
  )
}

function Feature({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return <div className="feature"><Icon size={20} /><div><strong>{title}</strong><span>{text}</span></div></div>
}

function Step({ number, title, text }: { number: string; title: string; text: string }) {
  return <div className="click-step"><span>{number}</span><div><strong>{title}</strong><p>{text}</p></div></div>
}

function Products() {
  const [category, setCategory] = useState('Tous')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Product | null>(null)

  const filtered = useMemo(() => products.filter(product => {
    const categoryMatches = category === 'Tous' || product.category === category
    const searchMatches = product.name.toLowerCase().includes(query.toLowerCase()) || product.description.toLowerCase().includes(query.toLowerCase())
    return categoryMatches && searchMatches
  }), [category, query])

  return (
    <section className="catalog-page">
      <div className="catalog-hero section">
        <Reveal><span className="kicker">CATALOGUE AFROTARN</span><h1>Des produits à retrouver.<br /><span>Et d’autres à découvrir.</span></h1></Reveal>
        <Reveal className="catalog-search-wrap" delay={80}><Search size={20} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher : attiéké, manioc, karité…" /></Reveal>
      </div>

      <div className="catalog-toolbar section">
        <div className="category-tabs">{categories.map(item => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div>
        <span className="result-count">{filtered.length} références présentées</span>
      </div>

      <div className="product-gallery section">
        {filtered.map((product, index) => (
          <Reveal key={product.id} delay={(index % 4) * 45} className="product-tile">
            <button className="product-visual" onClick={() => setSelected(product)}>
              <img src={product.image} alt={product.name} loading="lazy" />
              <span className="product-status">{product.status}</span>
              <span className="product-number">0{product.id}</span>
            </button>
            <div className="product-copy"><span>{product.category}</span><h2>{product.name}</h2><p>{product.description}</p><button onClick={() => setSelected(product)}>Découvrir <ArrowRight size={16} /></button></div>
          </Reveal>
        ))}
      </div>

      <div className="catalog-note section"><BadgeCheck size={22} /><p><strong>Catalogue évolutif.</strong> Les références et prix seront ensuite pilotés depuis l’espace administrateur AfroTarn, sans toucher au code.</p></div>

      {selected && <div className="product-drawer-backdrop" onClick={() => setSelected(null)}><aside className="product-drawer" onClick={e => e.stopPropagation()}><button className="drawer-close" onClick={() => setSelected(null)}><X size={21} /></button><div className="drawer-image"><img src={selected.image} alt={selected.name} /></div><span className="kicker">{selected.category}</span><h2>{selected.name}</h2><p>{selected.description}</p><div className="drawer-status"><PackageCheck size={19} /><span>{selected.status}</span></div><a className="button button-dark" href={`tel:${shop.phoneHref}`}>Vérifier en boutique <Phone size={17} /></a></aside></div>}
    </section>
  )
}

function ClickCollect() {
  return (
    <section className="click-page section">
      <Reveal className="click-page-head"><span className="kicker">CLICK & COLLECT · VISION PRODUIT</span><h1>Commander en ligne.<br /><span>Retirer humainement.</span></h1><p>Le futur parcours gardera ce qui fait la force d’AfroTarn : une commande simple, puis un retrait et un échange en boutique.</p></Reveal>
      <div className="click-page-grid">
        <Reveal className="click-process">
          <Step number="01" title="Je compose mon panier" text="Produits disponibles, recherche rapide et catégories simples." />
          <Step number="02" title="Je choisis mon retrait" text="Un créneau ou une confirmation de disponibilité." />
          <Step number="03" title="La boutique prépare" text="Le stock Click & Collect est réservé automatiquement." />
          <Step number="04" title="Je retire chez AfroTarn" text="Pas d’attente inutile. La commande est prête." />
        </Reveal>
        <Reveal className="click-manifesto" delay={100}>
          <ShoppingBag size={34} />
          <h2>Pas un “Amazon africain”.</h2>
          <p>Le Click & Collect restera un service secondaire : pratique pour les habitués, rassurant pour les nouveaux clients, mais toujours connecté à la vraie boutique.</p>
          <div className="manifesto-tags"><span>Stock dédié</span><span>Confirmation boutique</span><span>Retrait local</span></div>
        </Reveal>
      </div>
    </section>
  )
}

function Admin() {
  const rows = [
    ['Attiéké 500 g', 'Épicerie', '12', 'En ligne'],
    ['Farine de manioc', 'Épicerie', '8', 'En ligne'],
    ['Huile de palme', 'Épicerie', '2', 'Stock faible'],
    ['Plantain', 'Fruits & légumes', 'Variable', 'Boutique'],
  ]
  return (
    <section className="admin-page section">
      <Reveal className="admin-title"><span className="kicker">ESPACE DE GESTION · PROTOTYPE</span><h1>Bonjour Estelle.</h1><p>La future administration permettra de gérer les produits, prix, stocks et commandes depuis un téléphone.</p></Reveal>
      <div className="admin-metrics"><Reveal><strong>50</strong><span>produits V1</span></Reveal><Reveal delay={50}><strong>6</strong><span>stocks à surveiller</span></Reveal><Reveal delay={100}><strong>4</strong><span>commandes du jour</span></Reveal></div>
      <Reveal className="admin-table-wrap">
        <div className="admin-table-head"><div><h2>Produits & stocks</h2><p>Mise à jour rapide sans toucher au site.</p></div><button><ShoppingBag size={17} /> Ajouter</button></div>
        <div className="admin-table">{rows.map(([name, cat, stock, status]) => <div className="admin-line" key={name}><div><strong>{name}</strong><span>{cat}</span></div><div><small>Stock</small><strong>{stock}</strong></div><div><small>Statut</small><strong>{status}</strong></div><button>Modifier</button></div>)}</div>
      </Reveal>
    </section>
  )
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/produits" element={<Products />} />
        <Route path="/click-collect" element={<ClickCollect />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
