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
