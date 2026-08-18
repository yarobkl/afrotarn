import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const TAB_ROUTES = ['/', '/produits', '/click-collect'] as const
const EDGE_GUARD = 22
const INTENT_DISTANCE = 7
const AXIS_RATIO = 1.12
const COMMIT_DISTANCE = 46
const COMMIT_VELOCITY = 0.42

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

type Gesture = {
  x: number
  y: number
  time: number
  active: boolean
  horizontal: boolean
  cancelled: boolean
  pointerId: number | null
}

export default function SwipeNavigator() {
  const location = useLocation()
  const navigate = useNavigate()
  const gesture = useRef<Gesture>({
    x: 0,
    y: 0,
    time: 0,
    active: false,
    horizontal: false,
    cancelled: false,
    pointerId: null,
  })
  const frame = useRef<number | null>(null)
  const settleTimer = useRef<number | null>(null)

  useEffect(() => {
    const html = document.documentElement
    const isMobile = () => window.matchMedia('(max-width: 820px)').matches

    const cancelFrame = () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
      frame.current = null
    }

    const clearVisualState = () => {
      cancelFrame()
      if (settleTimer.current !== null) window.clearTimeout(settleTimer.current)
      settleTimer.current = null
      html.classList.remove('is-tab-swiping', 'is-tab-snapping', 'is-tab-committing')
      html.style.removeProperty('--swipe-drag-x')
      html.style.removeProperty('--swipe-progress')
      html.style.removeProperty('--swipe-commit-x')
      delete html.dataset.swipeDirection
    }

    const currentIndex = () => {
      const current = normalizedTab(location.pathname)
      return current ? TAB_ROUTES.indexOf(current) : -1
    }

    const nextIndexForDx = (dx: number) => {
      const index = currentIndex()
      if (index < 0) return -1
      return dx < 0 ? index + 1 : index - 1
    }

    const applyDrag = (rawDx: number) => {
      const index = currentIndex()
      if (index < 0) return
      const atStart = index === 0 && rawDx > 0
      const atEnd = index === TAB_ROUTES.length - 1 && rawDx < 0
      const resistance = atStart || atEnd ? 0.2 : 0.94
      const width = Math.max(window.innerWidth, 320)
      const translated = Math.max(-width * 0.94, Math.min(width * 0.94, rawDx * resistance))
      const progress = Math.min(1, Math.abs(translated) / width)

      cancelFrame()
      frame.current = requestAnimationFrame(() => {
        html.classList.add('is-tab-swiping')
        html.classList.remove('is-tab-snapping', 'is-tab-committing')
        html.style.setProperty('--swipe-drag-x', `${translated}px`)
        html.style.setProperty('--swipe-progress', String(progress))
        html.dataset.swipeDirection = rawDx < 0 ? 'forward' : 'back'
      })
    }

    const snapBack = () => {
      html.classList.remove('is-tab-swiping', 'is-tab-committing')
      html.classList.add('is-tab-snapping')
      html.style.setProperty('--swipe-drag-x', '0px')
      settleTimer.current = window.setTimeout(clearVisualState, 240)
    }

    const commit = (dx: number) => {
      const nextIndex = nextIndexForDx(dx)
      if (nextIndex < 0 || nextIndex >= TAB_ROUTES.length) {
        snapBack()
        return
      }

      const direction = dx < 0 ? 'forward' : 'back'
      const destination = dx < 0 ? -window.innerWidth : window.innerWidth
      html.classList.remove('is-tab-swiping', 'is-tab-snapping')
      html.classList.add('is-tab-committing')
      html.style.setProperty('--swipe-commit-x', `${destination}px`)
      html.dataset.swipeDirection = direction

      settleTimer.current = window.setTimeout(() => {
        html.classList.remove('is-tab-committing')
        html.style.removeProperty('--swipe-drag-x')
        html.style.removeProperty('--swipe-progress')
        html.style.removeProperty('--swipe-commit-x')
        html.dataset.tabSwipe = direction
        delete html.dataset.swipeDirection
        navigate(TAB_ROUTES[nextIndex])

        settleTimer.current = window.setTimeout(() => {
          delete html.dataset.tabSwipe
          settleTimer.current = null
        }, 360)
      }, 155)
    }

    const begin = (x: number, y: number, pointerId: number | null, target: EventTarget | null) => {
      if (!isMobile() || shouldIgnoreTarget(target) || normalizedTab(location.pathname) === null) return false
      if (document.querySelector('.mobile-menu-button[aria-expanded="true"]')) return false
      if (x < EDGE_GUARD) return false // preserve Safari's back-swipe area

      clearVisualState()
      gesture.current = {
        x,
        y,
        time: performance.now(),
        active: true,
        horizontal: false,
        cancelled: false,
        pointerId,
      }
      return true
    }

    const move = (x: number, y: number, prevent: () => void) => {
      const state = gesture.current
      if (!state.active || state.cancelled) return
      const dx = x - state.x
      const dy = y - state.y
      const ax = Math.abs(dx)
      const ay = Math.abs(dy)

      if (!state.horizontal) {
        if (ax < INTENT_DISTANCE && ay < INTENT_DISTANCE) return
        if (ay > ax) {
          state.cancelled = true
          snapBack()
          return
        }
        if (ax < ay * AXIS_RATIO) return
        state.horizontal = true
      }

      prevent()
      applyDrag(dx)
    }

    const end = (x: number, y: number) => {
      const state = gesture.current
      if (!state.active) return

      const dx = x - state.x
      const dy = y - state.y
      const elapsed = Math.max(16, performance.now() - state.time)
      const velocity = dx / elapsed
      const horizontal = state.horizontal && !state.cancelled

      state.active = false
      state.horizontal = false
      state.pointerId = null

      if (!horizontal || Math.abs(dx) < Math.abs(dy) * AXIS_RATIO) {
        snapBack()
        return
      }

      const enoughDistance = Math.abs(dx) >= Math.min(COMMIT_DISTANCE, window.innerWidth * 0.14)
      const enoughVelocity = Math.abs(velocity) >= COMMIT_VELOCITY
      if (enoughDistance || enoughVelocity) commit(dx)
      else snapBack()
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== 'touch' || !event.isPrimary) return
      begin(event.clientX, event.clientY, event.pointerId, event.target)
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!gesture.current.active || gesture.current.pointerId !== event.pointerId) return
      move(event.clientX, event.clientY, () => event.preventDefault())
    }

    const onPointerUp = (event: PointerEvent) => {
      if (!gesture.current.active || gesture.current.pointerId !== event.pointerId) return
      end(event.clientX, event.clientY)
    }

    const onPointerCancel = (event: PointerEvent) => {
      if (gesture.current.pointerId !== event.pointerId) return
      gesture.current.active = false
      gesture.current.cancelled = true
      snapBack()
    }

    const supportsPointer = 'PointerEvent' in window

    const onTouchStart = (event: TouchEvent) => {
      if (supportsPointer || event.touches.length !== 1) return
      const touch = event.touches[0]
      begin(touch.clientX, touch.clientY, null, event.target)
    }

    const onTouchMove = (event: TouchEvent) => {
      if (supportsPointer || !gesture.current.active || event.touches.length !== 1) return
      const touch = event.touches[0]
      move(touch.clientX, touch.clientY, () => event.preventDefault())
    }

    const onTouchEnd = (event: TouchEvent) => {
      if (supportsPointer || !gesture.current.active) return
      const touch = event.changedTouches[0]
      end(touch?.clientX ?? gesture.current.x, touch?.clientY ?? gesture.current.y)
    }

    document.addEventListener('pointerdown', onPointerDown, { passive: true, capture: true })
    document.addEventListener('pointermove', onPointerMove, { passive: false, capture: true })
    document.addEventListener('pointerup', onPointerUp, { passive: true, capture: true })
    document.addEventListener('pointercancel', onPointerCancel, { passive: true, capture: true })
    document.addEventListener('touchstart', onTouchStart, { passive: true, capture: true })
    document.addEventListener('touchmove', onTouchMove, { passive: false, capture: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true, capture: true })

    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('pointermove', onPointerMove, true)
      document.removeEventListener('pointerup', onPointerUp, true)
      document.removeEventListener('pointercancel', onPointerCancel, true)
      document.removeEventListener('touchstart', onTouchStart, true)
      document.removeEventListener('touchmove', onTouchMove, true)
      document.removeEventListener('touchend', onTouchEnd, true)
      clearVisualState()
    }
  }, [location.pathname, navigate])

  return null
}
