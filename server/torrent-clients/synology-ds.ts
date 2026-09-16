
import fs   from 'fs'
import path from 'path'
import type { TorrentClientDriver, TorrentInfo, DownloadOptions, ClientConfig } from './index.js'
import { clientFetch } from './index.js'
import { logger }   from '../logger.js'
import { DATA_DIR } from '../config.js'

// ─── Cache URI et infohash ─────────────────────────────────────────────────────
// DSM anciens : pas de hash BT dans l'API, on mémorise l'URI et son infohash à l'ajout

const URI_HASH_PATH = path.join(DATA_DIR, 'synology_uri_hash.json')

// ─── Cache hash BT et ID Synology (en mémoire) ────────────────────────────────
// Hash BT vers dbid_X, pour que remove() et getFiles() retrouvent la tâche
const _hashToSynoId = new Map<string, string>()

function loadUriHashMap(): Record<string, string> {
    try {
        if (fs.existsSync(URI_HASH_PATH)) return JSON.parse(fs.readFileSync(URI_HASH_PATH, 'utf-8'))
    } catch {}
    return {}
}

const _uriToHash: Map<string, string> = (() => {
    const m = new Map<string, string>()
    for (const [k, v] of Object.entries(loadUriHashMap())) m.set(k, v)
    return m
})()

function storeUriHash(uri: string, hash: string) {
    const key = uri.toLowerCase()
    if (_uriToHash.get(key) === hash) return
    _uriToHash.set(key, hash)
    try {
        const map = loadUriHashMap()
        map[key]  = hash
        fs.mkdirSync(path.dirname(URI_HASH_PATH), { recursive: true })
        fs.writeFileSync(URI_HASH_PATH, JSON.stringify(map, null, 2), 'utf-8')
    } catch {}
}

function resolveHash(detailHash: string, detailUri: string, taskId: string): string {
    // 1. Hash direct depuis l'API Synology (DSM récent)
    if (detailHash.length > 0) return detailHash.toLowerCase()

    // 2. Hash extrait du magnet de detail.uri
    if (detailUri.startsWith('magnet:')) {
        const m = detailUri.match(/xt=urn:btih:([a-fA-F0-9]{40})/i)
        if (m) return m[1].toLowerCase()
    }

    // 3. Cache URI mémorisé à l'ajout
    if (detailUri) {
        const cached = _uriToHash.get(detailUri.toLowerCase())
        if (cached) return cached
    }

    // 4. À défaut : ID Synology natif (dbid_X)
    logger.debug('synology-ds', `Hash BT non résolu, ID Synology utilisé : ${taskId}`)
    return String(taskId ?? '').toLowerCase()
}

// ─── États ─────────────────────────────────────────────────────────────────────

function mapState(status: string): TorrentInfo['state'] {
    if (status === 'downloading')                                 return 'downloading'
    if (status === 'seeding'   || status === 'finished')          return 'seeding'
    if (status === 'finishing' || status === 'extracting')        return 'seeding'
    if (status === 'paused')                                      return 'paused'
    if (status === 'waiting'   || status === 'filehosting_waiting') return 'downloading'
    if (status === 'hash_checking')                               return 'checking'
    if (status === 'error')                                       return 'error'
    return 'unknown'
}

// ─── Authentification ──────────────────────────────────────────────────────────

const AUTH_ERRORS: Record<number, string> = {
    400: 'nom d\'utilisateur ou mot de passe incorrect',
    401: 'compte désactivé',
    402: 'accès refusé',
    403: 'code de validation en deux étapes requis',
    404: 'code de validation en deux étapes refusé',
}

const TASK_ERRORS: Record<number, string> = {
    105: 'accès refusé',
    106: 'session expirée',
    400: 'envoi du fichier refusé',
    401: 'nombre maximal de tâches atteint',
    402: 'accès au dossier de destination refusé',
    403: 'dossier de destination introuvable',
    406: 'aucun dossier de destination par défaut',
    408: 'fichier introuvable',
}

