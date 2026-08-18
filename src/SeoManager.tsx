import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { SEO_CONFIG, SEO_ROUTES } from './seo-config'

function upsertMeta(name: string, content: string) {
  let node = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (!node) {
    node = document.createElement('meta')
    node.setAttribute('name', name)
    document.head.appendChild(node)
  }
  node.setAttribute('content', content)
}

function upsertProperty(property: string, content: string) {
  let node = document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)
  if (!node) {
    node = document.createElement('meta')
    node.setAttribute('property', property)
    document.head.appendChild(node)
  }
  node.setAttribute('content', content)
}

function upsertCanonical(href: string) {
  let node = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!node) {
    node = document.createElement('link')
    node.setAttribute('rel', 'canonical')
    document.head.appendChild(node)
  }
  node.setAttribute('href', href)
}

function upsertJsonLd(id: string, data: unknown) {
  let node = document.head.querySelector<HTMLScriptElement>(`script#${id}`)
  if (!node) {
    node = document.createElement('script')
    node.id = id
    node.type = 'application/ld+json'
    document.head.appendChild(node)
  }
  node.textContent = JSON.stringify(data)
}

const openingHoursSpecification = [
  { '@type': 'OpeningHoursSpecification', dayOfWeek: 'https://schema.org/Tuesday', opens: '10:00', closes: '12:30' },
  { '@type': 'OpeningHoursSpecification', dayOfWeek: 'https://schema.org/Tuesday', opens: '14:30', closes: '20:00' },
  { '@type': 'OpeningHoursSpecification', dayOfWeek: 'https://schema.org/Wednesday', opens: '14:45', closes: '20:00' },
  { '@type': 'OpeningHoursSpecification', dayOfWeek: 'https://schema.org/Thursday', opens: '10:00', closes: '12:30' },
  { '@type': 'OpeningHoursSpecification', dayOfWeek: 'https://schema.org/Thursday', opens: '14:30', closes: '20:00' },
  { '@type': 'OpeningHoursSpecification', dayOfWeek: 'https://schema.org/Friday', opens: '10:45', closes: '20:00' },
  { '@type': 'OpeningHoursSpecification', dayOfWeek: 'https://schema.org/Saturday', opens: '10:45', closes: '20:00' },
]

export default function SeoManager() {
  const location = useLocation()

  useEffect(() => {
    const pathname = location.pathname
    const route = SEO_ROUTES[pathname] || SEO_ROUTES['/']
    const canonicalPath = pathname === '/' ? '' : pathname.replace(/\/$/, '')
    const canonical = `${SEO_CONFIG.origin}${canonicalPath}`
    const robots = route.index
      ? 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1'
      : 'noindex,follow,noarchive'

    document.documentElement.lang = 'fr'
    document.title = route.title
    upsertMeta('description', route.description)
    upsertMeta('robots', robots)
    upsertMeta('googlebot', robots)
    upsertMeta('author', 'AFROTARN EURL')

    if (SEO_CONFIG.googleSiteVerification) {
      upsertMeta('google-site-verification', SEO_CONFIG.googleSiteVerification)
    }

    upsertCanonical(canonical)
    upsertProperty('og:locale', 'fr_FR')
    upsertProperty('og:type', pathname === '/' ? 'website' : 'article')
    upsertProperty('og:site_name', SEO_CONFIG.siteName)
    upsertProperty('og:title', route.title)
    upsertProperty('og:description', route.description)
    upsertProperty('og:url', canonical)
    upsertMeta('twitter:card', 'summary')
    upsertMeta('twitter:title', route.title)
    upsertMeta('twitter:description', route.description)

    const businessId = `${SEO_CONFIG.origin}/#business`
    const websiteId = `${SEO_CONFIG.origin}/#website`

    upsertJsonLd('afrotarn-structured-data', {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          '@id': websiteId,
          url: SEO_CONFIG.origin,
          name: SEO_CONFIG.siteName,
          alternateName: SEO_CONFIG.alternateName,
          inLanguage: 'fr-FR',
          publisher: { '@id': businessId },
        },
        {
          '@type': 'GroceryStore',
          '@id': businessId,
          name: SEO_CONFIG.business.name,
          legalName: SEO_CONFIG.business.legalName,
          description: SEO_CONFIG.defaultDescription,
          url: SEO_CONFIG.origin,
          telephone: SEO_CONFIG.business.telephone,
          email: SEO_CONFIG.business.email,
          currenciesAccepted: 'EUR',
          address: {
            '@type': 'PostalAddress',
            streetAddress: SEO_CONFIG.business.streetAddress,
            postalCode: SEO_CONFIG.business.postalCode,
            addressLocality: SEO_CONFIG.business.addressLocality,
            addressRegion: SEO_CONFIG.business.addressRegion,
            addressCountry: SEO_CONFIG.business.addressCountry,
          },
          identifier: [
            { '@type': 'PropertyValue', propertyID: 'SIREN', value: SEO_CONFIG.business.siren },
            { '@type': 'PropertyValue', propertyID: 'SIRET', value: SEO_CONFIG.business.siret },
          ],
          vatID: SEO_CONFIG.business.vatId,
          hasMap: SEO_CONFIG.business.mapUrl,
          sameAs: [SEO_CONFIG.business.registryUrl],
          openingHoursSpecification,
        },
        {
          '@type': 'WebPage',
          '@id': `${canonical}#webpage`,
          url: canonical,
          name: route.title,
          description: route.description,
          isPartOf: { '@id': websiteId },
          about: { '@id': businessId },
          inLanguage: 'fr-FR',
        },
      ],
    })
  }, [location.pathname])

  return null
}
