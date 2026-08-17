import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { hasError: boolean }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AfroTarn] UI error', error, info)
  }

  private retry = () => {
    window.location.assign('/')
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <main className="fatal-fallback" role="alert">
        <div className="fatal-fallback-card">
          <span className="fatal-seal">AT</span>
          <small>AFROTARN · GAILLAC</small>
          <h1>La page a rencontré un petit problème.</h1>
          <p>Vos informations principales restent accessibles. Rechargez l’accueil ou contactez directement la boutique.</p>
          <div className="fatal-actions">
            <button type="button" onClick={this.retry}>Revenir à l’accueil</button>
            <a href="tel:+33607077158">Appeler AfroTarn</a>
          </div>
        </div>
      </main>
    )
  }
}
