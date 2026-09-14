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
  body: 'Une visite rapide des écrans principaux. Utilisez les flèches ← → pour naviguer et Échap pour quitter.',
}

const help = (isAdmin: boolean): TourStep => ({
  id: 'help', target: ['help'], placement: 'right',
  title: 'Besoin d\'aide ?',
  body: isAdmin
    ? 'Ce bouton relance la visite ou l\'assistant de configuration à tout moment (menu ☰ sur mobile).'
    : 'Ce bouton relance la visite à tout moment (menu ☰ sur mobile).',
})

const adminSteps: TourStep[] = [
  welcome,
  {
    id: 'dashboard', route: '/dashboard', target: ['dashboard-stats'], placement: 'bottom',
    title: 'Tableau de bord',
    body: 'Taille du catalogue, séries importées, téléchargements en cours et erreurs, en un coup d\'œil.',
  },
  {
    id: 'dashboard-requests', route: '/dashboard', target: ['dashboard-requests'], placement: 'top',
    title: 'Demandes en attente',
    body: 'Les demandes de vos utilisateurs arrivent ici, qu\'elles viennent de FanKarr ou du plugin Jellyfin.',
  },
  {
    id: 'series', route: '/series', target: ['series-poster', 'series-grid'], placement: 'right',
    title: 'Médiathèque',
    body: 'Tout le catalogue Fankai. Cliquez sur une affiche pour ouvrir la fiche : saisons, épisodes, téléchargement et surveillance.',
  },
  {
    id: 'series-toolbar', route: '/series', target: ['series-toolbar'], placement: 'bottom',
    title: 'Recherche et filtres',
    body: 'Cherchez une série, filtrez par disponibilité ou état d\'import, triez et changez la taille des affiches.',
  },
  {
    id: 'series-legend', route: '/series', target: ['series-legend'], placement: 'bottom',
    title: 'Barres d\'état',
    body: 'La barre sous chaque affiche indique où en est la série : importée, en cours, partielle ou pas encore là.',
  },
  {
    id: 'series-select', route: '/series', target: ['series-select'], placement: 'bottom',
    title: 'Actions groupées',
    body: 'Sélectionnez plusieurs séries pour les renommer ou les surveiller. Une série surveillée télécharge seule ses nouveaux épisodes.',
  },
  {
    id: 'requests', route: '/requests', target: ['requests-header'], placement: 'bottom',
    title: 'Demandes',
    body: 'Approuvez ou refusez les demandes. L\'approbation lance le téléchargement si des torrents existent.',
  },
  {
    id: 'activity', route: '/activity', target: ['activity-header'], placement: 'bottom',
    title: 'Activité',
    body: 'Suivi en direct des torrents FanKarr, import manuel et relance quand un fichier n\'a pas été reconnu.',
  },
  {
    id: 'settings', route: '/settings/download-client', target: ['nav-settings'], placement: 'right',
    title: 'Paramètres',
    body: 'Clients torrent, dossiers et mode d\'import, gestion des séries, catalogue, journaux, utilisateurs et Jellyfin.',
  },
  help(true),
]

const userSteps: TourStep[] = [
  welcome,
  {
    id: 'dashboard', route: '/dashboard', target: ['dashboard-stats'], placement: 'bottom',
    title: 'Tableau de bord',
    body: 'Le catalogue Fankai et les séries déjà disponibles au visionnage.',
  },
  {
    id: 'dashboard-requests', route: '/dashboard', target: ['dashboard-requests'], placement: 'top',
    title: 'Mes demandes',
    body: 'L\'état de vos dernières demandes.',
  },
  {
    id: 'series', route: '/series', target: ['series-poster', 'series-grid'], placement: 'right',
    title: 'Médiathèque',
    body: 'Ouvrez une fiche puis « Demander la série », ou choisissez une saison précise.',
  },
  {
    id: 'series-toolbar', route: '/series', target: ['series-toolbar'], placement: 'bottom',
    title: 'Recherche et filtres',
    body: 'Retrouvez rapidement une série et filtrez celles qui sont déjà disponibles.',
  },
  {
    id: 'requests', route: '/requests', target: ['requests-header'], placement: 'bottom',
    title: 'Demandes',
    body: 'Suivez vos demandes : en attente, approuvée, disponible ou refusée.',
  },
  {
    id: 'profile-token', route: '/settings/profile', target: ['profile-token'], placement: 'top',
    title: 'Token API',
    body: 'Ce token relie le plugin Jellyfin FanKarr Search à votre compte pour faire vos demandes depuis Jellyfin.',
  },
  help(false),
]

export function buildTourSteps(isAdmin: boolean): TourStep[] {
  return isAdmin ? adminSteps : userSteps
}
