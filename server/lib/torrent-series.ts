import fs from 'fs'
import path from 'path'
import { DATA_DIR } from '../config.js'

// Série depuis laquelle un torrent a été envoyé. Un même torrent peut appartenir à
// plusieurs séries du catalogue (ex. One Piece Kaï et One Piece Yabai) : sans cette
// information, l'import choisirait toujours la première série trouvée.
// torrent_series.json : Record<infohash, serieId[]>

const TORRENT_SERIES_PATH = path.join(DATA_DIR, 'torrent_series.json')

export function loadTorrentSeries(): Record<string, number[]> {
    try {
        if (!fs.existsSync(TORRENT_SERIES_PATH)) return {}
        return JSON.parse(fs.readFileSync(TORRENT_SERIES_PATH, 'utf-8'))
    } catch { return {} }
}

export function addTorrentSerie(infohash: string | null | undefined, serieId: number | null | undefined): void {
    if (!infohash || serieId == null || !Number.isFinite(Number(serieId))) return
    const h    = infohash.toLowerCase()
    const id   = Number(serieId)
    const data = loadTorrentSeries()
    const list = data[h] ?? []
    if (list.includes(id)) return
    data[h] = [...list, id]
    try {
        fs.mkdirSync(path.dirname(TORRENT_SERIES_PATH), { recursive: true })
        fs.writeFileSync(TORRENT_SERIES_PATH, JSON.stringify(data, null, 2), 'utf-8')
    } catch {}
}

/** Séries enregistrées pour ce hash (vide si inconnu). */
export function getTorrentSeries(infohash: string | null | undefined): number[] {
    if (!infohash) return []
    return loadTorrentSeries()[infohash.toLowerCase()] ?? []
}
