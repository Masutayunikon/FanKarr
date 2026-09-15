
import type { TorrentClientDriver, TorrentInfo, DownloadOptions, ClientConfig } from './index.js'
import { clientFetch } from './index.js'
import { logger } from '../logger.js'

// Drapeaux d'état : 1 démarré, 2 vérification, 4 démarrage après vérification, 8 vérifié, 16 erreur, 32 pause, 64 file d'attente, 128 chargé
function mapState(status: number): TorrentInfo['state'] {
    if (status & 16)                    return 'error'
    if (status & 32)                    return 'paused'
    if (status & 2)                     return 'checking'
    // Démarré et vérifié : en cours (le seeding est déduit de la progression)
    if (status & 1 && status & 8)       return 'downloading'
    if (status & 64)                    return 'downloading'
    return 'unknown'
}

interface UTSession { token: string; cookie: string }

async function utTorrentExists(config: ClientConfig, hash: string): Promise<boolean> {
    try {
        const session = await utGetSession(config)
        const data    = await utRequest(config, { action: 'getfiles', hash: hash.toUpperCase() }, session)
        const files   = data?.files?.[1]
        return Array.isArray(files) && files.length > 0
    } catch { return false }
}

/** Attend la liste des fichiers puis les passe à 0, sauf la cible à 2 (normale). */
async function utApplyFilePriority(
    config   : ClientConfig,
    hash     : string,
    fileIndex: number,
): Promise<void> {
    const auth = btoa(`${config.username ?? ''}:${config.password ?? ''}`)
    const HASH = hash.toUpperCase()

    for (let attempt = 0; attempt < 100; attempt++) {
        await new Promise(r => setTimeout(r, 500))
        try {
            const session = await utGetSession(config)
            const data    = await utRequest(config, { action: 'getfiles', hash: HASH }, session)
            const files   = data?.files?.[1] as any[][] | undefined
            if (!Array.isArray(files) || files.length === 0) continue

            const skipQs = new URLSearchParams({ token: session.token, action: 'setprio', hash: HASH, p: '0' })
            for (let i = 0; i < files.length; i++) skipQs.append('f', String(i))
            await clientFetch(config, `${config.url}/gui/?${skipQs}`, {
                headers: { Authorization: `Basic ${auth}`, Cookie: session.cookie },
            })

            const selectQs = new URLSearchParams({ token: session.token, action: 'setprio', hash: HASH, p: '2', f: String(fileIndex) })
            await clientFetch(config, `${config.url}/gui/?${selectQs}`, {
                headers: { Authorization: `Basic ${auth}`, Cookie: session.cookie },
            })

            logger.info('utorrent', `Fichier n° ${fileIndex} sélectionné pour ${HASH.slice(0, 8)}…`)
            return
        } catch {}
    }
    throw new Error(`Délai dépassé : fichiers du torrent ${hash.slice(0, 8)}… toujours indisponibles`)
}

