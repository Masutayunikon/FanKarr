import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface TorrentRef {
    torrent_url: string | null
    magnet: string | null
    type: string
    raw?: string | null
    infohash?: string | null
    torrent_name?: string | null
    file_index?: number | null
    file_path?: string | null
    fankai?: boolean
    manual?: boolean
}

export interface Episode {
    id: number
    episode_number: number
    display_episode: number | null
    title: string
    plot: string | null
    aired: string | null
    duration: number | null
    thumb_image: string | null
    has_thumbnail: boolean
    season_id: number
    available: boolean
    organized: boolean
    fankai: boolean | null
    torrent: TorrentRef | null
    torrents: TorrentRef[]
}

export interface Season {
    id: number
    season_number: number
    title: string
    plot: string | null
    poster_image: string | null
    episode_count: number
    premiered: string | null
    episodes: Episode[]
    torrent: TorrentRef | null
    torrents: TorrentRef[]
    organized_state: 'none' | 'partial' | 'complete'
    organized_count: number
}

export interface Serie {
    id: number
    title: string
    sort_title: string
    plot: string | null
    poster_image: string | null
    fanart_image: string | null
    year: number | null
    status: string | null
    torrent_count: number
    has_torrents: boolean
    download_state: 'none' | 'downloading' | 'partial' | 'complete'
    in_client: boolean
    has_files: boolean
    rss_synced: boolean
}

export interface SerieDetail {
    serie: Serie
    seasons: Season[]
    scraper_synced: boolean
    torrents_integrale: { label: string; raw: string; torrent_url: string | null; magnet: string | null; infohash: string | null; torrent_name: string | null }[]
}

export const useSeriesStore = defineStore('series', () => {
    const series = ref<Serie[]>([])
    const currentSerie = ref<SerieDetail | null>(null)
    const loadingSeries = ref(false)
    const loadingDetail = ref(false)
    const error = ref<string | null>(null)

    const _imageCache = new Set<string>()

    async function fetchSeries() {
        loadingSeries.value = true
        error.value = null
        try {
            const res = await fetch('/api/series')
            if (!res.ok) throw new Error(`Erreur ${res.status}`)
            const data = await res.json()
            series.value = data.series
            // Précache des posters en arrière-plan
            for (const s of data.series as Serie[]) {
                if (s.poster_image && !_imageCache.has(s.poster_image)) {
                    _imageCache.add(s.poster_image)
                    new Image().src = s.poster_image
                }
            }
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Erreur inconnue'
        } finally {
            loadingSeries.value = false
        }
    }

    async function fetchSerieDetail(id: number) {
        loadingDetail.value = true
        error.value = null
        currentSerie.value = null
        try {
            const res = await fetch(`/api/series/${id}`)
            if (!res.ok) throw new Error(`Erreur ${res.status}`)
            currentSerie.value = await res.json()
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Erreur inconnue'
        } finally {
            loadingDetail.value = false
        }
    }

    async function download(torrent_url: string | null, magnet: string | null, file_index?: number | null, file_path?: string | null, infohash?: string | null): Promise<{ success: boolean; error?: string }> {
        try {
            const res = await fetch('/api/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ torrent_url, magnet, file_index: file_index ?? null, file_path: file_path ?? null, infohash: infohash ?? null })
            })
            const data = await res.json()
            if (res.ok) return { success: true }
            return { success: false, error: data.error }
        } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : 'Erreur inconnue' }
        }
    }

    return {
        series, currentSerie,
        loadingSeries, loadingDetail, error,
        fetchSeries, fetchSerieDetail, download
    }
})