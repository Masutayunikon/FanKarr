import type { TorrentClientDriver, TorrentInfo, TorrentFileProgress, DownloadOptions } from './index.js'
import { logger } from '../logger.js'

const AD_BASE    = 'https://api.alldebrid.com/v4.1'
const AD_BASE_V4 = 'https://api.alldebrid.com/v4'
const AD_AGENT   = 'FanKarr'

function adUrl(config: Record<string, string | number>, path: string, base = AD_BASE): string {
    const sep = path.includes('?') ? '&' : '?'
    return `${base}${path}${sep}agent=${AD_AGENT}&apikey=${config.apiKey}`
}

async function adFetch(
    config: Record<string, string | number>,
    method: 'GET' | 'POST' | 'DELETE',
    path  : string,
    body ?: URLSearchParams | FormData,
    base  = AD_BASE,
): Promise<any> {
    const res = await fetch(adUrl(config, path, base), { method, body })
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
// hasLocalMount : true si un chemin local (FUSE/WebDAV) est configuré.
// Sans montage local, statusCode 4 ("prêt sur les serveurs AD") ne doit pas
// déclencher l'import FanKarr — les fichiers ne sont pas encore sur le disque.
function mapStatus(statusCode: number, hasLocalMount: boolean): TorrentInfo['state'] {
    switch (statusCode) {
        case 4:  return hasLocalMount ? 'seeding' : 'downloading'
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
        if (options?.file_index != null)
            logger.warn('alldebrid', `Sélection de fichier (index ${options.file_index}) non supportée par AllDebrid — pack complet téléchargé`)

        const isMagnet = url.startsWith('magnet:')

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
            // save_path = dossier PARENT (comme qBittorrent), sans le nom du torrent.
            // Le worker construit lui-même le chemin complet via getFiles().
            const save_path  = localBase

            const eta = (typeof m.completionDate === 'number' && m.completionDate > 0)
                ? Math.max(0, m.completionDate - Math.floor(Date.now() / 1000))
                : -1

            return {
                hash      : String(m.hash ?? m.id ?? '').toLowerCase(),
                name      : String(m.filename ?? m.id ?? ''),
                state     : mapStatus(statusCode, Boolean(localBase)),
                progress,
                size,
                downloaded,
                uploaded  : typeof m.uploaded      === 'number' ? m.uploaded      : 0,
                ratio     : 0,
                speed     : typeof m.downloadSpeed === 'number' ? m.downloadSpeed : 0,
                upspeed   : typeof m.uploadSpeed   === 'number' ? m.uploadSpeed   : 0,
                eta,
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

        const statusCode      = typeof target.statusCode === 'number' ? target.statusCode : 0
        const size            = typeof target.size       === 'number' ? target.size       : 0
        const downloaded      = typeof target.downloaded === 'number' ? target.downloaded : 0
        const overallProgress = size > 0 ? downloaded / size : (statusCode === 4 ? 1 : 0)

        const body = new URLSearchParams()
        body.append('id[]', String(target.id))
        const filesData   = await adFetch(config, 'POST', '/magnet/files', body, AD_BASE_V4)
        const magnetEntry = (filesData.magnets ?? [])[0]

        if (!Array.isArray(magnetEntry?.files)) return []

        return flattenFiles(magnetEntry.files).map(f => ({ ...f, progress: overallProgress }))
    },
}

export default adDriver