async function utGetSession(config: ClientConfig): Promise<UTSession> {
    const auth    = btoa(`${config.username ?? ''}:${config.password ?? ''}`)
    const headers : Record<string, string> = {
        'Authorization': `Basic ${auth}`,
    }

    const res = await clientFetch(config, `${config.url}/gui/token.html`, { headers })
    if (res.status === 401) throw new Error('uTorrent a refusé la connexion : vérifiez le nom d\'utilisateur et le mot de passe')
    if (!res.ok) throw new Error(`uTorrent a répondu HTTP ${res.status} : vérifiez l'URL de la WebUI`)

    const text   = await res.text()
    const match  = text.match(/<div[^>]+id=['"]token['"][^>]*>([^<]+)</)
    if (!match) throw new Error('Réponse inattendue de uTorrent : vérifiez l\'URL de la WebUI')
    const token  = match[1].trim()
    const cookie = res.headers.get('set-cookie') ?? ''

    return { token, cookie }
}

async function utRequest(
    config : ClientConfig,
    params : Record<string, string>,
    session: UTSession,
): Promise<any> {
    const auth = btoa(`${config.username ?? ''}:${config.password ?? ''}`)
    const qs   = new URLSearchParams({ token: session.token, ...params })

    const res = await clientFetch(config, `${config.url}/gui/?${qs}`, {
        headers: {
            'Authorization': `Basic ${auth}`,
            'Cookie'       : session.cookie,
        },
    })
    if (!res.ok) throw new Error(`uTorrent a répondu HTTP ${res.status}`)
    return res.json()
}

function mapTorrent(t: any[]): TorrentInfo {
    // Tableau par torrent : [hash, status, name, size, progress, downloaded, uploaded, ratio, ul_speed, dl_speed, eta, label, …]
    const [hash, status, name, size, progress, downloaded, uploaded, ratio, ulSpeed, dlSpeed, eta, label] = t
    return {
        hash      : hash.toLowerCase(),
        name,
        state     : progress >= 1000 ? 'seeding' : mapState(status),
        progress  : Math.min(100, Math.round(progress / 10)),
        size,
        downloaded,
        uploaded  : uploaded ?? 0,
        ratio     : Math.round(((ratio ?? 0) / 1000) * 100) / 100, // ratio × 1000
        speed     : dlSpeed ?? 0,
        upspeed   : ulSpeed ?? 0,
        eta       : eta ?? -1,
        save_path : '',
        category  : label ?? '',
    }
}

const UT: TorrentClientDriver = {
    definition: {
        id    : 'utorrent',
        label : 'uTorrent',
        fields: [
            { key: 'url',      label: 'URL de la WebUI',    type: 'url',      placeholder: 'http://localhost:8080',  required: true },
            { key: 'username', label: 'Nom d\'utilisateur', type: 'text',     placeholder: 'admin',                  required: true },
            { key: 'password', label: 'Mot de passe',       type: 'password', placeholder: '••••••••',              required: true },
            { key: 'category', label: 'Catégorie',          type: 'text',     placeholder: 'fankai',                 required: false, default: 'fankai' },
            { key: 'savePath', label: 'Dossier de téléchargement', type: 'text', placeholder: '/downloads/fankai',   required: false },
            { key: 'remotePath', label: 'Dossier vu par le client', type: 'text', placeholder: '/downloads',         required: false },
            { key: 'localPath',  label: 'Dossier vu par FanKarr',   type: 'text', placeholder: '/mnt/nas/downloads', required: false },
            { key: 'ignoreCertificateErrors', label: 'Ignorer les erreurs de certificat SSL', type: 'boolean', required: false },
        ],
    },

    async test(config) {
        try {
            await utGetSession(config)
            logger.info('utorrent', `Test de connexion réussi sur ${config.url}`)
            return { ok: true, message: 'Connexion réussie' }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erreur inattendue, consultez les journaux'
            logger.warn('utorrent', `Échec du test de connexion sur ${config.url} : ${msg}`)
            return { ok: false, message: msg }
        }
    },

    async healthcheck(config) {
        try {
            const session = await utGetSession(config)
            const data    = await utRequest(config, { action: 'getsettings' }, session)
            const version = data?.['build']?.toString() ?? 'inconnue'
            logger.debug('utorrent', `Client en ligne (build ${version})`)
            return { online: true, version }
        } catch (err) {
            logger.debug('utorrent', `Client injoignable : ${err instanceof Error ? err.message : err}`)
            return { online: false }
        }
    },

    async list(config, category) {
        const session = await utGetSession(config)
        const data    = await utRequest(config, { list: '1' }, session)
        const torrents: any[][] = data?.torrents ?? []

        return torrents
            .filter(t => {
                if (!category) return true
                return t[11] === category // index 11 = label
            })
            .map(t => {
                const info = mapTorrent(t)

                const props = data?.props?.find((p: any) => p[0]?.toLowerCase() === info.hash)
                if (props) info.save_path = props[1] ?? ''

                return info
            })
    },

    async add(config, url, options?: DownloadOptions) {
        const hashMatch = url.match(/xt=urn:btih:([a-fA-F0-9]{40,})/i)
                       ?? options?.magnet?.match(/xt=urn:btih:([a-fA-F0-9]{40,})/i)
        const hash      = hashMatch?.[1]?.toLowerCase() ?? null

        if (options?.file_index != null && hash) {
            const exists = await utTorrentExists(config, hash)
            if (exists) {
                logger.info('utorrent', `Torrent ${hash.slice(0, 8)}… déjà présent, sélection du fichier n° ${options.file_index}`)
                utApplyFilePriority(config, hash, options.file_index).catch(err =>
                    logger.warn('utorrent', `Priorité de fichier non appliquée : ${err instanceof Error ? err.message : err}`)
                )
                return
            }
        }

        const session = await utGetSession(config)
        const auth    = btoa(`${config.username ?? ''}:${config.password ?? ''}`)

        const qs = new URLSearchParams({ token: session.token, action: 'add-url', s: url })
        if (config.savePath) qs.set('path', String(config.savePath))

        const res = await clientFetch(config, `${config.url}/gui/?${qs}`, {
            method : 'GET',
            headers: { Authorization: `Basic ${auth}`, Cookie: session.cookie },
        })
        if (!res.ok) throw new Error(`Échec de l'ajout (HTTP ${res.status})`)

        if (options?.file_index != null && hash) {
            logger.info('utorrent', `Torrent ajouté, fichier n° ${options.file_index} sélectionné dès réception des métadonnées`)
            utApplyFilePriority(config, hash, options.file_index).catch(err =>
                logger.warn('utorrent', `Priorité de fichier non appliquée : ${err instanceof Error ? err.message : err}`)
            )
        } else {
            logger.info('utorrent', `Torrent ajouté (catégorie : ${config.category ?? 'aucune'}${config.savePath ? `, dossier : ${config.savePath}` : ''})`)
        }

        if (config.category) {
            setTimeout(async () => {
                try {
                    const s2   = await utGetSession(config)
                    const data = await utRequest(config, { list: '1' }, s2)
                    const torrents: any[][] = data?.torrents ?? []
                    const target = torrents.find(t => !t[11])
                    if (target) {
                        await utRequest(config, {
                            action: 'setprops',
                            hash  : target[0],
                            s     : 'label',
                            v     : String(config.category),
                        }, s2)
                    }
                } catch {}
            }, 3000)
        }
    },

    async remove(config, hash, deleteFiles = false) {
        const s = await utGetSession(config)
        await utRequest(config, {
            action: deleteFiles ? 'removedata' : 'remove',
            hash  : hash.toUpperCase(),
        }, s)
        logger.info('utorrent', `Torrent ${hash.slice(0, 8)}… supprimé${deleteFiles ? ' (avec fichiers)' : ''}`)
    },
}

export default UT