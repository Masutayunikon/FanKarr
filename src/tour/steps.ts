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
    ? 'Ce bouton relance la visite ou l\'assistant de configuration à tout moment. Sur mobile, ouvrez le menu de votre avatar en haut de l\'Accueil.'
    : 'Ce bouton relance la visite à tout moment. Sur mobile, ouvrez le menu de votre avatar en haut de l\'Accueil.',
})

const adminSteps: TourStep[] = [
  welcome,
  {
    id: 'dashboard', route: '/dashboard', target: ['dashboard-stats'], placement: 'top',
    title: 'Accueil',
    body: 'Le dernier import en grand, les séries ajoutées récemment, et les chiffres du catalogue : séries dans la médiathèque et séries surveillées.',
  },
  {
    id: 'dashboard-requests', route: '/dashboard', target: ['dashboard-requests'], placement: 'left',
    title: 'À traiter',
    body: 'Demandes en attente, imports en erreur et dossiers à renommer : chaque ligne porte son action. Les demandes arrivent de FanKarr ou du plugin Jellyfin.',
  },
  {
    id: 'series', route: '/series', target: ['series-poster', 'series-grid'], placement: 'right',
    title: 'Médiathèque',
    body: 'Tout le catalogue Fankai. L\'état est écrit sur l\'affiche : importée, partielle, en téléchargement, erreur, dossier à renommer ou sans torrent. Cliquez pour ouvrir la fiche.',
  },
  {
    id: 'series-toolbar', route: '/series', target: ['series-toolbar'], placement: 'bottom',
    title: 'Recherche et filtres',
    body: 'Chaque filtre affiche son nombre de séries ; « Plus » garde les filtres secondaires. Triez, et changez la taille des affiches.',
  },
  {
    id: 'series-select', route: '/series', target: ['series-select'], placement: 'bottom',
    title: 'Actions groupées',
    body: 'Sélectionnez plusieurs séries pour les renommer ou les surveiller. Une série surveillée télécharge seule ses nouveaux épisodes.',
  },
  {
    id: 'requests', route: '/requests', target: ['requests-header'], placement: 'bottom',
    title: 'Demandes',
    body: '« Approuver et télécharger » lance le téléchargement ; une demande sans torrent est signalée avant d\'être approuvée. Les demandes avec torrent s\'approuvent aussi en une fois.',
  },
  {
    id: 'activity', route: '/activity', target: ['activity-header'], placement: 'bottom',
    title: 'Activité',
    body: 'Une ligne par torrent, du téléchargement à l\'import. Les onglets séparent ce qui est en cours, à importer ou en erreur ; une erreur d\'import s\'affiche dans sa ligne, avec de quoi relancer.',
  },
  {
    id: 'settings', route: '/settings/download-client', target: ['settings-menu', 'nav-settings'], placement: 'right',
    title: 'Paramètres',
    body: 'Les réglages sont rangés en quatre groupes : Compte (profil, utilisateurs), Médias (dossiers, séries, catalogue), Services (clients torrent, Jellyfin) et Système (journaux, avancé).',
  },
  help(true),
]

const userSteps: TourStep[] = [
  welcome,
  {
    id: 'dashboard', route: '/dashboard', target: ['dashboard-stats'], placement: 'top',
    title: 'Accueil',
    body: 'Les nouveautés de la médiathèque et le nombre de séries prêtes à regarder.',
  },
  {
    id: 'dashboard-requests', route: '/dashboard', target: ['dashboard-requests'], placement: 'left',
    title: 'Mes demandes',
    body: 'L\'état de vos dernières demandes. Juste en dessous, « Pas encore là » propose des séries à demander en un clic.',
  },
  {
    id: 'series', route: '/series', target: ['series-poster', 'series-grid'], placement: 'right',
    title: 'Médiathèque',
    body: 'Toutes les séries du catalogue. Celles qui ne sont pas encore là sont assombries : ouvrez la fiche pour demander la série, une saison ou un épisode.',
  },
  {
    id: 'series-toolbar', route: '/series', target: ['series-toolbar'], placement: 'bottom',
    title: 'Recherche et filtres',
    body: 'Retrouvez une série et filtrez : prêtes à regarder, bientôt là, pas encore là ou vos demandes.',
  },
  {
    id: 'requests', route: '/requests', target: ['requests-header'], placement: 'bottom',
    title: 'Mes demandes',
    body: 'Suivez vos demandes : en attente, bientôt là, disponible ou refusée. Une demande en attente peut encore être annulée.',
  },
  {
    id: 'profile-token', route: '/settings/profile', target: ['profile-token'], placement: 'top',
    title: 'Jeton d’API',
    body: 'Ce jeton relie le plugin Jellyfin FanKarr Search à votre compte pour faire vos demandes depuis Jellyfin. Le choix de l’accent de couleur se fait juste à côté.',
  },
  help(false),
]

export function buildTourSteps(isAdmin: boolean): TourStep[] {
  return isAdmin ? adminSteps : userSteps
}
