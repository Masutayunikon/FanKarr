import fs from 'fs'
import path from 'path'
import { DATA_DIR } from './config.js'

const DATA_PATH = path.join(DATA_DIR, 'settings.json')

export interface Settings {
    mediaPath           : string
    completePath        : string
    organizeMode        : 'hardlink' | 'copy' | 'move'
    category            : string
    nfoSupport          : boolean
    autoImport          : boolean
    devMode             : boolean
    deleteTorrentOnMove : boolean
    requestAutoDownloadUsers: 'all' | string[]  // Utilisateurs dont les demandes sont approuvées et téléchargées automatiquement ; [] = aucun
    jellyfinUrl         : string   // URL du serveur Jellyfin (ex. http://jellyfin:8096)
    jellyfinAdminToken  : string   // Clé API Jellyfin pour l'import des utilisateurs
    jellyfinLogin       : boolean  // Connexion à l'interface web avec un compte Jellyfin importé
    jellyfinNewUserLogin: boolean  // Connexion des comptes Jellyfin pas encore importés (compte créé à la première connexion)
    jellyfinAutoImport  : boolean  // Import horaire de tous les utilisateurs Jellyfin actifs
    jellyfinServerId    : string   // Identifiant du serveur Jellyfin, comparé à chaque connexion
    englishDirectory   : boolean  // Dossiers de saison en anglais (« Season 01 » au lieu de « Saison 1 »)
    autoUnimportMissing : boolean
    onboardingStep      : string | null   // étape la plus avancée atteinte dans l'assistant
    onboardingCompletedAt: string | null
}

const defaults: Settings = {
    mediaPath          : '',
    completePath       : '',
    organizeMode       : 'hardlink',
    category           : 'fankai',
    nfoSupport         : false,
    autoImport         : true,
    devMode            : false,
    deleteTorrentOnMove: false,
    requestAutoDownloadUsers: [],
    jellyfinUrl        : '',
    jellyfinAdminToken : '',
    jellyfinLogin      : true,
    jellyfinNewUserLogin: false,
    jellyfinAutoImport : true,
    jellyfinServerId   : '',
    englishDirectory  : false,
    autoUnimportMissing: false,
    onboardingStep     : null,
    onboardingCompletedAt: null,
}

export function readSettings(): Settings {
    try {
        if (!fs.existsSync(DATA_PATH)) return { ...defaults }
        return { ...defaults, ...JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8')) }
    } catch { return { ...defaults } }
}

export function writeSettings(settings: Partial<Settings>): Settings {
    const current = readSettings()
    const updated = { ...current, ...settings }
    fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true })
    fs.writeFileSync(DATA_PATH, JSON.stringify(updated, null, 2))
    return updated
}