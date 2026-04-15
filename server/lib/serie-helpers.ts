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

    const allEpisodeIds = new Set<number>()
    for (const season of serieData.seasons ?? []) {
        for (const ep of season.episodes ?? []) {
            allEpisodeIds.add(ep.id)
        }
    }

    const organizedEpisodeIds = new Set<number>()

    for (const t of allTorrents) {
        const hash = t.infohash?.toLowerCase()
        if (!hash) continue
        const orgFiles = organized[hash] ?? {}
        if (Object.keys(orgFiles).length === 0) continue
        for (const ep of buildResolvedEpisodes(serieData, hash, t.season_number)) {
            const isOrganized = orgFiles[String(ep.episode_id)] !== undefined || orgFiles[ep.filename] !== undefined
            if (isOrganized) organizedEpisodeIds.add(ep.episode_id)
        }
    }

    const manualOrg = organized['manual'] ?? {}
    for (const season of serieData.seasons ?? []) {
        for (const ep of season.episodes ?? []) {
            if (manualOrg[String(ep.id)]) organizedEpisodeIds.add(ep.id)
        }
    }

    if (allEpisodeIds.size === 0 || organizedEpisodeIds.size === 0) return 'none'
    if (organizedEpisodeIds.size >= allEpisodeIds.size) return 'complete'
    return 'partial'
}
