import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import App from './App'
import AdminApp from './AdminApp'
import OrderConfirmation from './OrderConfirmation'
import { CatalogRoute, ClickCollectRoute } from './CommerceRoutes'
import { Cgv, Confidentialite, Cookies, MentionsLegales } from './LegalPages'
import SiteLegalStrip from './SiteLegalStrip'
import SeoManager from './SeoManager'
import './styles.css'
import './stability.css'
import './payment-flow.css'
import './error.css'
import './mobile-dock-fix.css'
import './home-live-commerce'
import './site-contact-fix'

type ErrorBoundaryState = { hasError: boolean }

class AppErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error('AfroTarn runtime error', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="app-error" role="alert">
          <div>
            <strong>AfroTarn</strong>
            <h1>La page a rencontré un problème.</h1>
            <p>Actualisez simplement la page. Si le problème persiste, vous pouvez toujours contacter la boutique.</p>
            <div className="app-error-actions">
              <button onClick={() => window.location.reload()}>Actualiser</button>
              <a href="tel:+33607077158">Appeler la boutique</a>
            </div>
          </div>
        </main>
      )
    }

    return this.props.children
  }
}

window.addEventListener('error', event => {
  const target = event.target
  if (!(target instanceof HTMLImageElement)) return
  target.style.opacity = '0'
  target.style.visibility = 'hidden'
  const parent = target.parentElement
  if (parent) {
    parent.style.background = 'radial-gradient(circle at 78% 18%, rgba(217,165,90,.42), transparent 34%), linear-gradient(135deg, #173c2d, #8b4032)'
  }
}, true)

const root = document.getElementById('root')

if (!root) {
  throw new Error('Root element #root is missing')
}

const isAdmin = window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/')

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <AppErrorBoundary>
      {isAdmin ? (
        <AdminApp />
      ) : (
        <BrowserRouter>
          <SeoManager />
          <Routes>
            <Route path="/produits" element={<CatalogRoute />} />
            <Route path="/click-collect" element={<ClickCollectRoute />} />
            <Route path="/commande/confirmee" element={<OrderConfirmation />} />
            <Route path="/mentions-legales" element={<MentionsLegales />} />
            <Route path="/cgv" element={<Cgv />} />
            <Route path="/confidentialite" element={<Confidentialite />} />
            <Route path="/cookies" element={<Cookies />} />
            <Route path="*" element={<App />} />
          </Routes>
          <SiteLegalStrip />
        </BrowserRouter>
      )}
    </AppErrorBoundary>
  </React.StrictMode>,
)
