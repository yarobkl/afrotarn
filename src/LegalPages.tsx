import { Link } from 'react-router-dom'
import './legal.css'

type LegalKind = 'mentions' | 'cgv' | 'confidentialite' | 'cookies'

const company = {
  legalName: 'AFROTARN EURL',
  tradeName: 'AFROTARN',
  form: 'EURL / SARL unipersonnelle',
  capital: '1 000 €',
  address: '70 rue du Château du Roi, 81600 Gaillac, France',
  siren: '921 742 029',
  siret: '921 742 029 00017',
  rcs: '921 742 029 R.C.S. Albi',
  vat: 'FR54 921742029',
  ape: '47.11B — Commerce d’alimentation générale',
  manager: 'Estelle Millet-Lacombe',
  phone: '06 07 07 71 58',
  phoneHref: '+33607077158',
  email: 'eliebakala@gmail.com',
}

function LegalHeader({ current }: { current: LegalKind }) {
  const items: Array<[LegalKind, string, string]> = [
    ['mentions', 'Mentions légales', '/mentions-legales'],
    ['cgv', 'CGV', '/cgv'],
    ['confidentialite', 'Confidentialité', '/confidentialite'],
    ['cookies', 'Cookies', '/cookies'],
  ]
  return <>
    <header className="legal-header">
      <Link to="/" className="legal-brand"><strong>AFROTARN</strong><span>Gaillac · Épicerie & culture</span></Link>
      <Link to="/" className="legal-back">Retour au site</Link>
    </header>
    <nav className="legal-tabs" aria-label="Pages légales">
      {items.map(([key, label, href]) => <Link key={key} className={current === key ? 'is-active' : ''} to={href}>{label}</Link>)}
    </nav>
  </>
}

function LegalShell({ current, title, intro, children }: { current: LegalKind; title: string; intro: string; children: React.ReactNode }) {
  return <div className="legal-shell">
    <LegalHeader current={current} />
    <main className="legal-main">
      <div className="legal-title"><span>INFORMATIONS LÉGALES</span><h1>{title}</h1><p>{intro}</p></div>
      <article className="legal-card">{children}</article>
    </main>
    <footer className="legal-footer">
      <div>© 2026 AFROTARN · {company.siren}</div>
      <div className="legal-footer-links"><Link to="/mentions-legales">Mentions légales</Link><Link to="/cgv">CGV</Link><Link to="/confidentialite">Confidentialité</Link><Link to="/cookies">Cookies</Link></div>
      <div>Développé par <a href="https://www.yaroconsulting.fr" target="_blank" rel="noreferrer">Yaro Consulting</a></div>
    </footer>
  </div>
}

export function MentionsLegales() {
  return <LegalShell current="mentions" title="Mentions légales" intro="Informations relatives à l’éditeur, à l’exploitation et à l’hébergement du site AfroTarn.">
    <section><h2>1. Éditeur du site</h2><p>Le présent site est édité par <strong>{company.legalName}</strong>, exploitant l’enseigne <strong>{company.tradeName}</strong>.</p><dl><div><dt>Forme juridique</dt><dd>{company.form}</dd></div><div><dt>Capital social</dt><dd>{company.capital}</dd></div><div><dt>Siège social</dt><dd>{company.address}</dd></div><div><dt>SIREN</dt><dd>{company.siren}</dd></div><div><dt>SIRET</dt><dd>{company.siret}</dd></div><div><dt>RCS</dt><dd>{company.rcs}</dd></div><div><dt>TVA intracommunautaire</dt><dd>{company.vat}</dd></div><div><dt>Code APE</dt><dd>{company.ape}</dd></div></dl><p>Activité déclarée : vente de produits alimentaires, plats à emporter, ainsi que produits accessoires liés au bien-être culinaire et au soin de soi.</p></section>
    <section><h2>2. Direction de la publication</h2><p>La directrice de la publication est <strong>{company.manager}</strong>, gérante de {company.legalName}.</p></section>
    <section><h2>3. Contact</h2><p>Téléphone : <a href={`tel:${company.phoneHref}`}>{company.phone}</a><br />E-mail : <a href={`mailto:${company.email}`}>{company.email}</a><br />Adresse : {company.address}</p></section>
    <section><h2>4. Hébergement</h2><p>Le site est hébergé par <strong>Vercel Inc.</strong>, 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis. Le service est accessible à l’adresse vercel.com.</p></section>
    <section><h2>5. Conception et développement</h2><p>Conception et développement : <a href="https://www.yaroconsulting.fr" target="_blank" rel="noreferrer"><strong>Yaro Consulting</strong></a>.</p></section>
    <section><h2>6. Propriété intellectuelle</h2><p>Les éléments propres à AfroTarn présents sur le site — textes, identité visuelle, organisation des contenus, éléments graphiques et contenus produits par l’éditeur — sont protégés par les règles applicables à la propriété intellectuelle. Toute reproduction ou réutilisation substantielle sans autorisation préalable est interdite, sous réserve des droits attachés aux contenus de tiers éventuellement utilisés.</p></section>
    <section><h2>7. Responsabilité</h2><p>AfroTarn s’efforce de maintenir des informations exactes et à jour. Les disponibilités, arrivages, horaires et informations commerciales peuvent toutefois évoluer. Pour une information urgente ou avant un déplacement, le client peut contacter directement la boutique.</p></section>
  </LegalShell>
}

