import type { TorrentClientDriver, TorrentInfo, TorrentFileProgress, DownloadOptions } from './index.js'
import { logger } from '../logger.js'

const AD_BASE  = 'https://api.alldebrid.com/v4'
const AD_AGENT = 'FanKarr'

function adUrl(config: Record<string, string | number>, path: string): string {
    const sep = path.includes('?') ? '&' : '?'
    return `${AD_BASE}${path}${sep}agent=${AD_AGENT}&apikey=${config.apiKey}`
}

async function adFetch(
    config: Record<string, string | number>,
    method: 'GET' | 'POST' | 'DELETE',
    path  : string,
    body ?: URLSearchParams | FormData,
): Promise<any> {
    const res = await fetch(adUrl(config, path), { method, body })
    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`AllDebrid HTTP ${res.status} : ${text}`)
    }
    const json = await res.json()
    if (json.status === 'error') {
        throw new Error(`AllDebrid : ${json.error?.message ?? json.error?.code ?? 'Erreur inconnue'}`)
    }
    return json.data
}

// statusCode : 0=Processing, 1=Downloading, 2=Compressing, 3=Uploading, 4=Ready,
//              5=Upload Fail, 6=Internal Error, 7=Not Downloaded, 8=File Not Available,
//              9=Banned BitTorrent, 10=Awaiting Slot, 11=Free Trial Limit Reached
function mapStatus(statusCode: number): TorrentInfo['state'] {
    switch (statusCode) {
        case 4:  return 'seeding'
        case 1:
        case 0:
        case 2:
        case 3:
        case 10: return 'downloading'
        case 5:
        case 6:
        case 7:
        case 8:
        case 9:
        case 11: return 'error'
        default: return 'unknown'
    }
}

function flattenFiles(nodes: any[], prefix = '', startIdx = 0): TorrentFileProgress[] {
    const result: TorrentFileProgress[] = []
    let idx = startIdx
    for (const node of nodes) {
        if (node.e) {
            const children = flattenFiles(node.e, prefix ? `${prefix}/${node.n}` : node.n, idx)
            result.push(...children)
            idx += children.length
        } else if (node.n) {
            result.push({ index: idx++, name: prefix ? `${prefix}/${node.n}` : node.n, progress: 0, priority: 1 })
        }
    }
    return result
}

