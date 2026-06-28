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
    requestAutoDownloadUsers: 'all' | string[]  // IDs users autorisés au dl auto sur approbation ; [] = désactivé
    jellyfinUrl         : string   // URL du serveur Jellyfin (ex: http://jellyfin:8096)
    jellyfinAdminToken  : string   // Token admin Jellyfin pour la sync
    englishDirectory    : boolean  // Si true, les dossiers de séries sont en anglais (ex: "Season 1" au lieu de "Saison 1")
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
    englishDirectory   : false,
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