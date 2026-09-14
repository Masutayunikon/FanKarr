export type RequestTorrent = { url: string; magnet: string | null; infohash: string | null; file_index?: number | null; file_path?: string | null }

/**
 * Torrents à envoyer pour une portée de demande.
 * episodes non vide → épisodes ciblés ; sinon seasons non vide → saisons ciblées ; sinon toute la série puis voila
 */
export function resolveRequestTorrents(serieData: any, seasons: number[], episodes: number[]): RequestTorrent[] {
    const toDownload: RequestTorrent[] = []
    const seenHashes = new Set<string>()

    const allPackTorrents: any[] = [
        ...(serieData.torrents ?? []),
        ...(serieData.seasons ?? []).flatMap((s: any) => s.torrents ?? []),
    ]

    function addTorrent(t: any, file_index?: number | null, file_path?: string | null) {
        const key = `${t.infohash ?? t.magnet ?? t.torrent_url}:${file_index ?? ''}`
        if (seenHashes.has(key)) return
        seenHashes.add(key)
        toDownload.push({ url: t.torrent_url, magnet: t.magnet ?? null, infohash: t.infohash ?? null, file_index: file_index ?? null, file_path: file_path ?? null })
    }

    /**
     * Ajoute le premier torrent disponible par épisode
     */
    function addEpisodesByIndex(epList: any[]) {
        for (const ep of epList) {
            if (ep.torrents?.length > 0) {
                // Premier torrent individuel disponible
                addTorrent(ep.torrents[0])
            } else if (ep.paths?.length > 0) {
                // Premier path dans un pack
                const p    = ep.paths[0]
                const pack = allPackTorrents.find((t: any) => t.infohash?.toLowerCase() === p.infohash?.toLowerCase())
                if (pack) addTorrent(pack, p.file_index ?? null, p.path ?? null)
            }
        }
    }

    if (episodes.length > 0) {
        // ── Épisodes ciblés ───────────────────────────────────────
        for (const season of serieData.seasons ?? []) {
            const targets = (season.episodes ?? []).filter((ep: any) => episodes.includes(ep.id))
            addEpisodesByIndex(targets)
        }
    } else if (seasons.length > 0) {
        // ── Saisons ciblées ───────────────────────────────────────
        for (const season of serieData.seasons ?? []) {
            if (!seasons.includes(season.season_number)) continue
            if ((season.torrents ?? []).length > 0) {
                // Premier pack saison disponible → télécharger en bloc
                addTorrent(season.torrents[0])
            } else {
                // Pas de pack → épisode par épisode avec file_index
                addEpisodesByIndex(season.episodes ?? [])
            }
        }
    } else {
        // ── Toutes les saisons : intégrale en priorité ────────────
        if ((serieData.torrents ?? []).length > 0) {
            addTorrent(serieData.torrents[0])
        } else if ((serieData.seasons ?? []).some((s: any) => s.torrents?.length > 0)) {
            // Packs saison (premier par saison)
            for (const season of serieData.seasons ?? []) {
                if (season.torrents?.length > 0) addTorrent(season.torrents[0])
            }
        } else {
            // Fallback : épisode par épisode avec file_index
            for (const season of serieData.seasons ?? []) {
                addEpisodesByIndex(season.episodes ?? [])
            }
        }
    }

    return toDownload
}

// Épisodes uniques concernés par la même portée
export function countRequestedEpisodes(serieData: any, seasons: number[], episodes: number[]): number {
    const keys = new Set<string>()
    for (const season of serieData.seasons ?? []) {
        for (const ep of season.episodes ?? []) {
            const inScope = episodes.length > 0
                ? episodes.includes(ep.id)
                : seasons.length === 0 || seasons.includes(season.season_number)
            if (inScope) keys.add(`${season.season_number}:${ep.episode_number}`)
        }
    }
    return keys.size
}
