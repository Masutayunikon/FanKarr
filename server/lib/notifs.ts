import fs from 'fs'
import path from 'path'
import { DATA_DIR } from '../config.js'

export interface OrganizeNotif {
    hash: string; name: string; serieId?: number | null; done: number; skipped: number; errors: number
    errorFiles: { file: string; error: string }[]; at: string
}

export interface RecentSerieImport { serieId: number; episodes: number; at: string }

const HISTORY_PATH = path.join(DATA_DIR, 'import-history.json')
const MAX_HISTORY  = 200
const RECENT_WINDOW_MS = 7 * 24 * 60 * 60_000

function loadHistory(): OrganizeNotif[] {
    try {
        if (!fs.existsSync(HISTORY_PATH)) return []
        const data = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'))
        return Array.isArray(data) ? data.slice(0, MAX_HISTORY) : []
    } catch { return [] }
}

function saveHistory(): void {
    try {
        fs.mkdirSync(path.dirname(HISTORY_PATH), { recursive: true })
        fs.writeFileSync(HISTORY_PATH, JSON.stringify(recentOrganized, null, 2))
    } catch {}
}

// Du plus récent au plus ancien
export const recentOrganized: OrganizeNotif[] = loadHistory()

export function pushNotif(n: OrganizeNotif) {
    recentOrganized.unshift(n)
    if (recentOrganized.length > MAX_HISTORY) recentOrganized.length = MAX_HISTORY
    saveHistory()
}

export function clearNotifs() {
    recentOrganized.length = 0
    saveHistory()
}

export function recentImportsBySerie(): RecentSerieImport[] {
    const bySerie = new Map<number, RecentSerieImport>()
    for (const n of recentOrganized) {
        if (n.serieId == null || n.done <= 0) continue
        const current = bySerie.get(n.serieId)
        if (!current) { bySerie.set(n.serieId, { serieId: n.serieId, episodes: n.done, at: n.at }); continue }
        if (Date.parse(current.at) - Date.parse(n.at) <= RECENT_WINDOW_MS) current.episodes += n.done
    }
    return [...bySerie.values()]
}