export function Cgv() {
  return <LegalShell current="cgv" title="Conditions générales de vente" intro="Conditions applicables au catalogue, aux demandes de retrait et, lorsqu’elle sera activée, à la vente en ligne AfroTarn.">
    <section><h2>1. Objet et vendeur</h2><p>Les présentes conditions encadrent les relations entre <strong>{company.legalName}</strong> et ses clients consommateurs utilisant le site AfroTarn pour consulter les produits, constituer une sélection, demander un retrait ou, lorsque le service est activé, passer une commande à distance.</p></section>
    <section><h2>2. Produits et disponibilité</h2><p>Les caractéristiques essentielles des produits sont présentées sur leurs fiches. Les photographies sont illustratives. Les produits frais, surgelés et références d’importation sont soumis aux arrivages et à la disponibilité réelle en boutique. Une indisponibilité constatée après une demande de retrait donne lieu à une information du client et, si un paiement a été encaissé, à une annulation ou un remboursement selon le moyen de paiement utilisé.</p></section>
    <section><h2>3. Prix</h2><p>Les prix destinés au consommateur sont exprimés en euros, toutes taxes comprises. <strong>Tant que le paiement en ligne n’est pas activé et que la phase de démonstration du catalogue n’est pas clôturée, certains prix affichés sur le site peuvent être indicatifs ou de démonstration.</strong> Le prix confirmé par AfroTarn avant validation définitive de la commande ou le prix affiché en boutique prévaut. Avant toute activation d’un encaissement en ligne, les prix du catalogue devront être remplacés par les tarifs commerciaux réels de la boutique.</p></section>
    <section><h2>4. Sélection, demande de retrait et commande</h2><p>L’ajout d’un article dans « Ma liste » ne constitue pas à lui seul une vente. Lorsque le site fonctionne en mode demande de retrait, le client transmet sa sélection à AfroTarn qui confirme ensuite la disponibilité et les modalités de retrait. Si un paiement sécurisé est activé, la commande devient ferme après validation du paiement et émission d’une confirmation de commande, sous réserve des contrôles de disponibilité.</p></section>
    <section><h2>5. Paiement</h2><p>Les moyens de paiement disponibles sont indiqués au moment de la validation. Lorsque le paiement en ligne est proposé, il est traité par un prestataire de paiement sécurisé. AfroTarn n’a pas vocation à conserver les données complètes de carte bancaire. En l’absence d’activation effective du paiement en ligne, le choix d’un moyen de paiement dans l’interface ne vaut pas débit.</p></section>
    <section><h2>6. Retrait en boutique</h2><p>Le retrait s’effectue à l’adresse suivante : <strong>{company.address}</strong>, pendant les horaires d’ouverture et après confirmation de préparation lorsque celle-ci est requise. Le client peut être invité à communiquer son nom ou son numéro de commande pour identifier le retrait.</p></section>
    <section><h2>7. Droit de rétractation</h2><p>Lorsqu’un contrat est effectivement conclu à distance, le consommateur bénéficie en principe d’un délai légal de rétractation de quatorze jours, sous réserve des exceptions prévues par le Code de la consommation. Le droit de rétractation peut notamment être exclu pour les biens susceptibles de se détériorer ou de se périmer rapidement, ainsi que pour certains produits descellés ne pouvant être renvoyés pour des raisons d’hygiène ou de protection de la santé.</p></section>
    <section><h2>8. Garanties légales</h2><p>Les consommateurs bénéficient des garanties légales applicables, notamment de la garantie légale de conformité et de la garantie contre les vices cachés, dans les conditions prévues par la réglementation française.</p></section>
    <section><h2>9. Réclamations</h2><p>Toute réclamation peut être adressée à AfroTarn par e-mail à <a href={`mailto:${company.email}`}>{company.email}</a>, par téléphone au <a href={`tel:${company.phoneHref}`}>{company.phone}</a> ou par courrier au siège social.</p></section>
    <section className="legal-attention"><h2>10. Médiation de la consommation</h2><p>AFROTARN doit communiquer au consommateur les coordonnées du médiateur de la consommation auquel l’entreprise a effectivement adhéré. <strong>Cette information ne peut pas être inventée à partir du registre des entreprises.</strong> Elle devra être ajoutée ici avant l’ouverture complète de la vente en ligne dès que l’organisme choisi par AFROTARN sera confirmé.</p></section>
    <section><h2>11. Données personnelles</h2><p>Les traitements de données liés aux demandes, commandes et retraits sont décrits dans la <Link to="/confidentialite">Politique de confidentialité</Link>.</p></section>
    <section><h2>12. Droit applicable</h2><p>Les présentes conditions sont soumises au droit français. Les règles impératives de protection du consommateur demeurent applicables.</p></section>
  </LegalShell>
}

