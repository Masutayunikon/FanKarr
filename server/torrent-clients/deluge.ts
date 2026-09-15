/** Deluge via l'API JSON-RPC de l'interface web. Progression en pourcentage (0–100). */

import type { TorrentClientDriver, TorrentInfo, TorrentFileProgress, DownloadOptions, ClientConfig } from './index.js'
import { clientFetch } from './index.js'
import { logger } from '../logger.js'

// ─── Sessions ──────────────────────────────────────────────────────────────────

interface SessionEntry { cookie: string; expires: number }
const _sessions = new Map<string, SessionEntry>()

function sessionKey(config: ClientConfig): string {
    return `${config.url}::${config.password}`
}

// ─── HTTP ──────────────────────────────────────────────────────────────────────

function delugeUrl(config: ClientConfig): string {
    return String(config.url ?? '').replace(/\/+$/, '') + '/json'
}

function parseCookie(raw: string): string {
    // "_session_id=abc123; Path=/; HttpOnly" devient "_session_id=abc123"
    return raw.split(';')[0].trim()
}

async function delugeRPC(
    config : ClientConfig,
    url    : string,
    method : string,
    params : unknown[],
    cookie : string,
): Promise<{ result: any; newCookie: string | null }> {
    const res = await clientFetch(config, url, {
        method : 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept'      : 'application/json',
            ...(cookie ? { Cookie: cookie } : {}),
        },
        body: JSON.stringify({ method, params, id: 1 }),
    })

    if (!res.ok) throw new Error(`Deluge a répondu HTTP ${res.status} : vérifiez l'URL de l'interface web`)

    const json = await res.json()
    if (json.error) {
        throw new Error(`Erreur Deluge : ${json.error.message ?? `code ${json.error.code ?? 'inconnu'}`}`)
    }

    const setCookie = res.headers.get('set-cookie')
    return {
        result   : json.result,
        newCookie: setCookie ? parseCookie(setCookie) : null,
    }
}

// ─── Connexion ─────────────────────────────────────────────────────────────────

async function delugeLogin(config: ClientConfig): Promise<string> {
    const url = delugeUrl(config)
    const res = await clientFetch(config, url, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body   : JSON.stringify({ method: 'auth.login', params: [String(config.password ?? '')], id: 1 }),
    })

    if (!res.ok) throw new Error(`Deluge a répondu HTTP ${res.status} : vérifiez l'URL de l'interface web`)

    const json = await res.json()
    if (json.error) throw new Error(`Connexion à Deluge refusée : ${json.error.message ?? `code ${json.error.code ?? 'inconnu'}`}`)
    if (!json.result) throw new Error('Connexion à Deluge refusée : mot de passe incorrect ?')

    const setCookie = res.headers.get('set-cookie')
    if (!setCookie) throw new Error('Échec de la connexion à Deluge : aucun cookie de session reçu')

    return parseCookie(setCookie)
}

// ─── Appel avec gestion de session ────────────────────────────────────────────

async function delugeCall(
    config : ClientConfig,
    method : string,
    params : unknown[] = [],
): Promise<any> {
    const url = delugeUrl(config)
    const key = sessionKey(config)

    let entry = _sessions.get(key)
    if (!entry || Date.now() >= entry.expires) {
        const cookie = await delugeLogin(config)
        entry = { cookie, expires: Date.now() + 30 * 60_000 }
        _sessions.set(key, entry)
    }

    try {
        const { result, newCookie } = await delugeRPC(config, url, method, params, entry.cookie)
        if (newCookie) {
            entry.cookie  = newCookie
            entry.expires = Date.now() + 30 * 60_000
        }
        return result
    } catch (err) {
        const msg = err instanceof Error ? err.message : ''
        if (msg.includes('Not authorized') || msg.includes('auth') || msg.includes('401')) {
            _sessions.delete(key)
            const cookie = await delugeLogin(config)
            const fresh  = { cookie, expires: Date.now() + 30 * 60_000 }
            _sessions.set(key, fresh)
            const { result } = await delugeRPC(config, url, method, params, cookie)
            return result
        }
        throw err
    }
}

