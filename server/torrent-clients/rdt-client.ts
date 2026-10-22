/**
 * RDT-Client (Real-Debrid / AllDebrid…) via son émulation de l'API qBittorrent.
 * Différences avec un vrai qBittorrent :
 *  - authentification désactivable : « Ok. » sans cookie de session ;
 *  - ajout réussi : HTTP 200 au corps vide (« Fails. » en cas d'échec) ;
 *  - pas de seed : un torrent terminé est toujours renvoyé en « pausedUP » ;
 *  - progression par fichier peu fiable : l'import vérifie la présence des fichiers sur le disque.
 */

import type { TorrentClientDriver, TorrentInfo, ClientConfig } from './index.js'
import { clientFetch } from './index.js'
import { logger } from '../logger.js'

function baseUrl(config: ClientConfig): string {
    return String(config.url ?? '').replace(/\/+$/, '')
}

function mapState(state: string, progress: number): TorrentInfo['state'] {
    if (state === 'error' || state === 'missingFiles') return 'error'
    // Terminé côté RDT-Client = fichiers sur le disque : prêt pour l'import
    if (['pausedUP', 'stoppedUP', 'uploading', 'stalledUP', 'queuedUP', 'forcedUP'].includes(state) || progress >= 1) return 'seeding'
    if (['downloading', 'metaDL', 'queuedDL', 'stalledDL', 'forcedDL'].includes(state)) return 'downloading'
    if (['pausedDL', 'stoppedDL'].includes(state)) return 'paused'
    if (state.startsWith('checking')) return 'checking'
    return 'unknown'
}