export function Confidentialite() {
  return <LegalShell current="confidentialite" title="Politique de confidentialité" intro="Comment AfroTarn utilise et protège les données personnelles collectées dans le cadre du site et des commandes.">
    <section><h2>1. Responsable du traitement</h2><p>Le responsable du traitement est <strong>{company.legalName}</strong>, {company.address}. Contact : <a href={`mailto:${company.email}`}>{company.email}</a>.</p></section>
    <section><h2>2. Données susceptibles d’être traitées</h2><p>Selon les fonctions utilisées, AfroTarn peut traiter les informations communiquées par le client : nom, adresse e-mail, téléphone, contenu de la sélection ou de la commande, historique et statut des commandes, ainsi que les données techniques nécessaires à la sécurité et au fonctionnement du service.</p><p>La liste de produits enregistrée sur le navigateur peut également être conservée localement sur l’appareil afin de maintenir « Ma liste » entre deux visites.</p></section>
    <section><h2>3. Finalités et bases juridiques</h2><ul><li>répondre aux demandes et préparer un retrait : mesures précontractuelles demandées par le client ;</li><li>gérer les commandes, paiements, retraits et service après-vente : exécution du contrat ;</li><li>respecter les obligations comptables, fiscales et légales : obligation légale ;</li><li>sécuriser le site, prévenir les abus et maintenir le service : intérêt légitime de l’entreprise ;</li><li>envoyer des communications commerciales, uniquement lorsqu’une base légale ou un consentement valable le permet.</li></ul></section>
    <section><h2>4. Destinataires et prestataires</h2><p>Les données sont accessibles à AfroTarn et, dans la stricte mesure nécessaire, à ses prestataires techniques. Le site utilise notamment <strong>Vercel</strong> pour l’hébergement et <strong>Supabase</strong> pour certains services de base de données et d’authentification. Si le paiement en ligne ou l’envoi transactionnel d’e-mails sont activés, des prestataires spécialisés tels qu’un prestataire de paiement ou d’e-mail peuvent recevoir les seules données nécessaires à leur mission.</p></section>
    <section><h2>5. Paiement</h2><p>Lorsque le paiement en ligne est activé, les données bancaires complètes sont collectées et traitées directement par le prestataire de paiement sécurisé. AfroTarn ne doit pas stocker les numéros complets de carte bancaire dans sa base de données.</p></section>
    <section><h2>6. Durées de conservation</h2><p>Les données sont conservées pendant une durée proportionnée à leur finalité. Les données nécessaires aux commandes et à la facturation peuvent être archivées pendant les durées légales applicables, notamment jusqu’à dix ans pour les pièces comptables. Les données utilisées à des fins de prospection sont conservées selon les durées prévues ou recommandées par la réglementation et la CNIL, généralement pendant la relation commerciale puis trois ans à compter de la fin de celle-ci ou du dernier contact selon le cas.</p></section>
    <section><h2>7. Transferts internationaux</h2><p>Certains prestataires techniques peuvent être établis ou opérer hors de l’Espace économique européen. Lorsque cela implique un transfert de données personnelles, les mécanismes de protection requis par la réglementation applicable doivent être mis en place par le responsable du traitement et ses prestataires.</p></section>
    <section><h2>8. Vos droits</h2><p>Dans les conditions prévues par le RGPD et la loi Informatique et Libertés, vous pouvez demander l’accès à vos données, leur rectification, leur effacement, la limitation du traitement, vous opposer à certains traitements, exercer votre droit à la portabilité lorsque celui-ci est applicable et retirer un consentement à tout moment.</p><p>Pour exercer ces droits : <a href={`mailto:${company.email}`}>{company.email}</a>. Vous pouvez également introduire une réclamation auprès de la CNIL.</p></section>
    <section><h2>9. Sécurité</h2><p>AfroTarn et ses prestataires mettent en œuvre des mesures techniques et organisationnelles destinées à protéger les données contre l’accès non autorisé, l’altération ou la perte, dans la limite des risques raisonnablement maîtrisables.</p></section>
  </LegalShell>
}

