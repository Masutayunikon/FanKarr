/**
 * Transmission Driver
 */

import type { TorrentClientDriver, TorrentInfo } from './index.js'
import { logger } from '../logger.js'

function mapState(status: number): TorrentInfo['state'] {
    // Transmission status codes :
    // 0 = stopped, 1 = check queued, 2 = checking, 3 = download queued,
    // 4 = downloading, 5 = seed queued, 6 = seeding
    if (status === 4 || status === 3) return 'downloading'
    if (status === 6 || status === 5) return 'seeding'
    if (status === 0)                 return 'paused'
    if (status === 1 || status === 2) return 'checking'
    return 'unknown'
}

async function trRequest(
    config: Record<string, string | number>,
    method: string,
    args: Record<string, unknown> = {},
    sessionId = ''
): Promise<{ result: string; arguments?: any; sessionId?: string }> {
    const headers: Record<string, string> = {
        'Content-Type'              : 'application/json',
        'X-Transmission-Session-Id': sessionId,
    }

    if (config.username && config.password) {
        headers['Authorization'] = 'Basic ' + btoa(`${config.username}:${config.password}`)
    }

    const res = await fetch(`${config.url}/transmission/rpc`, {
        method : 'POST',
        headers,
        body   : JSON.stringify({ method, arguments: args }),
    })

    // Transmission renvoie 409 avec le session ID à la première requête
    if (res.status === 409) {
        const newSessionId = res.headers.get('X-Transmission-Session-Id') ?? ''
        if (!newSessionId) throw new Error('Session ID introuvable dans la réponse 409')
        return trRequest(config, method, args, newSessionId)
    }

    if (!res.ok) throw new Error(`Transmission HTTP ${res.status}`)

    const data = await res.json()
    if (data.result !== 'success') throw new Error(`Transmission erreur : ${data.result}`)

    return { ...data, sessionId }
}

const TR: TorrentClientDriver = {
    definition: {
        id    : 'transmission',
        label : 'Transmission',
        fields: [
            { key: 'url',      label: 'URL',            type: 'url',      placeholder: 'http://localhost:9091', required: true },
            { key: 'username', label: 'Identifiant',    type: 'text',     placeholder: 'transmission',         required: false },
            { key: 'password', label: 'Mot de passe',   type: 'password', placeholder: '••••••••',             required: false },
            { key: 'category', label: 'Catégorie',      type: 'text',     placeholder: 'fankai',               required: false, default: 'fankai' },
            { key: 'savePath',   label: 'Dossier cible',          type: 'text', placeholder: '/downloads/fankai',     required: false },
            { key: 'remotePath', label: 'Chemin distant (client)', type: 'text', placeholder: '/downloads',           required: false },
            { key: 'localPath',  label: 'Chemin local (FanKarr)',  type: 'text', placeholder: '/mnt/nas/downloads',   required: false },
        ],
    },

    async test(config) {
        try {
            await trRequest(config, 'session-get')
            logger.info('transmission', `Test de connexion réussi sur ${config.url}`)
            return { ok: true, message: 'Connexion réussie' }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erreur inconnue'
            logger.warn('transmission', `Test de connexion échoué sur ${config.url} : ${msg}`)
            return { ok: false, message: msg }
        }
    },

    async healthcheck(config) {
        try {
            const data = await trRequest(config, 'session-get')
            const version = data.arguments?.version ?? 'inconnue'
            logger.debug('transmission', `Healthcheck OK — version ${version}`)
            return { online: true, version }
        } catch (err) {
            logger.debug('transmission', `Healthcheck échoué : ${err instanceof Error ? err.message : err}`)
            return { online: false }
        }
    },

    async list(config, category) {
        const fields = [
            'hashString', 'name', 'status', 'percentDone', 'totalSize',
            'downloadedEver', 'uploadedEver', 'uploadRatio',
            'rateDownload', 'rateUpload', 'eta', 'downloadDir', 'labels',
        ]
        const data = await trRequest(config, 'torrent-get', { fields })
        const torrents: any[] = data.arguments?.torrents ?? []

        return torrents
            .filter(t => {
                if (!category) return true
                return t.labels?.includes(category)
            })
            .map(t => ({
                hash      : t.hashString,
                name      : t.name,
                state     : mapState(t.status),
                progress  : Math.round(t.percentDone * 100),
                size      : t.totalSize,
                downloaded: t.downloadedEver,
                uploaded  : t.uploadedEver ?? 0,
                ratio     : Math.round((t.uploadRatio ?? 0) * 100) / 100,
                speed     : t.rateDownload,
                upspeed   : t.rateUpload ?? 0,
                eta       : t.eta ?? -1,
                save_path : t.downloadDir,
                category  : t.labels?.[0] ?? '',
            } satisfies TorrentInfo))
    },

    async add(config, url) {
        const args: Record<string, unknown> = { filename: url }

        if (config.savePath) {
            args['download-dir'] = String(config.savePath)
        }

        if (config.category) {
            args['labels'] = [String(config.category)]
        }

        await trRequest(config, 'torrent-add', args)
        logger.info('transmission', `Torrent ajouté avec succès (catégorie: ${config.category ?? 'aucune'}${config.savePath ? `, dossier: ${config.savePath}` : ''})`)
    },

    async remove(config, hash, deleteFiles = false) {
        // Transmission identifie les torrents par ID numérique — on cherche via la liste
        const data = await trRequest(config, 'torrent-get', { fields: ['hashString', 'id'] })
        const torrents: any[] = data.arguments?.torrents ?? []
        const found = torrents.find(t => t.hashString?.toLowerCase() === hash.toLowerCase())
        if (!found) throw new Error(`Torrent ${hash.slice(0, 8)}… introuvable`)
        await trRequest(config, 'torrent-remove', { ids: [found.id], 'delete-local-data': deleteFiles })
        logger.info('transmission', `Torrent ${hash.slice(0, 8)}… supprimé${deleteFiles ? ' (avec fichiers)' : ''}`)
    },
}

export default TR