const adDriver: TorrentClientDriver = {
    definition: {
        id    : 'alldebrid',
        label : 'AllDebrid',
        fields: [
            { key: 'apiKey',    label: 'Clé API',                        type: 'password', required: true },
            { key: 'localPath', label: 'Dossier local (FUSE/WebDAV/…)',  type: 'text', placeholder: '/mnt/alldebrid', required: false },
        ],
    },

    async test(config) {
        try {
            const data = await adFetch(config, 'GET', '/user')
            const username = data.user?.username ?? data.user?.login ?? '?'
            logger.info('alldebrid', `Connexion réussie — utilisateur : ${username}`)
            return { ok: true, message: `Connecté en tant que ${username}` }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erreur inconnue'
            logger.warn('alldebrid', `Test de connexion échoué : ${msg}`)
            return { ok: false, message: msg }
        }
    },

    async healthcheck(config) {
        try {
            const data = await adFetch(config, 'GET', '/user')
            const username = data.user?.username ?? data.user?.login ?? '?'
            return { online: true, version: `AD — ${username}` }
        } catch {
            return { online: false }
        }
    },

    async add(config, url, options?: DownloadOptions) {
        const isMagnet = url.startsWith('magnet:')
        const hash = (options?.infohash?.toLowerCase() ?? null)
            || url.match(/xt=urn:btih:([a-fA-F0-9]{40,})/i)?.[1]?.toLowerCase()
            || null

        if (hash) {
            try {
                const data     = await adFetch(config, 'GET', '/magnet/status')
                const magnets: any[] = data.magnets ?? []
                const existing = magnets.find((m: any) => m.hash?.toLowerCase() === hash)
                if (existing) {
                    logger.info('alldebrid', `Torrent ${hash.slice(0, 8)}… déjà présent sur AllDebrid`)
                    return
                }
            } catch {}
        }

        if (isMagnet) {
            const body = new URLSearchParams()
            body.append('magnets[]', url)
            const data = await adFetch(config, 'POST', '/magnet/upload', body)
            const id   = data.magnets?.[0]?.id
            logger.info('alldebrid', `Magnet ajouté → ID ${id}`)
        } else {
            const torrentRes = await fetch(url)
            if (!torrentRes.ok) throw new Error(`Impossible de télécharger le fichier .torrent : ${torrentRes.status}`)
            const torrentBuf = await torrentRes.arrayBuffer()
            const formData   = new FormData()
            formData.append('files[]', new Blob([torrentBuf], { type: 'application/x-bittorrent' }), 'torrent.torrent')
            const data = await adFetch(config, 'POST', '/magnet/upload/file', formData)
            const id   = data.magnets?.[0]?.id
            logger.info('alldebrid', `.torrent uploadé → ID ${id}`)
        }
    },

    async list(config, _category?) {
        const data     = await adFetch(config, 'GET', '/magnet/status')
        const magnets: any[] = data.magnets ?? []
        const localBase = String(config.localPath ?? '').replace(/\/+$/, '')

        return magnets.map((m: any): TorrentInfo => {
            const statusCode = typeof m.statusCode === 'number' ? m.statusCode : 0
            const size       = typeof m.size       === 'number' ? m.size       : 0
            const downloaded = typeof m.downloaded === 'number' ? m.downloaded : 0
            const progress   = size > 0
                ? Math.round((downloaded / size) * 100)
                : (statusCode === 4 ? 100 : 0)
            const save_path  = localBase ? `${localBase}/${m.filename ?? m.id}` : ''

            return {
                hash      : String(m.hash ?? m.id ?? '').toLowerCase(),
                name      : String(m.filename ?? m.id ?? ''),
                state     : mapStatus(statusCode),
                progress,
                size,
                downloaded,
                uploaded  : 0,
                ratio     : 0,
                speed     : typeof m.speed === 'number' ? m.speed : 0,
                upspeed   : 0,
                eta       : typeof m.eta   === 'number' ? m.eta   : -1,
                save_path,
                category  : '',
            }
        })
    },

    async remove(config, hash, _deleteFiles?) {
        const data     = await adFetch(config, 'GET', '/magnet/status')
        const magnets: any[] = data.magnets ?? []
        const target   = magnets.find((m: any) => String(m.hash ?? m.id ?? '').toLowerCase() === hash.toLowerCase())
        if (!target) throw new Error(`Torrent ${hash.slice(0, 8)}… introuvable sur AllDebrid`)
        await adFetch(config, 'DELETE', `/magnet/delete?id=${target.id}`)
        logger.info('alldebrid', `Torrent ${hash.slice(0, 8)}… supprimé de AllDebrid`)
    },

    async getFiles(config, hash) {
        const data     = await adFetch(config, 'GET', '/magnet/status')
        const magnets: any[] = data.magnets ?? []
        const target   = magnets.find((m: any) => String(m.hash ?? m.id ?? '').toLowerCase() === hash.toLowerCase())
        if (!target) return []

        const detail = await adFetch(config, 'GET', `/magnet/status?id=${target.id}`)
        const magnet = Array.isArray(detail.magnets) ? detail.magnets[0] : detail

        const statusCode = typeof magnet.statusCode === 'number' ? magnet.statusCode : 0
        const size       = typeof magnet.size       === 'number' ? magnet.size       : 0
        const downloaded = typeof magnet.downloaded === 'number' ? magnet.downloaded : 0
        const overallProgress = size > 0 ? downloaded / size : (statusCode === 4 ? 1 : 0)

        if (!Array.isArray(magnet.files)) return []

        return flattenFiles(magnet.files).map(f => ({ ...f, progress: overallProgress }))
    },
}

export default adDriver