export function Cookies() {
  return <LegalShell current="cookies" title="Cookies et stockage local" intro="Informations sur les traceurs et mécanismes de stockage utilisés par le site AfroTarn.">
    <section><h2>1. Fonctionnement actuel</h2><p>Dans sa configuration actuelle, le site AfroTarn n’a pas vocation à déposer de cookies publicitaires ou de profilage. Il utilise principalement des mécanismes techniques nécessaires au fonctionnement du service, notamment le stockage local du navigateur pour conserver temporairement la sélection de produits et le stockage de session pour l’accès administrateur.</p></section>
    <section><h2>2. Stockage strictement nécessaire</h2><p>Le contenu de « Ma liste » peut être enregistré dans le stockage local du navigateur afin que l’utilisateur retrouve sa sélection. Ce mécanisme répond à une fonctionnalité expressément demandée par l’utilisateur. Les informations liées à une session administrateur sont réservées à l’espace de gestion et ne servent pas au suivi publicitaire des visiteurs.</p></section>
    <section><h2>3. Services tiers</h2><p>Le site peut contacter des services techniques indispensables à son fonctionnement, tels que l’hébergeur, la base de données ou des ressources externes. Un lien vers un service externe, par exemple une carte ou un itinéraire, ne signifie pas qu’AfroTarn dépose lui-même les cookies de ce service avant que l’utilisateur ne s’y rende.</p></section>
    <section><h2>4. Évolution du site</h2><p>Si AfroTarn ajoute ultérieurement des outils de mesure d’audience, publicité, réseaux sociaux ou autres traceurs soumis au consentement, ceux-ci ne devront être activés qu’après le recueil d’un choix valable lorsque la loi l’exige. L’utilisateur devra pouvoir accepter, refuser et modifier son choix aussi facilement.</p></section>
    <section><h2>5. Gestion depuis le navigateur</h2><p>L’utilisateur peut supprimer les données de stockage local et les cookies depuis les réglages de son navigateur. La suppression de certains éléments techniques peut entraîner la perte de la sélection enregistrée ou la déconnexion d’un espace sécurisé.</p></section>
  </LegalShell>
}
