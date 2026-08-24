/**
 * Transmission Driver
 */

import type { TorrentClientDriver, TorrentInfo, DownloadOptions, ClientConfig } from './index.js'
import { clientFetch } from './index.js'
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
    config: ClientConfig,
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

    const res = await clientFetch(config, `${config.url}/transmission/rpc`, {
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

async function trGetIdByHash(config: ClientConfig, hash: string): Promise<number | null> {
    const data     = await trRequest(config, 'torrent-get', { fields: ['hashString', 'id'] })
    const torrents = data.arguments?.torrents ?? []
    return torrents.find((t: any) => t.hashString?.toLowerCase() === hash.toLowerCase())?.id ?? null
}

/**
 * Attend que les métadonnées soient disponibles (polling 500 ms),
 * puis applique les priorités : fichier cible voulu, tous les autres ignorés.
 */
async function trApplyFilePriority(
    config   : ClientConfig,
    hash     : string,
    fileIndex: number,
): Promise<void> {
    for (let attempt = 0; attempt < 100; attempt++) {
        await new Promise(r => setTimeout(r, 500))
        try {
            const id = await trGetIdByHash(config, hash)
            if (id == null) continue

            const data  = await trRequest(config, 'torrent-get', { ids: [id], fields: ['files'] })
            const files = data.arguments?.torrents?.[0]?.files
            if (!Array.isArray(files) || files.length === 0) continue

            const unwanted = files.map((_: any, i: number) => i).filter((i: number) => i !== fileIndex)
            await trRequest(config, 'torrent-set', {
                ids              : [id],
                'files-wanted'   : [fileIndex],
                'files-unwanted' : unwanted,
            })
            logger.info('transmission', `Fichier ${fileIndex} sélectionné pour ${hash.slice(0, 8)}…`)
            return
        } catch {}
    }
    throw new Error(`Timeout : métadonnées non disponibles pour ${hash.slice(0, 8)}…`)
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
            { key: 'ignoreCertificateErrors', label: 'Ignorer les erreurs de certificat SSL', type: 'boolean', required: false },
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
            'files',  // bytesCompleted + length par fichier (fileStats n'a pas 'length')
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
                files     : Array.isArray(t.files) && t.files.length > 0
                    ? t.files.map((f: any, i: number) => ({
                        index   : i,
                        name    : String(f.name ?? ''),
                        progress: f.length > 0 ? f.bytesCompleted / f.length : 0,
                    }))
                    : undefined,
            } satisfies TorrentInfo))
    },

    async add(config, url, options?: DownloadOptions) {
        const hashMatch = url.match(/xt=urn:btih:([a-fA-F0-9]{40,})/i)
                       ?? options?.magnet?.match(/xt=urn:btih:([a-fA-F0-9]{40,})/i)
        const hash      = hashMatch?.[1]?.toLowerCase() ?? null

        const args: Record<string, unknown> = { filename: url }
        if (config.savePath) args['download-dir'] = String(config.savePath)
        if (config.category) args['labels']        = [String(config.category)]

        const res = await trRequest(config, 'torrent-add', args)

        if (options?.file_index != null && hash) {
            const isDuplicate = !!res.arguments?.['torrent-duplicate']
            if (isDuplicate) {
                logger.info('transmission', `Torrent ${hash.slice(0, 8)}… déjà présent, mise à jour priorité fichier ${options.file_index}`)
            } else {
                logger.info('transmission', `Torrent ajouté (sélection fichier ${options.file_index} en attente de métadonnées)`)
            }
            trApplyFilePriority(config, hash, options.file_index).catch(err =>
                logger.warn('transmission', `Priorité fichier non appliquée : ${err instanceof Error ? err.message : err}`)
            )
            return
        }

        logger.info('transmission', `Torrent ajouté (catégorie: ${config.category ?? 'aucune'}${config.savePath ? `, dossier: ${config.savePath}` : ''})`)
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