// ─── États ─────────────────────────────────────────────────────────────────────

function mapState(state: string): TorrentInfo['state'] {
    switch (state) {
        case 'Downloading':
        case 'Queued'     :
        case 'Allocating' :
        case 'Moving'     : return 'downloading'
        case 'Seeding'    : return 'seeding'
        case 'Paused'     : return 'paused'
        case 'Checking'   : return 'checking'
        case 'Error'      : return 'error'
        default           : return 'unknown'
    }
}

// ─── Aplatissement de l'arborescence de fichiers Deluge ────────────────────────
// web.get_torrent_files retourne :
//   { contents: { "nom": { type: "file"|"dir", index, progress, priority, contents? } } }

function flattenDelugeFiles(
    contents: Record<string, any>,
    prefix  = '',
): TorrentFileProgress[] {
    const result: TorrentFileProgress[] = []
    for (const [name, node] of Object.entries(contents ?? {})) {
        const fullPath = prefix ? `${prefix}/${name}` : name
        if (node.type === 'dir') {
            result.push(...flattenDelugeFiles(node.contents ?? {}, fullPath))
        } else {
            result.push({
                index   : typeof node.index    === 'number' ? node.index    : 0,
                name    : fullPath,
                progress: typeof node.progress === 'number' ? node.progress : 0,
                priority: typeof node.priority === 'number' ? node.priority : 1,
            })
        }
    }
    return result
}

// ─── Sélection de fichier (en arrière-plan) ──────────────────────────────────

async function applyFilePriority(
    config   : ClientConfig,
    hash     : string,
    fileIndex: number,
): Promise<void> {
    for (let attempt = 0; attempt < 60; attempt++) {
        await new Promise(r => setTimeout(r, 1000))
        try {
            const status   = await delugeCall(config, 'core.get_torrent_status', [hash, ['num_files', 'has_metadata']])
            const numFiles = typeof status?.num_files === 'number' ? status.num_files : 0
            if (numFiles === 0 || !status?.has_metadata) continue

            const priorities = Array.from({ length: numFiles }, (_, i) => i === fileIndex ? 1 : 0)
            await delugeCall(config, 'core.set_torrent_options', [[hash], { file_priorities: priorities }])
            logger.info('deluge', `Fichier n° ${fileIndex} sélectionné pour ${hash.slice(0, 8)}…`)
            return
        } catch {}
    }
    logger.warn('deluge', `Délai dépassé : priorité de fichier non appliquée pour ${hash.slice(0, 8)}…`)
}

// ─── Client ───────────────────────────────────────────────────────────────────

