import { useMemo, useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom'

type Product = { id:number; name:string; category:string; price?:number; availability:'Disponible'|'Stock faible'|'En boutique'; emoji:string }
const products: Product[] = [
  {id:1,name:'Attiéké',category:'Épicerie',price:3.9,availability:'Disponible',emoji:'🥣'},
  {id:2,name:'Plantain',category:'Fruits & légumes',availability:'En boutique',emoji:'🍌'},
  {id:3,name:'Farine de manioc',category:'Épicerie',price:4.9,availability:'Disponible',emoji:'🌾'},
  {id:4,name:'Huile de palme',category:'Épicerie',price:6.9,availability:'Stock faible',emoji:'🫙'},
  {id:5,name:'Poisson fumé',category:'Poissons',availability:'En boutique',emoji:'🐟'},
  {id:6,name:'Épices africaines',category:'Épices & sauces',price:2.9,availability:'Disponible',emoji:'🌶️'},
  {id:7,name:'Beurre de karité',category:'Cosmétiques',price:7.5,availability:'Disponible',emoji:'✨'},
  {id:8,name:'Boisson gingembre',category:'Boissons',price:2.5,availability:'Disponible',emoji:'🥤'},
]

function Layout({children}:{children:React.ReactNode}) {
  const [open,setOpen]=useState(false)
  return <div className="site-shell">
    <header className="topbar">
      <NavLink to="/" className="brand" onClick={()=>setOpen(false)}><span className="brand-mark">A</span><span><strong>AFROTARN</strong><small>Gaillac</small></span></NavLink>
      <button className="menu-button" aria-label="Ouvrir le menu" onClick={()=>setOpen(v=>!v)}>☰</button>
      <nav className={open?'nav open':'nav'}>
        <NavLink to="/" onClick={()=>setOpen(false)}>Accueil</NavLink>
        <NavLink to="/produits" onClick={()=>setOpen(false)}>Produits</NavLink>
        <NavLink to="/click-collect" onClick={()=>setOpen(false)}>Click & Collect</NavLink>
        <a href="tel:+33607077158">Appeler</a>
      </nav>
    </header>
    <main>{children}</main>
    <footer className="footer"><div><strong>AFROTARN</strong><p>Épicerie africaine & cosmétiques à Gaillac.</p></div><div><p>70 rue du Château du Roi<br/>81600 Gaillac</p><p>06 07 07 71 58<br/>afrotarn@gmail.com</p></div></footer>
  </div>
}

function Home(){
  const categories=[['🍌','Fruits & légumes'],['🥣','Épicerie'],['🐟','Poissons'],['🌶️','Épices & sauces'],['🥤','Boissons'],['✨','Cosmétiques']]
  return <>
    <section className="hero section-pad"><div className="hero-card"><span className="eyebrow">AFROTARN · GAILLAC</span><h1>Les saveurs d’Afrique à Gaillac</h1><p>Épicerie africaine, cosmétiques, produits authentiques et conseils en boutique avec Estelle.</p><div className="rating">★ 5,0 <span>· 5 avis</span></div><div className="cta-stack"><Link className="btn primary" to="/produits">Voir les produits</Link><a className="btn secondary" href="https://www.google.com/maps/search/?api=1&query=70+rue+du+Chateau+du+Roi+81600+Gaillac">Itinéraire</a><Link className="btn accent" to="/click-collect">Commander & retirer</Link></div></div></section>
    <section className="section-pad"><div className="section-head"><span className="eyebrow">À DÉCOUVRIR</span><h2>Nos incontournables</h2></div><div className="category-grid">{categories.map(([icon,label])=><Link to="/produits" className="category-card" key={label}><span>{icon}</span><strong>{label}</strong></Link>)}</div></section>
    <section className="section-pad"><div className="estelle-card"><div className="portrait-placeholder">E</div><div><span className="eyebrow">LES CONSEILS D’ESTELLE</span><h2>Découvrir, comprendre, cuisiner.</h2><p>Une boutique de proximité où l’on vient aussi pour être conseillé sur les produits, leurs usages et les recettes.</p></div></div></section>
    <section className="section-pad info-grid"><div className="info-card"><span>📍</span><h3>Nous trouver</h3><p>70 rue du Château du Roi<br/>81600 Gaillac</p></div><div className="info-card"><span>📞</span><h3>Nous appeler</h3><p><a href="tel:+33607077158">06 07 07 71 58</a></p></div><div className="info-card"><span>💳</span><h3>Paiement</h3><p>Espèces · Sans contact · VISA</p></div></section>
  </>
}

function Products(){
  const cats=['Tous',...Array.from(new Set(products.map(p=>p.category)))]
  const [category,setCategory]=useState('Tous'); const [query,setQuery]=useState('')
  const filtered=useMemo(()=>products.filter(p=>(category==='Tous'||p.category===category)&&p.name.toLowerCase().includes(query.toLowerCase())),[category,query])
  return <section className="section-pad page-top"><span className="eyebrow">CATALOGUE</span><h1>Nos produits</h1><p className="intro">Une sélection de références AfroTarn. Le catalogue sera enrichi progressivement depuis l’administration.</p><input className="search" placeholder="Rechercher un produit…" value={query} onChange={e=>setQuery(e.target.value)}/><div className="chips">{cats.map(c=><button key={c} className={category===c?'chip active':'chip'} onClick={()=>setCategory(c)}>{c}</button>)}</div><div className="product-grid">{filtered.map(p=><article className="product-card" key={p.id}><div className="product-image">{p.emoji}</div><small>{p.category}</small><h3>{p.name}</h3><div className="product-meta"><strong>{p.price?`${p.price.toFixed(2).replace('.',',')} €`:'Prix en boutique'}</strong><span className={`stock ${p.availability==='Stock faible'?'low':''}`}>{p.availability}</span></div>{p.price?<button className="btn mini primary">+ Ajouter</button>:<button className="btn mini secondary">Voir en boutique</button>}</article>)}</div></section>
}

function ClickCollect(){return <section className="section-pad page-top"><span className="eyebrow">CLICK & COLLECT</span><h1>Commander, puis retirer en boutique</h1><p className="intro">Le parcours est prêt côté interface. Le paiement et les commandes seront activés après connexion de la base de données.</p><div className="steps"><div className="step"><b>1</b><h3>Je commande</h3><p>Je choisis mes produits disponibles en ligne.</p></div><div className="step"><b>2</b><h3>Confirmation</h3><p>AfroTarn valide et prépare ma commande.</p></div><div className="step"><b>3</b><h3>Je retire</h3><p>Je viens récupérer ma commande en boutique.</p></div></div><div className="notice"><strong>Gestion du stock :</strong> la V1 utilisera un stock dédié au Click & Collect pour limiter les écarts avec les ventes magasin.</div></section>}

function Admin(){const rows=[['Attiéké 500 g','3,90 €','12','En ligne'],['Farine de manioc','4,90 €','8','En ligne'],['Huile de palme','6,90 €','2','Stock faible'],['Plantain','Variable','—','Boutique']];return <section className="section-pad page-top admin-page"><span className="eyebrow">ADMINISTRATION · DÉMO</span><h1>Tableau de bord AfroTarn</h1><p className="intro">Cet écran préfigure l’espace d’Estelle. Il sera protégé par connexion Supabase avant la mise en production.</p><div className="stats"><div><strong>4</strong><span>Commandes</span></div><div><strong>6</strong><span>Stocks faibles</span></div><div><strong>50</strong><span>Produits V1</span></div></div><div className="admin-card"><div className="admin-head"><h2>Produits & stock</h2><button className="btn mini primary">+ Produit</button></div><div className="admin-list">{rows.map(([name,price,stock,status])=><div className="admin-row" key={name}><div><strong>{name}</strong><small>{price}</small></div><div><span>Stock {stock}</span><small>{status}</small></div><button>Modifier</button></div>)}</div></div></section>}

export default function App(){return <Layout><Routes><Route path="/" element={<Home/>}/><Route path="/produits" element={<Products/>}/><Route path="/click-collect" element={<ClickCollect/>}/><Route path="/admin" element={<Admin/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes></Layout>}
