/**
 * Deluge Web JSON-RPC driver
 *
 * Auth   : POST {url}/json → auth.login(password) → cookie _session_id
 * RPC    : POST {url}/json avec { method, params, id } + Cookie header
 * States : "Downloading" | "Seeding" | "Paused" | "Checking"
 *          "Error" | "Queued" | "Allocating" | "Moving"
 * Progress : float 0–100 (déjà en pourcentage, pas 0–1)
 */

import type { TorrentClientDriver, TorrentInfo, TorrentFileProgress, DownloadOptions } from './index.js'
import { logger } from '../logger.js'

// ─── Session cache ─────────────────────────────────────────────────────────────
// Chaque entrée est indexée par "url::password" pour supporter plusieurs instances.
// TTL 30 min — Deluge invalide les sessions inactives, on relogine automatiquement.

interface SessionEntry { cookie: string; expires: number }
const _sessions = new Map<string, SessionEntry>()

function sessionKey(config: Record<string, string | number>): string {
    return `${config.url}::${config.password}`
}

// ─── Helpers HTTP ──────────────────────────────────────────────────────────────

function delugeUrl(config: Record<string, string | number>): string {
    return String(config.url ?? '').replace(/\/+$/, '') + '/json'
}

function parseCookie(raw: string): string {
    // "set-cookie: _session_id=abc123; Path=/; HttpOnly" → "_session_id=abc123"
    return raw.split(';')[0].trim()
}

