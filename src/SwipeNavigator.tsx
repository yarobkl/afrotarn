import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const TAB_ROUTES = ['/', '/produits', '/click-collect'] as const
const EDGE_GUARD = 28
const INTENT_DISTANCE = 10
const NAV_DISTANCE = 68
const AXIS_RATIO = 1.25
const MAX_DRAG = 54

function normalizedTab(pathname: string) {
  if (pathname === '/') return '/'
  if (pathname.startsWith('/produits')) return '/produits'
  if (pathname.startsWith('/click-collect')) return '/click-collect'
  return null
}

function shouldIgnoreTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return true
  return Boolean(target.closest(
    'input,textarea,select,[contenteditable="true"],.category-scroll,.product-sheet,.sheet-backdrop,.mobile-panel,.simple-cart-qty,.qty-control,[data-no-swipe]'
  ))
}

export default function SwipeNavigator() {
  const location = useLocation()
  const navigate = useNavigate()
  const start = useRef({ x: 0, y: 0, active: false, horizontal: false, cancelled: false })
  const frame = useRef<number | null>(null)

  useEffect(() => {
    const isMobile = () => window.matchMedia('(max-width: 820px)').matches

    const clearDrag = () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
      frame.current = null
      document.documentElement.classList.remove('is-tab-swiping')
      document.documentElement.style.removeProperty('--swipe-drag-x')
    }

    const onTouchStart = (event: TouchEvent) => {
      if (!isMobile() || event.touches.length !== 1 || shouldIgnoreTarget(event.target)) return
      if (document.querySelector('.mobile-menu-button[aria-expanded="true"]')) return

      const touch = event.touches[0]
      if (touch.clientX < EDGE_GUARD) return // keep iOS back gesture untouched

      start.current = {
        x: touch.clientX,
        y: touch.clientY,
        active: true,
        horizontal: false,
        cancelled: false,
      }
    }

    const onTouchMove = (event: TouchEvent) => {
      if (!start.current.active || start.current.cancelled || event.touches.length !== 1) return
      const touch = event.touches[0]
      const dx = touch.clientX - start.current.x
      const dy = touch.clientY - start.current.y
      const ax = Math.abs(dx)
      const ay = Math.abs(dy)

      if (!start.current.horizontal) {
        if (ax < INTENT_DISTANCE && ay < INTENT_DISTANCE) return
        if (ay > ax) {
          start.current.cancelled = true
          clearDrag()
          return
        }
        if (ax < ay * AXIS_RATIO) return
        start.current.horizontal = true
      }

      if (!start.current.horizontal) return
      event.preventDefault()

      const current = normalizedTab(location.pathname)
      if (!current) return
      const index = TAB_ROUTES.indexOf(current)
      const atStart = index === 0 && dx > 0
      const atEnd = index === TAB_ROUTES.length - 1 && dx < 0
      const resistance = atStart || atEnd ? 0.18 : 0.48
      const translated = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, dx * resistance))

      if (frame.current !== null) cancelAnimationFrame(frame.current)
      frame.current = requestAnimationFrame(() => {
        document.documentElement.classList.add('is-tab-swiping')
        document.documentElement.style.setProperty('--swipe-drag-x', `${translated}px`)
      })
    }

    const onTouchEnd = (event: TouchEvent) => {
      if (!start.current.active) return
      const wasHorizontal = start.current.horizontal && !start.current.cancelled
      const touch = event.changedTouches[0]
      const dx = touch ? touch.clientX - start.current.x : 0
      const dy = touch ? touch.clientY - start.current.y : 0
      start.current.active = false
      start.current.horizontal = false
      clearDrag()

      if (!wasHorizontal || Math.abs(dx) < NAV_DISTANCE || Math.abs(dx) < Math.abs(dy) * AXIS_RATIO) return

      const current = normalizedTab(location.pathname)
      if (!current) return
      const index = TAB_ROUTES.indexOf(current)
      const nextIndex = dx < 0 ? index + 1 : index - 1
      if (nextIndex < 0 || nextIndex >= TAB_ROUTES.length) return

      const direction = dx < 0 ? 'forward' : 'back'
      navigate(TAB_ROUTES[nextIndex])

      requestAnimationFrame(() => {
        document.documentElement.dataset.tabSwipe = direction
        window.setTimeout(() => {
          delete document.documentElement.dataset.tabSwipe
        }, 380)
      })
    }

    const onTouchCancel = () => {
      start.current.active = false
      start.current.horizontal = false
      start.current.cancelled = true
      clearDrag()
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend', onTouchEnd, { passive: true })
    document.addEventListener('touchcancel', onTouchCancel, { passive: true })

    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
      document.removeEventListener('touchcancel', onTouchCancel)
      clearDrag()
    }
  }, [location.pathname, navigate])

  return null
}