async function rdtAuth(config: ClientConfig): Promise<Record<string, string>> {
    const username = String(config.username ?? '')
    const password = String(config.password ?? '')
    if (!username && !password) return {}

    const res = await clientFetch(config, `${baseUrl(config)}/api/v2/auth/login`, {
        method : 'POST',
        body   : new URLSearchParams({ username, password }),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    const text = (await res.text()).trim()
    if (!res.ok) throw new Error(`Échec de la connexion : ${text || `HTTP ${res.status}`}`)
    if (text === 'Fails.') throw new Error('Identifiants incorrects (vérifiez le nom d\'utilisateur et le mot de passe)')

    // Authentification désactivée dans RDT-Client : pas de cookie, requêtes acceptées sans
    const cookie = (res.headers.get('set-cookie') ?? '').split(';')[0]!.trim()
    return cookie ? { Cookie: cookie } : {}
}

function isAddSuccess(res: Response, text: string): boolean {
    if (!res.ok) return false
    const t = text.trim()
    if (t === '' || t === 'Ok.') return true
    if (t === 'Fails.') return false
    try {
        const json = JSON.parse(t)
        if (typeof json?.success_count === 'number') return json.success_count > 0
        return true
    } catch {}
    return false
}

const RDT: TorrentClientDriver = {
    definition: {
        id    : 'rdt-client',
        label : 'RDT-Client',
        fields: [
            { key: 'url',        label: 'URL de RDT-Client',         type: 'url',      placeholder: 'http://localhost:6500', required: true },
            { key: 'username',   label: 'Nom d\'utilisateur',        type: 'text',     placeholder: 'admin',                 required: false },
            { key: 'password',   label: 'Mot de passe',              type: 'password', placeholder: '••••••••',              required: false },
            { key: 'category',   label: 'Catégorie',                 type: 'text',     placeholder: 'fankai',                required: false, default: 'fankai' },
            { key: 'remotePath', label: 'Dossier vu par le client',  type: 'text',     placeholder: '/data/downloads',       required: false },
            { key: 'localPath',  label: 'Dossier vu par FanKarr',    type: 'text',     placeholder: '/mnt/nas/downloads',    required: false },
            { key: 'ignoreCertificateErrors', label: 'Ignorer les erreurs de certificat SSL', type: 'boolean', required: false },
        ],
    },

    async test(config) {
        try {
            const authH = await rdtAuth(config)
            // /app/version est anonyme chez RDT-Client : /torrents/info vérifie vraiment l'accès
            const res = await clientFetch(config, `${baseUrl(config)}/api/v2/torrents/info`, { headers: authH })
            if (res.status === 401 || res.status === 403) throw new Error('Accès refusé : vérifiez les identifiants')
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            logger.info('rdt-client', `Test de connexion réussi sur ${config.url}`)
            return { ok: true, message: 'Connexion réussie' }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erreur inattendue, consultez les journaux'
            logger.warn('rdt-client', `Échec du test de connexion sur ${config.url} : ${msg}`)
            return { ok: false, message: msg }
        }
    },

    async healthcheck(config) {
        try {
            const authH = await rdtAuth(config)
            const res = await clientFetch(config, `${baseUrl(config)}/api/v2/app/version`, { headers: authH })
            if (!res.ok) return { online: false }
            const version = (await res.text()).trim()
            return { online: true, version: version.startsWith('<') ? undefined : version }
        } catch (err) {
            logger.debug('rdt-client', `Client injoignable : ${err instanceof Error ? err.message : err}`)
            return { online: false }
        }
    },

    async list(config, category) {
        const authH  = await rdtAuth(config)
        const params = new URLSearchParams()
        if (category) params.set('category', category)
        const res = await clientFetch(config, `${baseUrl(config)}/api/v2/torrents/info?${params}`, { headers: authH })
        if (res.status === 401 || res.status === 403) throw new Error(`Accès refusé (HTTP ${res.status})`)
        if (!res.ok) throw new Error(`Liste des torrents inaccessible (HTTP ${res.status})`)
        const data: any[] = await res.json()
        return (Array.isArray(data) ? data : []).map(t => ({
            hash      : String(t.hash ?? '').toLowerCase(),
            name      : t.name ?? '',
            state     : mapState(String(t.state ?? ''), Number(t.progress ?? 0)),
            progress  : Math.round(Number(t.progress ?? 0) * 100),
            size      : t.size ?? t.total_size ?? 0,
            downloaded: t.downloaded ?? 0,
            uploaded  : 0,
            ratio     : 0,
            speed     : t.dlspeed ?? 0,
            upspeed   : 0,
            eta       : t.eta ?? -1,
            save_path : t.save_path ?? '',
            category  : t.category ?? '',
            // Pas de progression par fichier : l'import vérifie la présence sur le disque
            files     : undefined,
        } satisfies TorrentInfo))
    },

    async add(config, url, options) {
        const authH = await rdtAuth(config)
        let res: Response

        if (url.startsWith('magnet:')) {
            const params = new URLSearchParams({ urls: url })
            if (config.category) params.set('category', String(config.category))
            res = await clientFetch(config, `${baseUrl(config)}/api/v2/torrents/add`, {
                method : 'POST', body: params,
                headers: { ...authH, 'Content-Type': 'application/x-www-form-urlencoded' },
            })
        } else {
            // .torrent récupéré par FanKarr : RDT-Client n'a pas forcément accès à l'URL
            const torrentRes = await fetch(url, { headers: { 'User-Agent': 'FanKarr/1.0' } })
            if (!torrentRes.ok) throw new Error(`Impossible de télécharger le fichier .torrent (HTTP ${torrentRes.status}) : ${url}`)
            const form = new FormData()
            if (config.category) form.append('category', String(config.category))
            form.append('torrents', new Blob([await torrentRes.arrayBuffer()], { type: 'application/x-bittorrent' }), 'torrent.torrent')
            res = await clientFetch(config, `${baseUrl(config)}/api/v2/torrents/add`, { method: 'POST', body: form, headers: authH })
        }

        const text = await res.text()
        if (!isAddSuccess(res, text)) throw new Error(`RDT-Client a refusé le torrent : ${text.trim() || `HTTP ${res.status}`}`)
        if (options?.file_index != null) {
            logger.info('rdt-client', `Sélection d'un seul fichier non prise en charge : torrent complet envoyé (fichier n° ${options.file_index} demandé)`)
        }
        logger.info('rdt-client', `Torrent ajouté (catégorie : ${config.category || 'aucune'})`)
    },

    async remove(config, hash, deleteFiles = false) {
        const authH = await rdtAuth(config)
        const res = await clientFetch(config, `${baseUrl(config)}/api/v2/torrents/delete`, {
            method : 'POST',
            body   : new URLSearchParams({ hashes: hash, deleteFiles: deleteFiles ? 'true' : 'false' }),
            headers: { ...authH, 'Content-Type': 'application/x-www-form-urlencoded' },
        })
        if (!res.ok) throw new Error(`Échec de la suppression (HTTP ${res.status})`)
        logger.info('rdt-client', `Torrent ${hash.slice(0, 8)}… supprimé${deleteFiles ? ' (avec fichiers)' : ''}`)
    },
}

export default RDT