async function delugeRPC(
    url    : string,
    method : string,
    params : unknown[],
    cookie : string,
): Promise<{ result: any; newCookie: string | null }> {
    const res = await fetch(url, {
        method : 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept'      : 'application/json',
            ...(cookie ? { Cookie: cookie } : {}),
        },
        body: JSON.stringify({ method, params, id: 1 }),
    })

    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Deluge HTTP ${res.status} : ${text}`)
    }

    const json = await res.json()
    if (json.error) {
        throw new Error(`Deluge RPC : ${json.error.message ?? JSON.stringify(json.error)}`)
    }

    const setCookie = res.headers.get('set-cookie')
    return {
        result   : json.result,
        newCookie: setCookie ? parseCookie(setCookie) : null,
    }
}

// ─── Login ─────────────────────────────────────────────────────────────────────

async function delugeLogin(config: Record<string, string | number>): Promise<string> {
    const url = delugeUrl(config)
    const res = await fetch(url, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body   : JSON.stringify({ method: 'auth.login', params: [String(config.password ?? '')], id: 1 }),
    })

    if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`Deluge HTTP ${res.status} : ${text}`)
    }

    const json = await res.json()
    if (json.error) throw new Error(`Deluge login : ${json.error.message ?? JSON.stringify(json.error)}`)
    if (!json.result) throw new Error('Deluge : authentification échouée (mot de passe incorrect ?)')

    const setCookie = res.headers.get('set-cookie')
    if (!setCookie) throw new Error('Deluge : pas de cookie de session reçu après login')

    return parseCookie(setCookie)
}

// ─── Call avec gestion de session ─────────────────────────────────────────────

async function delugeCall(
    config : Record<string, string | number>,
    method : string,
    params : unknown[] = [],
): Promise<any> {
    const url = delugeUrl(config)
    const key = sessionKey(config)

    // Récupère ou rafraîchit la session
    let entry = _sessions.get(key)
    if (!entry || Date.now() >= entry.expires) {
        const cookie = await delugeLogin(config)
        entry = { cookie, expires: Date.now() + 30 * 60_000 }
        _sessions.set(key, entry)
    }

    try {
        const { result, newCookie } = await delugeRPC(url, method, params, entry.cookie)
        // Mise à jour du cookie si Deluge en renvoie un nouveau
        if (newCookie) {
            entry.cookie  = newCookie
            entry.expires = Date.now() + 30 * 60_000
        }
        return result
    } catch (err) {
        const msg = err instanceof Error ? err.message : ''
        // Session expirée → relogin unique
        if (msg.includes('Not authorized') || msg.includes('auth') || msg.includes('401')) {
            _sessions.delete(key)
            const cookie = await delugeLogin(config)
            const fresh  = { cookie, expires: Date.now() + 30 * 60_000 }
            _sessions.set(key, fresh)
            const { result } = await delugeRPC(url, method, params, cookie)
            return result
        }
        throw err
    }
}

// ─── Mapping état ──────────────────────────────────────────────────────────────

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

// ─── Sélection de fichier (asynchrone, best-effort) ──────────────────────────
// Attend que les métadonnées soient disponibles (~60 s max) puis applique
// les priorités : fichier voulu = 1 (normal), tous les autres = 0 (skip).

async function applyFilePriority(
    config   : Record<string, string | number>,
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
            logger.info('deluge', `Fichier ${fileIndex} sélectionné pour ${hash.slice(0, 8)}…`)
            return
        } catch {}
    }
    logger.warn('deluge', `Timeout : priorité fichier non appliquée pour ${hash.slice(0, 8)}…`)
}

// ─── Driver ───────────────────────────────────────────────────────────────────

const delugeDriver: TorrentClientDriver = {
    definition: {
        id    : 'deluge',
        label : 'Deluge',
        fields: [
            { key: 'url',        label: 'URL',                           type: 'url',      placeholder: 'http://localhost:8112', required: true  },
            { key: 'password',   label: 'Mot de passe',                  type: 'password', placeholder: '••••••••',             required: true  },
            { key: 'category',   label: 'Catégorie (Label plugin)',       type: 'text',     placeholder: 'fankai',               required: false, default: 'fankai' },
            { key: 'savePath',   label: 'Dossier cible',                 type: 'text',     placeholder: '/downloads/fankai',    required: false },
            { key: 'remotePath', label: 'Chemin distant (client)',        type: 'text',     placeholder: '/downloads',           required: false },
            { key: 'localPath',  label: 'Chemin local (FanKarr)',         type: 'text',     placeholder: '/mnt/nas/downloads',   required: false },
        ],
    },

    // ── Test ───────────────────────────────────────────────────────────────────
    async test(config) {
        try {
            _sessions.delete(sessionKey(config))
            const cookie = await delugeLogin(config)
            _sessions.set(sessionKey(config), { cookie, expires: Date.now() + 30 * 60_000 })
            logger.info('deluge', `Test de connexion réussi sur ${config.url}`)
            return { ok: true, message: 'Connexion réussie' }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erreur inconnue'
            logger.warn('deluge', `Test de connexion échoué sur ${config.url} : ${msg}`)
            return { ok: false, message: msg }
        }
    },

    // ── Healthcheck ────────────────────────────────────────────────────────────
    async healthcheck(config) {
        try {
            // daemon.get_version() retourne la version du daemon Deluge
            const version = await delugeCall(config, 'daemon.get_version')
            return { online: true, version: String(version ?? 'inconnue') }
        } catch {
            return { online: false }
        }
    },

    // ── List ───────────────────────────────────────────────────────────────────
    async list(config, category?) {
        const keys = [
            'name', 'state', 'progress', 'total_size', 'total_done',
            'total_uploaded', 'ratio', 'download_payload_rate', 'upload_payload_rate',
            'eta', 'save_path', 'label',
        ]
        // filter_dict vide → tous les torrents ; le filtrage par label se fait en JS
        // pour ne pas dépendre du Label plugin côté serveur.
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

    // ── Add ────────────────────────────────────────────────────────────────────
    async add(config, url, options?: DownloadOptions) {
        const addOpts: Record<string, unknown> = {}
        if (config.savePath) addOpts['download_location'] = String(config.savePath)

        let hash: string | null = null

        if (url.startsWith('magnet:')) {
            hash = await delugeCall(config, 'core.add_torrent_magnet', [url, addOpts])
            logger.info('deluge', `Magnet ajouté → ${hash?.slice(0, 8) ?? '?'}…`)
        } else {
            // Télécharge le .torrent puis l'envoie en base64 via core.add_torrent_file
            const torrentRes = await fetch(url)
            if (!torrentRes.ok) throw new Error(`Impossible de télécharger le .torrent : ${torrentRes.status}`)
            const buf      = await torrentRes.arrayBuffer()
            const b64      = Buffer.from(buf).toString('base64')
            const filename = url.split('/').pop()?.replace(/\?.*$/, '') ?? 'torrent.torrent'
            hash = await delugeCall(config, 'core.add_torrent_file', [filename, b64, addOpts])
            logger.info('deluge', `.torrent uploadé → ${hash?.slice(0, 8) ?? '?'}…`)
        }

        // Label plugin — best-effort (silencieux si plugin absent)
        if (config.category && hash) {
            delugeCall(config, 'label.set_torrent', [hash, String(config.category)]).catch(() => {})
        }

        // Sélection de fichier — asynchrone, best-effort
        if (options?.file_index != null && hash) {
            applyFilePriority(config, hash, options.file_index).catch(() => {})
        }
    },

    // ── Remove ─────────────────────────────────────────────────────────────────
    async remove(config, hash, deleteFiles = false) {
        await delugeCall(config, 'core.remove_torrent', [hash, deleteFiles])
        logger.info('deluge', `Torrent ${hash.slice(0, 8)}… supprimé${deleteFiles ? ' (avec fichiers)' : ''}`)
    },

    // ── Get files ──────────────────────────────────────────────────────────────
    async getFiles(config, hash) {
        const data = await delugeCall(config, 'web.get_torrent_files', [hash])
        if (!data?.contents) return []
        return flattenDelugeFiles(data.contents)
    },
}

export default delugeDriver
