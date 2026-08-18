import { Link, useLocation } from 'react-router-dom'
import './legal.css'

export default function SiteLegalStrip() {
  const location = useLocation()
  if (['/mentions-legales', '/cgv', '/confidentialite', '/cookies'].includes(location.pathname)) return null

  return <div className="site-legal-strip">
    <nav aria-label="Liens légaux">
      <Link to="/mentions-legales">Mentions légales</Link>
      <Link to="/cgv">CGV</Link>
      <Link to="/confidentialite">Confidentialité</Link>
      <Link to="/cookies">Cookies</Link>
    </nav>
    <span className="site-developed">Développé par <a href="https://www.yaroconsulting.fr" target="_blank" rel="noreferrer">Yaro Consulting</a></span>
  </div>
}