const delugeDriver: TorrentClientDriver = {
    definition: {
        id    : 'deluge',
        label : 'Deluge',
        fields: [
            { key: 'url',        label: 'URL',                           type: 'url',      placeholder: 'http://localhost:8112', required: true  },
            { key: 'password',   label: 'Mot de passe',                  type: 'password', placeholder: '••••••••',             required: true  },
            { key: 'category',   label: 'Catégorie (plugin Label)',      type: 'text',     placeholder: 'fankai',               required: false, default: 'fankai' },
            { key: 'savePath',   label: 'Dossier de téléchargement',     type: 'text',     placeholder: '/downloads/fankai',    required: false },
            { key: 'remotePath', label: 'Dossier vu par le client',      type: 'text',     placeholder: '/downloads',           required: false },
            { key: 'localPath',  label: 'Dossier vu par FanKarr',        type: 'text',     placeholder: '/mnt/nas/downloads',   required: false },
            { key: 'ignoreCertificateErrors', label: 'Ignorer les erreurs de certificat SSL', type: 'boolean', required: false },
        ],
    },

    async test(config) {
        try {
            _sessions.delete(sessionKey(config))
            const cookie = await delugeLogin(config)
            _sessions.set(sessionKey(config), { cookie, expires: Date.now() + 30 * 60_000 })
            logger.info('deluge', `Test de connexion réussi sur ${config.url}`)
            return { ok: true, message: 'Connexion réussie' }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erreur inattendue, consultez les journaux'
            logger.warn('deluge', `Échec du test de connexion sur ${config.url} : ${msg}`)
            return { ok: false, message: msg }
        }
    },

    async healthcheck(config) {
        try {
            const version = await delugeCall(config, 'daemon.get_version')
            return { online: true, version: String(version ?? 'inconnue') }
        } catch {
            return { online: false }
        }
    },

    async list(config, category?) {
        const keys = [
            'name', 'state', 'progress', 'total_size', 'total_done',
            'total_uploaded', 'ratio', 'download_payload_rate', 'upload_payload_rate',
            'eta', 'save_path', 'label',
        ]
        // Tous les torrents, filtrés par label ici pour ne pas dépendre du plugin Label
        const raw: Record<string, any> = await delugeCall(config, 'core.get_torrents_status', [{}, keys]) ?? {}

        return Object.entries(raw)
            .filter(([_, t]) => !category || (t.label ?? '') === category)
            .map(([hash, t]): TorrentInfo => ({
                hash      : hash.toLowerCase(),
                name      : String(t.name ?? ''),
                state     : mapState(String(t.state ?? '')),
                progress  : Math.round(t.progress ?? 0),           // déjà en %
                size      : typeof t.total_size           === 'number' ? t.total_size           : 0,
                downloaded: typeof t.total_done           === 'number' ? t.total_done           : 0,
                uploaded  : typeof t.total_uploaded       === 'number' ? t.total_uploaded       : 0,
                ratio     : Math.round((t.ratio ?? 0) * 100) / 100,
                speed     : typeof t.download_payload_rate === 'number' ? t.download_payload_rate : 0,
                upspeed   : typeof t.upload_payload_rate   === 'number' ? t.upload_payload_rate   : 0,
                eta       : typeof t.eta === 'number' && t.eta >= 0 ? t.eta : -1,
                save_path : String(t.save_path ?? ''),
                category  : String(t.label ?? ''),
            }))
    },

    async add(config, url, options?: DownloadOptions) {
        const addOpts: Record<string, unknown> = {}
        if (config.savePath) addOpts['download_location'] = String(config.savePath)

        let hash: string | null = null

        if (url.startsWith('magnet:')) {
            hash = await delugeCall(config, 'core.add_torrent_magnet', [url, addOpts])
            logger.info('deluge', `Magnet ajouté (hash ${hash?.slice(0, 8) ?? '?'}…)`)
        } else {
            const torrentRes = await fetch(url)
            if (!torrentRes.ok) throw new Error(`Impossible de télécharger le fichier .torrent (HTTP ${torrentRes.status})`)
            const buf      = await torrentRes.arrayBuffer()
            const b64      = Buffer.from(buf).toString('base64')
            const filename = url.split('/').pop()?.replace(/\?.*$/, '') ?? 'torrent.torrent'
            hash = await delugeCall(config, 'core.add_torrent_file', [filename, b64, addOpts])
            logger.info('deluge', `Fichier .torrent envoyé (hash ${hash?.slice(0, 8) ?? '?'}…)`)
        }

        // Plugin Label facultatif : erreurs ignorées
        if (config.category && hash) {
            delugeCall(config, 'label.set_torrent', [hash, String(config.category)]).catch(() => {})
        }

        if (options?.file_index != null && hash) {
            applyFilePriority(config, hash, options.file_index).catch(() => {})
        }
    },

    async remove(config, hash, deleteFiles = false) {
        await delugeCall(config, 'core.remove_torrent', [hash, deleteFiles])
        logger.info('deluge', `Torrent ${hash.slice(0, 8)}… supprimé${deleteFiles ? ' (avec fichiers)' : ''}`)
    },

    async getFiles(config, hash) {
        const data = await delugeCall(config, 'web.get_torrent_files', [hash])
        if (!data?.contents) return []
        return flattenDelugeFiles(data.contents)
    },
}

export default delugeDriver
