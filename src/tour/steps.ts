export type TourPlacement = 'top' | 'right' | 'bottom' | 'left'

export interface TourStep {
  id        : string
  route?    : string
  target?   : string[]
  title     : string
  body      : string
  placement?: TourPlacement
}

const welcome: TourStep = {
  id: 'welcome',
  title: 'Bienvenue dans FanKarr',
  body: 'Une visite rapide des écrans principaux. Au clavier : touches fléchées pour avancer ou revenir, Échap pour quitter.',
}

const help = (isAdmin: boolean): TourStep => ({
  id: 'help', target: ['help'], placement: 'right',
  title: "Besoin d'aide ?",
  body: isAdmin
    ? "Ce bouton relance la visite ou l'assistant de configuration. Sur mobile, ces options sont dans le menu de votre avatar, en haut de l'Accueil et des Paramètres."
    : "Ce bouton relance la visite. Sur mobile, elle se trouve dans le menu de votre avatar, en haut de l'Accueil et des Paramètres.",
})

const adminSteps: TourStep[] = [
  welcome,
  {
    id: 'dashboard', route: '/dashboard', target: ['dashboard-main', 'dashboard-stats'], placement: 'right',
    title: 'Accueil',
    body: 'Le dernier import, les séries ajoutées récemment et les chiffres clés : séries au catalogue, dans la médiathèque et surveillées.',
  },
  {
    id: 'dashboard-requests', route: '/dashboard', target: ['dashboard-requests'], placement: 'left',
    title: 'À traiter',
    body: "Demandes en attente, imports en erreur et dossiers à renommer, chacun avec son bouton d'action. Les demandes viennent de FanKarr ou du plugin Jellyfin.",
  },
  {
    id: 'series', route: '/series', target: ['series-poster', 'series-grid'], placement: 'right',
    title: 'Médiathèque',
    body: "Tout le catalogue Fankai. Chaque affiche indique l'état de la série (importée, partielle, en téléchargement…). Cliquez dessus pour ouvrir sa fiche.",
  },
  {
    id: 'series-toolbar', route: '/series', target: ['series-toolbar'], placement: 'bottom',
    title: 'Recherche et filtres',
    body: 'Chaque filtre indique son nombre de séries, les filtres secondaires sont sous « Plus ». Vous pouvez aussi trier et changer la taille des affiches.',
  },
  {
    id: 'series-select', route: '/series', target: ['series-select'], placement: 'bottom',
    title: 'Actions groupées',
    body: 'Sélectionnez plusieurs séries pour renommer leurs fichiers ou les surveiller. FanKarr télécharge automatiquement les nouveaux épisodes des séries surveillées.',
  },
  {
    id: 'requests', route: '/requests', target: ['requests-header'], placement: 'bottom',
    title: 'Demandes',
    body: 'Approuvez ou refusez les demandes des invités. « Approuver et télécharger » envoie aussi le torrent au client ; les demandes sans torrent sont signalées. Le bouton du haut approuve toutes celles qui ont un torrent.',
  },
  {
    id: 'activity', route: '/activity', target: ['activity-header'], placement: 'bottom',
    title: 'Activité',
    body: "Un torrent par ligne, du téléchargement à l'import. Les onglets séparent les torrents en cours, à importer et en erreur. En cas d'erreur d'import, un bouton « Réessayer » apparaît sur la ligne.",
  },
  {
    id: 'settings', route: '/settings/download-client', target: ['settings-menu', 'nav-settings'], placement: 'right',
    title: 'Paramètres',
    body: 'Quatre groupes de réglages : Compte, Médias, Services (clients torrent, Jellyfin) et Système.',
  },
  help(true),
]

const userSteps: TourStep[] = [
  welcome,
  {
    id: 'dashboard', route: '/dashboard', target: ['dashboard-main', 'dashboard-stats'], placement: 'right',
    title: 'Accueil',
    body: 'Les nouveautés de la médiathèque et le nombre de séries prêtes à regarder.',
  },
  {
    id: 'dashboard-requests', route: '/dashboard', target: ['dashboard-requests'], placement: 'left',
    title: 'Vos dernières demandes',
    body: "Leur état en un coup d'œil. Juste en dessous, « Pas encore là » suggère des séries que vous pouvez demander.",
  },
  {
    id: 'series', route: '/series', target: ['series-poster', 'series-grid'], placement: 'right',
    title: 'Médiathèque',
    body: 'Toutes les séries du catalogue. Celles qui ne sont pas encore là sont assombries : ouvrez leur fiche pour demander la série, une saison ou un épisode.',
  },
  {
    id: 'series-toolbar', route: '/series', target: ['series-toolbar'], placement: 'bottom',
    title: 'Recherche et filtres',
    body: 'Cherchez une série ou filtrez : « Prêtes à regarder », « Bientôt là », « Pas encore là » ou « Mes demandes ».',
  },
  {
    id: 'requests', route: '/requests', target: ['requests-header'], placement: 'bottom',
    title: 'Mes demandes',
    body: 'Suivez vos demandes : en attente, bientôt là, disponible ou refusée. Une demande en attente peut encore être annulée.',
  },
  {
    id: 'profile-token', route: '/settings/profile', target: ['profile-token'], placement: 'top',
    title: "Jeton d'API",
    body: "Ce jeton relie le plugin Jellyfin FanKarr Search à votre compte, pour faire vos demandes depuis Jellyfin. Sur cette page, vous pouvez aussi changer la couleur de l'interface.",
  },
  help(false),
]

export function buildTourSteps(isAdmin: boolean): TourStep[] {
  return isAdmin ? adminSteps : userSteps
}