function dsErrorText(error: any, table: Record<number, string>): string {
    const code = error?.code
    return table[code] ? `${table[code]} (code ${code})` : `code ${code ?? 'inconnu'}`
}

async function dsLogin(config: ClientConfig): Promise<string> {
    const params = new URLSearchParams({
        api    : 'SYNO.API.Auth',
        version: '3',
        method : 'login',
        account: String(config.username ?? ''),
        passwd : String(config.password ?? ''),
        session: 'DownloadStation',
        format : 'sid',
    })
    const res = await clientFetch(config, `${config.url}/webapi/auth.cgi?${params}`)
    if (!res.ok) throw new Error(`Synology a répondu HTTP ${res.status} : vérifiez l'URL de DSM`)
    const data = await res.json()
    if (!data.success) throw new Error(`Connexion refusée par Synology : ${dsErrorText(data.error, AUTH_ERRORS)}`)
    return data.data.sid
}

async function dsRequest(
    config : ClientConfig,
    api    : string,
    method : string,
    version: string,
    extra  : Record<string, string> = {},
    sid    : string,
): Promise<any> {
    const params = new URLSearchParams({ api, version, method, _sid: sid, ...extra })
    const res = await clientFetch(config, `${config.url}/webapi/DownloadStation/task.cgi?${params}`)
    if (!res.ok) throw new Error(`Download Station a répondu HTTP ${res.status}`)
    const data = await res.json()
    if (!data.success) throw new Error(`Erreur Download Station : ${dsErrorText(data.error, TASK_ERRORS)}`)
    return data.data
}

// ─── Client ────────────────────────────────────────────────────────────────────

