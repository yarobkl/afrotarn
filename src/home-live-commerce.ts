type LiveProduct = {
  id: string
  name: string
  price_cents: number | null
  promotion_active: boolean
  promo_price_cents: number | null
  promo_label: string | null
}

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || 'https://whgnczmorqmhwdvmgtwt.supabase.co'
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoZ25jem1vcnFtaHdkdm1ndHd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5OTE3MTYsImV4cCI6MjEwMjU2NzcxNn0.GenTCUGdLzxiyW9TtI8740WsmIg9_TUy1x0j6itPAdI'

let liveByName = new Map<string, LiveProduct>()
let refreshTimer = 0

function key(value: string) {
  return value.trim().toLocaleLowerCase('fr')
}

function money(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100)
}

function bagIcon() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('width', '17')
  svg.setAttribute('height', '17')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '1.9')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  svg.setAttribute('aria-hidden', 'true')
  svg.innerHTML = '<path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'
  return svg
}

function decorateCartButton(card: Element) {
  const button = card.querySelector<HTMLButtonElement>('.add-button')
  if (!button || button.dataset.cartUpgraded === '1') return
  button.dataset.cartUpgraded = '1'
  button.classList.add('home-add-to-cart')
  button.replaceChildren(bagIcon(), document.createTextNode('Ajouter au panier'))
}

function removeExistingPromo(card: Element) {
  card.classList.remove('commerce-v2-product', 'is-promo')
  card.querySelector<HTMLElement>('.product-visual')?.removeAttribute('data-promo-label')
  card.querySelectorAll('.home-live-price').forEach(node => node.remove())
}

function decorateCard(card: Element) {
  const name = card.querySelector('.product-title h3')?.textContent
  if (!name) return
  decorateCartButton(card)

  const product = liveByName.get(key(name))
  if (!product) return

  const signature = JSON.stringify([
    product.price_cents,
    product.promotion_active,
    product.promo_price_cents,
    product.promo_label || 'PROMO',
  ])
  const cardElement = card as HTMLElement
  if (cardElement.dataset.liveCommerceSignature === signature) return
  cardElement.dataset.liveCommerceSignature = signature

  removeExistingPromo(card)
  const body = card.querySelector('.product-body')
  const description = body?.querySelector('p')
  if (!body || !description) return

  const validPromoPrice = Boolean(
    product.promotion_active
    && product.price_cents !== null
    && product.promo_price_cents !== null
    && product.promo_price_cents < product.price_cents,
  )

  if (product.promotion_active) {
    card.classList.add('commerce-v2-product', 'is-promo')
    card.querySelector<HTMLElement>('.product-visual')?.setAttribute('data-promo-label', product.promo_label?.trim() || 'PROMO')
  }

  if (validPromoPrice) {
    const row = document.createElement('div')
    row.className = 'promo-price-row home-live-price'
    const oldPrice = document.createElement('span')
    oldPrice.className = 'promo-old-price'
    oldPrice.textContent = money(product.price_cents!)
    const currentPrice = document.createElement('strong')
    currentPrice.className = 'promo-current-price'
    currentPrice.textContent = money(product.promo_price_cents!)
    row.append(oldPrice, currentPrice)
    description.insertAdjacentElement('afterend', row)
  } else if (product.price_cents !== null) {
    const price = document.createElement('strong')
    price.className = 'commerce-v2-price home-live-price'
    price.textContent = money(product.price_cents)
    description.insertAdjacentElement('afterend', price)
  } else if (product.promotion_active) {
    const flag = document.createElement('span')
    flag.className = 'promo-flag-only home-live-price'
    flag.textContent = `${product.promo_label?.trim() || 'PROMO'} · prix à renseigner`
    description.insertAdjacentElement('afterend', flag)
  }
}

function decorateHomepage() {
  document.querySelectorAll('.home-product-grid .product-card').forEach(decorateCard)
}

async function loadLiveProducts() {
  try {
    const select = encodeURIComponent('id,name,price_cents,promotion_active,promo_price_cents,promo_label')
    const response = await fetch(`${SUPABASE_URL}/rest/v1/products?select=${select}&active=eq.true`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      cache: 'no-store',
    })
    if (!response.ok) return
    const products = await response.json() as LiveProduct[]
    liveByName = new Map(products.map(product => [key(product.name), product]))
    decorateHomepage()
  } catch {
    // Keep the homepage usable if live stock is temporarily unavailable.
  }
}

const observer = new MutationObserver(() => decorateHomepage())
observer.observe(document.documentElement, { childList: true, subtree: true })

void loadLiveProducts()
refreshTimer = window.setInterval(() => void loadLiveProducts(), 60000)

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void loadLiveProducts()
})

window.addEventListener('beforeunload', () => window.clearInterval(refreshTimer), { once: true })
