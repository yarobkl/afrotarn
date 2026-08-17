import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Boxes, Plus } from 'lucide-react'
import AdminDashboardV2 from './AdminDashboardV2'
import './admin-quick-actions.css'

export default function AdminApp() {
  const [actionTarget, setActionTarget] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const findTarget = () => {
      const target = document.querySelector<HTMLElement>('.admin-v2-header-inner .admin-header-actions')
      setActionTarget(current => current === target ? current : target)
    }

    findTarget()
    const observer = new MutationObserver(findTarget)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  function showProducts() {
    const stockTab = document.querySelector<HTMLButtonElement>('.admin-v2-tabs button:nth-of-type(2)')
    stockTab?.click()
    window.setTimeout(() => {
      document.querySelector('.admin-v2-stock-toolbar')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }

  function createProduct() {
    const stockTab = document.querySelector<HTMLButtonElement>('.admin-v2-tabs button:nth-of-type(2)')
    stockTab?.click()
    window.setTimeout(() => {
      const createButton = document.querySelector<HTMLButtonElement>('.admin-v2-new')
      createButton?.click()
      document.querySelector('.admin-v2-editor-pane')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  return (
    <>
      <AdminDashboardV2 />
      {actionTarget && createPortal(
        <div className="admin-quick-actions" aria-label="Actions produits rapides">
          <button type="button" className="admin-quick-products" onClick={showProducts}>
            <Boxes size={17} />
            <span className="admin-quick-long">Produits / modifier</span>
            <span className="admin-quick-short">Produits</span>
          </button>
          <button type="button" className="admin-quick-create" onClick={createProduct}>
            <Plus size={17} />
            <span className="admin-quick-long">Ajouter un produit</span>
            <span className="admin-quick-short">Ajouter</span>
          </button>
        </div>,
        actionTarget,
      )}
    </>
  )
}
