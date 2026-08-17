import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles.css'
import './stability.css'
import './error.css'

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

// Editorial imagery is currently loaded from public remote sources. If a host
// becomes unavailable, preserve the card geometry and replace the broken image
// with a branded background rather than exposing a browser error icon.
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

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AppErrorBoundary>
  </React.StrictMode>,
)
