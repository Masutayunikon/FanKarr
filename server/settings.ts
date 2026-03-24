import fs from 'fs'
import path from 'path'
import { DATA_DIR } from './config.js'

const DATA_PATH = path.join(DATA_DIR, 'settings.json')

export interface Settings {
    mediaPath     : string
    completePath  : string
    organizeMode  : 'hardlink' | 'move'
    category      : string
    nfoSupport    : boolean
    autoImport    : boolean   // import automatique quand un torrent passe en seeding
}

const defaults: Settings = {
    mediaPath    : '',
    completePath : '',
    organizeMode : 'hardlink',
    category     : 'fankai',
    nfoSupport   : false,
    autoImport   : true,
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