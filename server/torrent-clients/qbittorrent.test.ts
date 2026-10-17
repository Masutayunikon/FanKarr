import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import QB, { _resetQbListCache } from './qbittorrent.js'

const config = { url: 'http://qb', apiKey: 'k' }

function torrent(hash: string, extra: Record<string, unknown> = {}) {
    return { hash, name: hash, state: 'uploading', progress: 1, size: 100, amount_left: 0,
             downloaded: 100, dlspeed: 0, eta: 0, save_path: '/d', category: 'fankai', ...extra }
}

let torrents: any[] = []
let filesCalls: string[] = []
let inFlight = 0
let maxInFlight = 0

beforeEach(() => {
    _resetQbListCache()
    filesCalls = []; inFlight = 0; maxInFlight = 0
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        const u = new URL(url)
        if (u.pathname === '/api/v2/torrents/info') return new Response(JSON.stringify(torrents))
        if (u.pathname === '/api/v2/torrents/files') {
            const h = u.searchParams.get('hash')!
            filesCalls.push(h)
            inFlight++; maxInFlight = Math.max(maxInFlight, inFlight)
            await new Promise(r => setTimeout(r, 5))
            inFlight--
            return new Response(JSON.stringify([{ name: `${h}.mkv`, progress: 1, priority: 1 }]))
        }
        return new Response('', { status: 404 })
    }))
})
afterEach(() => { vi.unstubAllGlobals() })

describe('qbittorrent list()', () => {
    it('ne relit les fichiers que des torrents modifiés', async () => {
        torrents = [torrent('a'), torrent('b'), torrent('c')]
        const first = await QB.list(config, 'fankai')
        expect(filesCalls.sort()).toEqual(['a', 'b', 'c'])
        expect(first[0].files?.[0].name).toBe('a.mkv')

        filesCalls = []
        const second = await QB.list(config, 'fankai')
        expect(filesCalls).toEqual([])
        expect(second[1].files?.[0].name).toBe('b.mkv')

        torrents = [torrent('a'), torrent('b', { state: 'downloading', progress: 0.5 }), torrent('c')]
        filesCalls = []
        await QB.list(config, 'fankai')
        expect(filesCalls).toEqual(['b'])
    })

    it('limite le nombre de requêtes /files simultanées', async () => {
        torrents = Array.from({ length: 20 }, (_, i) => torrent(`h${i}`))
        await QB.list(config, 'fankai')
        expect(filesCalls).toHaveLength(20)
        expect(maxInFlight).toBeLessThanOrEqual(4)
    })

    it('partage une même requête entre appels simultanés', async () => {
        torrents = [torrent('a'), torrent('b')]
        const [r1, r2] = await Promise.all([QB.list(config, 'fankai'), QB.list(config, 'fankai')])
        expect(filesCalls).toHaveLength(2)
        expect(r1).toEqual(r2)
    })
})
