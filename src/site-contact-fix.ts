const OLD_EMAIL = 'afrotarn@gmail.com'
const CONTACT_EMAIL = 'eliebakala@gmail.com'

function syncContactEmail() {
  document.querySelectorAll<HTMLAnchorElement>(`a[href="mailto:${OLD_EMAIL}"]`).forEach(link => {
    link.href = `mailto:${CONTACT_EMAIL}`
    if (link.textContent?.trim().toLowerCase() === OLD_EMAIL) link.textContent = CONTACT_EMAIL
  })
}

syncContactEmail()
const observer = new MutationObserver(syncContactEmail)
observer.observe(document.documentElement, { childList: true, subtree: true })