const DS: TorrentClientDriver = {
    definition: {
        id                   : 'synology-ds',
        label                : 'Synology Download Station',
        filterByManagedHashes: true,
        fields               : [
            { key: 'url',        label: 'URL de DSM',                type: 'url',      placeholder: 'http://192.168.1.x:5000',   required: true },
            { key: 'username',   label: 'Nom d\'utilisateur',        type: 'text',     placeholder: 'admin',                     required: true },
            { key: 'password',   label: 'Mot de passe',              type: 'password', placeholder: '••••••••',                 required: true },
            { key: 'category',   label: 'Catégorie',                 type: 'text',     placeholder: 'fankai',                    required: false, default: 'fankai' },
            { key: 'savePath',   label: 'Dossier de téléchargement', type: 'text',     placeholder: '/volume1/downloads/fankai', required: false },
            { key: 'remotePath', label: 'Dossier vu par le client',  type: 'text',     placeholder: '/volume1/downloads',        required: false },
            { key: 'localPath',  label: 'Dossier vu par FanKarr',    type: 'text',     placeholder: '/mnt/nas/downloads',        required: false },
            { key: 'ignoreCertificateErrors', label: 'Ignorer les erreurs de certificat SSL', type: 'boolean', required: false },
        ],
    },

    async test(config) {
        try {
            await dsLogin(config)
            logger.info('synology-ds', `Test de connexion réussi sur ${config.url}`)
            return { ok: true, message: 'Connexion réussie' }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erreur inattendue, consultez les journaux'
            logger.warn('synology-ds', `Échec du test de connexion sur ${config.url} : ${msg}`)
            return { ok: false, message: msg }
        }
    },

    async healthcheck(config) {
        try {
            const sid = await dsLogin(config)
            const params = new URLSearchParams({
                api    : 'SYNO.DownloadStation.Info',
                version: '2',
                method : 'getinfo',
                _sid   : sid,
            })
            const res = await clientFetch(config, `${config.url}/webapi/DownloadStation/info.cgi?${params}`)
            if (!res.ok) return { online: false }
            const data = await res.json()
            if (!data.success) return { online: false }
            const version = data.data?.version_string ?? 'inconnue'
            return { online: true, version }
        } catch {
            return { online: false }
        }
    },

    async list(config, category) {
        const sid  = await dsLogin(config)
        const data = await dsRequest(config, 'SYNO.DownloadStation.Task', 'list', '1',
            { additional: 'transfer,detail,file' }, sid)

        const tasks: any[] = data?.tasks ?? []

        // Pas de catégories chez Synology : filtre sur le dossier de téléchargement s'il est renseigné
        const normalizedSavePath = String(config.savePath ?? '').replace(/\/+$/, '').toLowerCase()
        const filtered = normalizedSavePath
            ? tasks.filter(t => {
                const dest = String(t.additional?.detail?.destination ?? '').replace(/\/+$/, '').toLowerCase()
                return dest === normalizedSavePath || dest.startsWith(normalizedSavePath + '/')
            })
            : tasks

        return filtered.map(t => {
            const transfer  = t.additional?.transfer ?? {}
            const detail    = t.additional?.detail   ?? {}
            const fileList: any[] = t.additional?.file ?? []
            const size      = t.size ?? 0
            const dl        = transfer.size_downloaded ?? 0

            const hash = resolveHash(
                String(detail.hash ?? '').trim(),
                String(detail.uri  ?? '').trim(),
                String(t.id        ?? ''),
            )

            const synoIdStr = String(t.id ?? '').toLowerCase()
            if (!hash.startsWith('dbid_') && synoIdStr) {
                _hashToSynoId.set(hash, synoIdStr)
            }

            const files = fileList.length > 0
                ? fileList.map((f: any, i: number) => {
                    const fSize = typeof f.size            === 'number' ? f.size            : 0
                    const fDl   = typeof f.size_downloaded === 'number' ? f.size_downloaded : 0
                    return {
                        index   : i,
                        name    : String(f.filename ?? ''),
                        progress: fSize > 0 ? fDl / fSize : 0,
                        priority: String(f.priority ?? 'normal') === 'skip' ? 0 : 1,
                    }
                })
                : undefined

            return {
                hash,
                name      : t.title,
                state     : mapState(t.status),
                progress  : size > 0 ? Math.min(100, Math.round((dl / size) * 100)) : 0,
                size,
                downloaded: dl,
                uploaded  : transfer.size_uploaded ?? 0,
                ratio     : size > 0 ? Math.round(((transfer.size_uploaded ?? 0) / size) * 100) / 100 : 0,
                speed     : transfer.speed_download ?? 0,
                upspeed   : transfer.speed_upload   ?? 0,
                eta       : -1,
                save_path : detail.destination ?? '',
                category  : category ?? '',
                files,
            } satisfies TorrentInfo
        })
    },

    async add(config, url, options?: DownloadOptions) {
        if (options?.file_index != null)
            logger.warn('synology-ds', 'Download Station ne permet pas de choisir un fichier : torrent complet téléchargé')

        if (options?.infohash) {
            storeUriHash(url, options.infohash)
            logger.debug('synology-ds', `Hash mémorisé pour l'URI : ${options.infohash.slice(0, 8)}… (${url.slice(-50)})`)
        }

        const sid = await dsLogin(config)

        // IDs existants avant l'ajout, pour repérer la nouvelle tâche
        const beforeIds = new Set<string>()
        try {
            const before = await dsRequest(config, 'SYNO.DownloadStation.Task', 'list', '1', {}, sid)
            for (const t of before?.tasks ?? []) beforeIds.add(String(t.id))
        } catch {}

        const doAdd = async (withDestination: boolean) => {
            const params = new URLSearchParams({
                api    : 'SYNO.DownloadStation.Task',
                version: '1',
                method : 'create',
                _sid   : sid,
                uri    : url,
            })
            if (withDestination && config.savePath) params.append('destination', String(config.savePath))
            const res = await clientFetch(config, `${config.url}/webapi/DownloadStation/task.cgi?${params}`)
            if (!res.ok) throw new Error(`Download Station a répondu HTTP ${res.status}`)
            return res.json()
        }

        let data = await doAdd(true)

        // Code 403 : dossier introuvable sur le NAS, nouvel essai sans destination
        if (!data.success && data.error?.code === 403 && config.savePath) {
            logger.warn('synology-ds', `Dossier « ${config.savePath} » introuvable sur le NAS (code 403) : ajout dans le dossier par défaut`)
            data = await doAdd(false)
        }

        if (!data.success) throw new Error(`Download Station a refusé le torrent : ${dsErrorText(data.error, TASK_ERRORS)}`)

        if (options?.infohash) {
            try {
                const after   = await dsRequest(config, 'SYNO.DownloadStation.Task', 'list', '1', {}, sid)
                const newTask = (after?.tasks ?? []).find((t: any) => !beforeIds.has(String(t.id)))
                if (newTask) {
                    const synoId = String(newTask.id).toLowerCase()
                    _hashToSynoId.set(options.infohash.toLowerCase(), synoId)
                    logger.debug('synology-ds', `ID Synology ${synoId} associé à ${options.infohash.slice(0, 8)}…`)
                }
            } catch {}
        }

        logger.info('synology-ds', `Torrent ajouté${config.savePath ? ` (dossier : ${config.savePath})` : ''}`)
    },

    async getFiles(config, hash) {
        const sid  = await dsLogin(config)
        const data = await dsRequest(config, 'SYNO.DownloadStation.Task', 'list', '1',
            { additional: 'detail,file' }, sid)
        const tasks: any[] = data?.tasks ?? []

        const h              = hash.toLowerCase()
        const synoIdFromHash = _hashToSynoId.get(h) ?? ''
        const task = tasks.find((t: any) => {
            const detailHash = String(t.additional?.detail?.hash ?? '').toLowerCase()
            const detailUri  = String(t.additional?.detail?.uri  ?? '').toLowerCase()
            const synoId     = String(t.id ?? '').toLowerCase()
            const cached     = _uriToHash.get(detailUri) ?? ''
            return detailHash === h
                || synoId === h
                || cached === h
                || (synoIdFromHash && synoId === synoIdFromHash)
        })

        if (!task) return []
        const fileList: any[] = task.additional?.file ?? []
        return fileList.map((f: any, i: number) => {
            const fSize = typeof f.size            === 'number' ? f.size            : 0
            const fDl   = typeof f.size_downloaded === 'number' ? f.size_downloaded : 0
            return {
                index   : i,
                name    : String(f.filename ?? ''),
                progress: fSize > 0 ? fDl / fSize : 0,
                priority: String(f.priority ?? 'normal') === 'skip' ? 0 : 1,
            }
        })
    },

    async remove(config, hash, _deleteFiles?) {
        const sid  = await dsLogin(config)
        const data = await dsRequest(config, 'SYNO.DownloadStation.Task', 'list', '1', { additional: 'detail' }, sid)
        const tasks: any[] = data?.tasks ?? []

        const h              = hash.toLowerCase()
        const synoIdFromHash = _hashToSynoId.get(h) ?? ''
        const found = tasks.find((t: any) => {
            const detailHash = String(t.additional?.detail?.hash ?? '').toLowerCase()
            const detailUri  = String(t.additional?.detail?.uri  ?? '').toLowerCase()
            const synoId     = String(t.id ?? '').toLowerCase()
            const cachedHash = _uriToHash.get(detailUri) ?? ''
            return detailHash === h
                || synoId === h
                || cachedHash === h
                || (synoIdFromHash && synoId === synoIdFromHash)
        })

        if (!found) throw new Error(`Torrent ${hash.slice(0, 8)}… introuvable`)

        const params = new URLSearchParams({
            api           : 'SYNO.DownloadStation.Task',
            version       : '1',
            method        : 'delete',
            id            : found.id,
            force_complete: 'false',
            _sid          : sid,
        })
        const res = await clientFetch(config, `${config.url}/webapi/DownloadStation/task.cgi?${params}`)
        if (!res.ok) throw new Error(`Échec de la suppression (HTTP ${res.status})`)
        logger.info('synology-ds', `Torrent ${found.id} supprimé`)
    },
}

export default DS
