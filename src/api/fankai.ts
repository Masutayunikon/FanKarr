const BASE = '/api'

export interface Production {
    id: number
    name: string
    description: string
    kaieur: string
    cover: string | null
    background: string | null
    banner: string | null
    status: string
    torrents: string | null
    multi: number
    link: string
    episodes_count: number
}

export interface Episode {
    id: number
    serie_id: number
    season_id: number
    name: string
    number: number
    cover: string | null
    duration: string
    description: string
    episodes: string
    path_jap: string | null
    path_fr: string | null
}

export interface Season {
    id: number
    serie_id: number
    name: string
    number: number
    cover: string | null
    episodes: Episode[]
}

export interface ProductionDetail extends Production {
    seasons: Season[]
    episodes: Episode[]
}

export interface Torrent {
    name: string
    url: string
}

// "Nom@url|Nom@url" en liste de torrents
export function parseTorrents(raw: string | null): Torrent[] {
    if (!raw) return []
    return raw.split('|').flatMap(item => {
        const parts = item.split('@')
        if (parts.length !== 2) return []
        return [{ name: parts[0] as string, url: parts[1] as string }]
    })
}

export function imageUrl(path: string | null): string | null {
    if (!path) return null
    const encoded = encodeURIComponent(`https://api.fankai.fr${path}`)
    return `https://fankai.fr/_next/image?url=${encoded}&w=640&q=100`
}

export async function fetchProductions(): Promise<Production[]> {
    const res = await fetch(`${BASE}/productions`)
    if (!res.ok) throw new Error('Impossible de charger le catalogue.')
    const data = await res.json()
    return data.pageProps.data
}

export async function fetchProduction(id: number, name: string): Promise<ProductionDetail> {
    const res = await fetch(`${BASE}/productions/${id}?name=${encodeURIComponent(name)}`)
    if (!res.ok) throw new Error('Impossible de charger la série.')
    const data = await res.json()
    return data.pageProps.data
}