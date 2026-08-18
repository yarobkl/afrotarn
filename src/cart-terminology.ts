function normalizeCartCopy(root: ParentNode = document) {
  const walker = document.createTreeWalker(root === document ? document.body : root, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  let current = walker.nextNode()
  while (current) {
    nodes.push(current as Text)
    current = walker.nextNode()
  }

  for (const node of nodes) {
    const value = node.nodeValue || ''
    let next = value
      .replace(/Ma liste/g, 'Panier')
      .replace(/ma liste/g, 'le panier')
      .replace(/Ma sélection/g, 'Panier')
      .replace(/dans le panier/g, 'dans le panier')
    if (next !== value) node.nodeValue = next
  }
}

let scheduled = false
function scheduleNormalization() {
  if (scheduled) return
  scheduled = true
  requestAnimationFrame(() => {
    scheduled = false
    if (document.body) normalizeCartCopy()
  })
}

if (document.body) normalizeCartCopy()
else document.addEventListener('DOMContentLoaded', () => normalizeCartCopy(), { once: true })

const cartCopyObserver = new MutationObserver(scheduleNormalization)
cartCopyObserver.observe(document.documentElement, { childList: true, subtree: true })
