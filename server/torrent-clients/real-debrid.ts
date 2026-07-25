/**
 * Real-Debrid Driver
 *
 * Real-Debrid est un service debrid cloud : les torrents téléchargent sur leurs serveurs,
 * puis les fichiers sont accessibles via des liens directs (HTTPS).
 *
 * Workflow FanKarr :
 *   1. add()  → POST /torrents/addMagnet puis selectFiles si file_index fourni
 *   2. list() → GET  /torrents  (filtre par status=downloaded pour state='seeding')
 *   3. remove() → DELETE /torrents/delete/{id}
 *
 * Le save_path de chaque torrent est construit à partir du localPath configuré
 * (dossier où l'utilisateur télécharge ses fichiers RD via FUSE, WebDAV ou autre).
 */

import type { TorrentClientDriver, TorrentInfo, TorrentFileProgress, DownloadOptions, ClientConfig } from './index.js'
import { logger } from '../logger.js'

const RD_BASE = 'https://api.real-debrid.com/rest/1.0'

function rdHeaders(config: ClientConfig) {
    return {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
    }
}

async function rdFetch(
    config : ClientConfig,
    method : 'GET' | 'POST' | 'DELETE',
    path   : string,
    body  ?: URLSearchParams,
): Promise<any> {
    const res = await fetch(`${RD_BASE}${path}`, {
        method,
        headers: rdHeaders(config),
        body   : body,
    })
    if (res.status === 204) return null
    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Real-Debrid HTTP ${res.status} : ${text}`)
    }
    return res.json()
}

function mapStatus(status: string): TorrentInfo['state'] {
    switch (status) {
        case 'downloaded':                  return 'seeding'
        case 'downloading':
        case 'queued':
        case 'compressing':
        case 'uploading':
        case 'magnet_conversion': return 'downloading'
        case 'waiting_files_selection':     return 'paused'
        case 'magnet_error':
        case 'error':
        case 'virus':
        case 'dead':              return 'error'
        default:                           return 'unknown'
    }
}

const rdDriver: TorrentClientDriver = {
    definition: {
        id    : 'real-debrid',
        label : 'Real-Debrid',
        fields: [
            { key: 'apiKey',    label: 'Clé API',              type: 'password', required: true },
            { key: 'localPath', label: 'Dossier local (FUSE/WebDAV/…)', type: 'text', placeholder: '/mnt/real-debrid', required: false },
        ],
    },

    async test(config) {
        try {
            const user = await rdFetch(config, 'GET', '/user')
            logger.info('real-debrid', `Connexion réussie — utilisateur : ${user.username}`)
            return { ok: true, message: `Connecté en tant que ${user.username}` }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erreur inconnue'
            logger.warn('real-debrid', `Test de connexion échoué : ${msg}`)
            return { ok: false, message: msg }
        }
    },

    async healthcheck(config) {
        try {
            const user = await rdFetch(config, 'GET', '/user')
            return { online: true, version: `RD — ${user.username}` }
        } catch {
            return { online: false }
        }
    },

    async add(config, url, options?: DownloadOptions) {
        const isMagnet  = url.startsWith('magnet:')
        const hash      = (options?.infohash?.toLowerCase() ?? null)
                       || url.match(/xt=urn:btih:([a-fA-F0-9]{40,})/i)?.[1]?.toLowerCase()
                       || null

        // Vérifier si le torrent est déjà présent sur RD
        if (hash) {
            try {
                const list: any[] = await rdFetch(config, 'GET', '/torrents')
                const existing = list.find((t: any) => t.hash?.toLowerCase() === hash)
                if (existing) {
                    logger.info('real-debrid', `Torrent ${hash.slice(0, 8)}… déjà présent sur RD`)
                    if (options?.file_index != null && existing.status === 'waiting_files_selection') {
                        const files: any[] = await rdFetch(config, 'GET', `/torrents/info/${existing.id}`)
                            .then((info: any) => info.files ?? [])
                        const fileId = files[options.file_index]?.id
                        if (fileId) {
                            await rdFetch(config, 'POST', `/torrents/selectFiles/${existing.id}`,
                                new URLSearchParams({ files: String(fileId) }))
                        }
                    }
                    return
                }
            } catch {}
        }

        let torrentId: string

        if (isMagnet) {
            const data = await rdFetch(config, 'POST', '/torrents/addMagnet',
                new URLSearchParams({ magnet: url }))
            torrentId = data.id
            logger.info('real-debrid', `Magnet ajouté → ID ${torrentId}`)
        } else {
            // URL de fichier .torrent : télécharger puis uploader
            const torrentRes = await fetch(url)
            if (!torrentRes.ok) throw new Error(`Impossible de télécharger le fichier .torrent : ${torrentRes.status}`)
            const torrentBuf = await torrentRes.arrayBuffer()
            const formData   = new FormData()
            formData.append('torrent', new Blob([torrentBuf], { type: 'application/x-bittorrent' }), 'torrent.torrent')
            const uploadRes  = await fetch(`${RD_BASE}/torrents/addTorrent`, {
                method : 'PUT',
                headers: { Authorization: `Bearer ${config.apiKey}` },
                body   : formData,
            })
            if (!uploadRes.ok) throw new Error(`Ajout .torrent échoué : ${uploadRes.status}`)
            const data = await uploadRes.json()
            torrentId  = data.id
            logger.info('real-debrid', `.torrent uploadé → ID ${torrentId}`)
        }

        // Sélection des fichiers
        if (options?.file_index != null) {
            // Attendre que la liste des fichiers soit disponible (état waiting_files_selection)
            let files: any[] = []
            for (let attempt = 0; attempt < 20; attempt++) {
                await new Promise(r => setTimeout(r, 500))
                try {
                    const info = await rdFetch(config, 'GET', `/torrents/info/${torrentId}`)
                    if (info.status === 'waiting_files_selection' && Array.isArray(info.files) && info.files.length > 0) {
                        files = info.files
                        break
                    }
                    if (info.status === 'downloading' || info.status === 'downloaded') break
                } catch {}
            }
            if (files.length > 0 && options.file_index < files.length) {
                const fileId = files[options.file_index]?.id
                if (fileId) {
                    await rdFetch(config, 'POST', `/torrents/selectFiles/${torrentId}`,
                        new URLSearchParams({ files: String(fileId) }))
                    logger.info('real-debrid', `Fichier ${options.file_index} sélectionné sur torrent RD ${torrentId}`)
                }
            } else if (files.length > 0) {
                // Sélectionner tous les fichiers si index hors limites
                await rdFetch(config, 'POST', `/torrents/selectFiles/${torrentId}`,
                    new URLSearchParams({ files: 'all' }))
            }
        } else {
            // Pas de sélection spécifique : tous les fichiers
            // Attendre waiting_files_selection pour envoyer "all"
            for (let attempt = 0; attempt < 10; attempt++) {
                await new Promise(r => setTimeout(r, 500))
                try {
                    const info = await rdFetch(config, 'GET', `/torrents/info/${torrentId}`)
                    if (info.status === 'waiting_files_selection') {
                        await rdFetch(config, 'POST', `/torrents/selectFiles/${torrentId}`,
                            new URLSearchParams({ files: 'all' }))
                        break
                    }
                    if (info.status !== 'magnet_conversion') break
                } catch {}
            }
        }
    },

    async list(config, _category?) {
        const torrents: any[] = await rdFetch(config, 'GET', '/torrents')
        const localBase = String(config.localPath ?? '').replace(/\/+$/, '')

        return torrents.map((t: any): TorrentInfo => {
            const progress = typeof t.progress === 'number' ? t.progress / 100 : 0
            // Construire un save_path "virtuel" à partir du localPath configuré + nom du torrent
            const save_path = localBase ? `${localBase}/${t.filename ?? t.id}` : ''

            // Les liens sont les fichiers téléchargés (disponibles si status=downloaded)
            const files: TorrentFileProgress[] | undefined =
                Array.isArray(t.files) && t.files.length > 0
                    ? t.files.map((f: any, i: number) => ({
                        index   : i,
                        name    : String(f.path ?? f.name ?? ''),
                        progress: f.selected ? progress : 0,
                    }))
                    : undefined

            return {
                hash      : String(t.hash ?? t.id ?? '').toLowerCase(),
                name      : String(t.filename ?? t.id ?? ''),
                state     : mapStatus(t.status ?? ''),
                progress  : Math.round(progress * 100),
                size      : typeof t.bytes === 'number' ? t.bytes : 0,
                downloaded: typeof t.bytes === 'number' ? Math.round(t.bytes * progress) : 0,
                uploaded  : 0,
                ratio     : 0,
                speed     : typeof t.speed === 'number' ? t.speed : 0,
                upspeed   : 0,
                eta       : -1,
                save_path,
                category  : '',
                files,
            }
        })
    },

    async remove(config, hash, _deleteFiles?) {
        // Retrouver l'ID RD depuis le hash
        const list: any[] = await rdFetch(config, 'GET', '/torrents')
        const target = list.find((t: any) => String(t.hash ?? t.id ?? '').toLowerCase() === hash.toLowerCase())
        if (!target) throw new Error(`Torrent ${hash.slice(0, 8)}… introuvable sur Real-Debrid`)
        await rdFetch(config, 'DELETE', `/torrents/delete/${target.id}`)
        logger.info('real-debrid', `Torrent ${hash.slice(0, 8)}… supprimé de Real-Debrid`)
    },

    async getFiles(config, hash) {
        const list: any[] = await rdFetch(config, 'GET', '/torrents')
        const target = list.find((t: any) => String(t.hash ?? t.id ?? '').toLowerCase() === hash.toLowerCase())
        if (!target) return []
        const info = await rdFetch(config, 'GET', `/torrents/info/${target.id}`)
        const overallProgress = typeof info.progress === 'number' ? info.progress / 100 : 0
        if (!Array.isArray(info.files)) return []
        return info.files.map((f: any, i: number) => ({
            index   : i,
            name    : String(f.path ?? f.name ?? ''),
            progress: f.selected ? overallProgress : 0,
        }))
    },
}

export default rdDriver
