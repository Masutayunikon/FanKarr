import { listFr, plural } from '@/utils/format'

export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'completed'

export interface Requester { userId: string; username: string; seasons: number[]; episodes: number[]; requestedAt: string }

export interface SerieRequest {
    id: string; serieId: number; serieName: string
    requesters: Requester[]; status: RequestStatus
    rejectionMessage?: string; createdAt: string; updatedAt: string
    episodeCount?: number | null
    hasTorrents?: boolean
}

export function mergedSeasons(req: SerieRequest): number[] {
    if (req.requesters.some(r => r.seasons.length === 0 && (r.episodes?.length ?? 0) === 0)) return []
    const all = new Set<number>()
    req.requesters.forEach(r => r.seasons.forEach(s => all.add(s)))
    return [...all].sort((a, b) => a - b)
}

export function mergedEpisodes(req: SerieRequest): number[] {
    const all = new Set<number>()
    req.requesters.forEach(r => (r.episodes ?? []).forEach(e => all.add(e)))
    return [...all].sort((a, b) => a - b)
}

export function seasonsLabel(seasons: number[]): string {
    if (seasons.length === 0) return 'Toutes les saisons'
    const nums = seasons.filter(s => s > 0).map(String)
    const specials = seasons.includes(0)
    if (nums.length === 0) return 'Spéciaux'
    const label = `${nums.length > 1 ? 'Saisons' : 'Saison'} ${listFr(nums)}`
    return specials ? `${label}, spéciaux` : label
}

// « Saisons 3 et 4 », « 2 épisodes », « Toutes les saisons »
export function scopeLabel(req: SerieRequest): string {
    const episodes = mergedEpisodes(req)
    if (episodes.length > 0) return plural(episodes.length, 'épisode')
    return seasonsLabel(mergedSeasons(req))
}

export function requesterNames(req: SerieRequest): string {
    return req.requesters.map(r => r.username).join(', ')
}
