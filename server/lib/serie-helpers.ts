const FANKAI_API = 'https://metadata.fankai.fr'

export async function fankaiGet(endpoint: string): Promise<any> {
    const res = await fetch(`${FANKAI_API}${endpoint}`)
    if (!res.ok) throw new Error(`Fankai API ${res.status}: ${endpoint}`)
    return res.json()
}

export function imgProxy(url: string | null | undefined, w: number, q = 70): string | null {
    if (!url) return null
    const stripped = url.replace(/^https?:\/\//, '')
    return `https://wsrv.nl/?url=${stripped}&w=${w}&q=${q}`
}

export function normalizeSerie(serie: any): any {
    return { ...serie, poster_image: imgProxy(serie.poster_image ?? serie.images?.poster ?? null, 300), fanart_image: imgProxy(serie.fanart_image ?? serie.images?.fanart ?? null, 1280, 60) }
}

export function normalizeSeason(season: any): any {
    return { ...season, poster_image: imgProxy(season.poster_image ?? season.images?.poster ?? null, 300) }
}

export function normalizeEpisode(ep: any): any {
    return { ...ep, thumb_image: imgProxy(ep.thumb_image ?? ep.thumbnail ?? null, 400) }
}

export function extractTorrentsFromSerieData(sd: any): any[] {
    const result: any[] = []
    if (!sd) return result
    for (const t of sd.torrents ?? []) {
        result.push({ ...t, raw: t.title, type: 'pack_integrale', serie_id: sd.id, serie_title: sd.title, _serieLevel: true, _serieData: sd, _torrentIdx: (sd.torrents ?? []).indexOf(t) })
    }
    for (const season of sd.seasons ?? []) {
        for (const t of season.torrents ?? []) {
            result.push({ ...t, raw: t.title, type: 'pack_saison', serie_id: sd.id, serie_title: sd.title, season_id: season.id, season_number: season.season_number, _seasonLevel: true, _season: season, _torrentIdx: (season.torrents ?? []).indexOf(t) })
        }
        for (const ep of season.episodes ?? []) {
            for (const t of ep.torrents ?? []) {
                result.push({ ...t, raw: t.title, type: 'episode', serie_id: sd.id, serie_title: sd.title, season_id: season.id, season_number: season.season_number, episode_id: ep.id, episode_number: ep.episode_number, _episodeLevel: true, _episode: ep, _torrentIdx: (ep.torrents ?? []).indexOf(t) })
            }
        }
    }
    return result
}

/**
 * Résout les noms d'un épisode en préférant les valeurs du path entry
 * correspondant au hash donné (spécifique au torrent/encoding),
 * avec fallback sur les champs de niveau épisode.
 *
 * Utilisation :
 *   const { formatted_name, nfo_filename, original_filename } = resolveEpNaming(ep, hash)
 */
export function resolveEpNaming(ep: any, hash?: string | null): {
    formatted_name   : string | null
    nfo_filename     : string | null
    original_filename: string | null
} {
    const h = hash?.toLowerCase() ?? null
    const pathEntry = h
        ? (ep.paths ?? []).find((p: any) => typeof p === 'object' && p.infohash?.toLowerCase() === h)
        : null
    return {
        formatted_name   : pathEntry?.formatted_name    ?? ep.formatted_name    ?? null,
        nfo_filename     : pathEntry?.nfo_filename      ?? ep.nfo_filename      ?? null,
        original_filename: pathEntry?.original_filename ?? ep.original_filename ?? null,
    }
}

/**
 * Dédoublonne une liste d'épisodes par episode_number.
 * Quand plusieurs variantes existent (ex. x264 + x265), on garde la première
 * comme épisode principal et on fusionne les torrents des autres dans sa liste.
 */
export function deduplicateEpisodes(episodes: any[]): any[] {
    const map = new Map<number, any>()
    for (const ep of episodes) {
        const key = ep.episode_number
        if (!map.has(key)) {
            map.set(key, { ...ep, torrents: [...(ep.torrents ?? [])] })
        } else {
            const primary = map.get(key)!
            const seenHashes = new Set(primary.torrents.map((t: any) => t.infohash).filter(Boolean))
            for (const t of ep.torrents ?? []) {
                if (!t.infohash || !seenHashes.has(t.infohash)) {
                    primary.torrents.push(t)
                    if (t.infohash) seenHashes.add(t.infohash)
                }
            }
            primary.torrent   = primary.torrents[0] ?? null
            primary.available = primary.available || ep.available
            primary.organized = primary.organized || ep.organized
        }
    }
    return Array.from(map.values())
}

export function buildResolvedEpisodes(sd: any, hash: string, seasonFilter?: number): any[] {
    const resolved: any[] = []
    const h = hash.toLowerCase()
    for (const season of sd.seasons ?? []) {
        if (seasonFilter !== undefined && season.season_number !== seasonFilter) continue
        for (const ep of season.episodes ?? []) {
            const paths: any[] = ep.paths ?? []
            let filePath: string | null = null
            for (const p of paths) {
                if (typeof p === 'string') { if (!filePath) filePath = p.replace(/\\/g, '/') }
                else if (p?.infohash?.toLowerCase() === h) { filePath = p.path.replace(/\\/g, '/'); break }
            }
            if (!filePath) continue
            const filename = filePath.split('/').pop() ?? filePath
            resolved.push({ episode_id: ep.id, episode_number: ep.episode_number, season_number: season.season_number, season_id: season.id, filename, original_filename: filename })
        }
    }
    return resolved
}

export function computeSerieDownloadState(serieData: any | null, organized: Record<string, Record<string, any>>, activeTorrents: Set<string>): 'none' | 'downloading' | 'partial' | 'complete' {
    if (!serieData) return 'none'
    const allTorrents = extractTorrentsFromSerieData(serieData)

    if (allTorrents.some(t => t.infohash && activeTorrents.has(t.infohash.toLowerCase()))) return 'downloading'

    // Dédoublonnage : épisodes uniques par (season_number, episode_number)
    // pour éviter de compter x264 + x265 comme deux épisodes distincts
    const uniqueEpKeys = new Set<string>()
    const epIdToKey    = new Map<number, string>()
    for (const season of serieData.seasons ?? []) {
        for (const ep of season.episodes ?? []) {
            const key = `${season.season_number}:${ep.episode_number}`
            uniqueEpKeys.add(key)
            epIdToKey.set(ep.id, key)
        }
    }

    const organizedEpKeys = new Set<string>()

    for (const t of allTorrents) {
        const hash = t.infohash?.toLowerCase()
        if (!hash) continue
        const orgFiles = organized[hash] ?? {}
        if (Object.keys(orgFiles).length === 0) continue
        for (const ep of buildResolvedEpisodes(serieData, hash, t.season_number)) {
            const isOrganized = orgFiles[String(ep.episode_id)] !== undefined || orgFiles[ep.filename] !== undefined
            if (isOrganized) {
                const key = epIdToKey.get(ep.episode_id)
                if (key) organizedEpKeys.add(key)
            }
        }
    }

    const manualOrg = organized['manual'] ?? {}
    for (const season of serieData.seasons ?? []) {
        for (const ep of season.episodes ?? []) {
            if (manualOrg[String(ep.id)]) {
                const key = epIdToKey.get(ep.id)
                if (key) organizedEpKeys.add(key)
            }
        }
    }

    if (uniqueEpKeys.size === 0 || organizedEpKeys.size === 0) return 'none'
    if (organizedEpKeys.size >= uniqueEpKeys.size) return 'complete'
    return 'partial'
}
