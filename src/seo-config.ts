export const SEO_CONFIG = {
  origin: 'https://afrotarn.vercel.app',
  siteName: 'AfroTarn',
  alternateName: 'AFROTARN',
  defaultTitle: 'AfroTarn | Épicerie africaine à Gaillac',
  defaultDescription: 'AfroTarn, épicerie africaine à Gaillac : produits alimentaires, surgelés, boissons, cosmétiques, promotions et préparation de retrait en boutique.',
  googleSiteVerification: '',
  business: {
    legalName: 'AFROTARN EURL',
    name: 'AFROTARN',
    siren: '921742029',
    siret: '92174202900017',
    vatId: 'FR54921742029',
    telephone: '+33607077158',
    email: 'eliebakala@gmail.com',
    streetAddress: '70 rue du Château du Roi',
    postalCode: '81600',
    addressLocality: 'Gaillac',
    addressRegion: 'Occitanie',
    addressCountry: 'FR',
    registryUrl: 'https://annuaire-entreprises.data.gouv.fr/dirigeants/921742029#rne-dirigeants',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=70+rue+du+Chateau+du+Roi+81600+Gaillac',
  },
} as const

export type SeoRoute = {
  title: string
  description: string
  index: boolean
}

export const SEO_ROUTES: Record<string, SeoRoute> = {
  '/': {
    title: 'AfroTarn | Épicerie africaine à Gaillac',
    description: 'AfroTarn, épicerie africaine à Gaillac : produits alimentaires, surgelés, boissons, cosmétiques, promotions et conseils en boutique.',
    index: true,
  },
  '/produits': {
    title: 'Produits africains à Gaillac | AfroTarn',
    description: 'Découvrez le catalogue AfroTarn à Gaillac : plantain, manioc, attiéké, épices, sauces, poissons, saka-saka, soins et boissons.',
    index: true,
  },
  '/click-collect': {
    title: 'Préparer un retrait à Gaillac | AfroTarn',
    description: 'Préparez votre sélection de produits AfroTarn avant votre passage en boutique au 70 rue du Château du Roi à Gaillac.',
    index: true,
  },
  '/mentions-legales': {
    title: 'Mentions légales | AfroTarn',
    description: 'Mentions légales et informations sur AFROTARN EURL à Gaillac.',
    index: false,
  },
  '/cgv': {
    title: 'Conditions générales de vente | AfroTarn',
    description: 'Conditions générales applicables aux services et commandes AfroTarn.',
    index: false,
  },
  '/confidentialite': {
    title: 'Politique de confidentialité | AfroTarn',
    description: 'Informations sur la protection et le traitement des données personnelles sur le site AfroTarn.',
    index: false,
  },
  '/cookies': {
    title: 'Cookies | AfroTarn',
    description: 'Informations relatives aux cookies et technologies similaires utilisés sur le site AfroTarn.',
    index: false,
  },
  '/commande/confirmee': {
    title: 'Confirmation de commande | AfroTarn',
    description: 'Confirmation privée de commande AfroTarn.',
    index: false,
  },
}
