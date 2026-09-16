/** rTorrent via XML-RPC (ruTorrent ou rTorrent seul, sur /RPC2 ou /XMLRPC). */

import type { TorrentClientDriver, TorrentInfo, DownloadOptions, ClientConfig } from './index.js'
import { clientFetch } from './index.js'
import { logger } from '../logger.js'

// ─── XML-RPC ──────────────────────────────────────────────────

function xmlValue(val: any): string {
    if (typeof val === 'string')  return `<value><string>${val}</string></value>`
    if (typeof val === 'number')  return `<value><i8>${val}</i8></value>`
    if (typeof val === 'boolean') return `<value><boolean>${val ? 1 : 0}</boolean></value>`
    if (Array.isArray(val))       return `<value><array><data>${val.map(xmlValue).join('')}</data></array></value>`
    return `<value><string>${String(val)}</string></value>`
}

function xmlCall(method: string, params: any[] = []): string {
    return `<?xml version="1.0"?>
<methodCall>
  <methodName>${method}</methodName>
  <params>${params.map(p => `<param>${xmlValue(p)}</param>`).join('')}</params>
</methodCall>`
}

function parseXmlValue(node: Element): any {
    const child = node.firstElementChild
    if (!child) return node.textContent ?? ''
    switch (child.tagName) {
        case 'string'  : return child.textContent ?? ''
        case 'int'     :
        case 'i4'      :
        case 'i8'      : return parseInt(child.textContent ?? '0', 10)
        case 'double'  : return parseFloat(child.textContent ?? '0')
        case 'boolean' : return child.textContent === '1'
        case 'array'   : {
            const data = child.querySelector('data')
            if (!data) return []
            return Array.from(data.children).map(parseXmlValue)
        }
        case 'struct'  : {
            const result: Record<string, any> = {}
            for (const member of Array.from(child.querySelectorAll(':scope > member'))) {
                const name  = member.querySelector(':scope > name')?.textContent ?? ''
                const value = member.querySelector(':scope > value')
                if (name && value) result[name] = parseXmlValue(value)
            }
            return result
        }
        default: return child.textContent ?? ''
    }
}

async function rpcCall(
    config : ClientConfig,
    method : string,
    params : any[] = [],
): Promise<any> {
    const body    = xmlCall(method, params)
    const headers : Record<string, string> = { 'Content-Type': 'text/xml' }

    if (config.username && config.password) {
        headers['Authorization'] = 'Basic ' + btoa(`${config.username}:${config.password}`)
    }

    const rpcPath = String(config.rpcPath || '/RPC2')
    const url     = `${String(config.url).replace(/\/+$/, '')}${rpcPath}`

    const res = await clientFetch(config, url, { method: 'POST', headers, body })
    if (!res.ok) throw new Error(`rTorrent a répondu HTTP ${res.status} : vérifiez l'URL et le chemin RPC`)

    const text = await res.text()

    // Pas de DOMParser sous Node : analyse XML minimale
    const faultMatch = text.match(/<name>faultString<\/name>\s*<value><string>([^<]*)<\/string>/)
    if (faultMatch) throw new Error(`Erreur rTorrent : ${faultMatch[1]}`)

    const valueMatch = text.match(/<methodResponse>\s*<params>\s*<param>\s*<value>([\s\S]*?)<\/value>\s*<\/param>/)
    if (!valueMatch) return null

    // Types courants uniquement
    const inner = valueMatch[1].trim()

    if (inner.startsWith('<array>')) {
        const items = [...inner.matchAll(/<value>([\s\S]*?)<\/value>/g)]
        return items.map(m => parseInnerValue(m[1].trim()))
    }

    return parseInnerValue(inner)
}

function parseInnerValue(inner: string): any {
    if (inner.startsWith('<array>')) {
        const items = [...inner.matchAll(/<value>([\s\S]*?)<\/value>/g)]
        return items.map(m => parseInnerValue(m[1].trim()))
    }
    const strMatch = inner.match(/^<string>([\s\S]*?)<\/string>$/)
    if (strMatch) return strMatch[1]
    const intMatch = inner.match(/^<(?:i4|i8|int)>([\s\S]*?)<\/(?:i4|i8|int)>$/)
    if (intMatch) return parseInt(intMatch[1], 10)
    // Valeur brute sans tag
    if (!inner.includes('<')) return inner
    return inner
}

async function d_multicall(
    config : ClientConfig,
    view   : string,
    methods: string[],
): Promise<any[][]> {
    const params = [view, ...methods.map(m => `${m}=`)]
    const result = await rpcCall(config, 'd.multicall2', ['', ...params])
    return Array.isArray(result) ? result : []
}

async function rtTorrentExists(config: ClientConfig, hash: string): Promise<boolean> {
    try {
        const rows = await d_multicall(config, 'main', ['d.hash'])
        return rows.some(r => String(r[0]).toLowerCase() === hash.toLowerCase())
    } catch {
        return false
    }
}

/** Attend les métadonnées puis applique les priorités, avant le début du téléchargement. */
async function rtApplyFilePriority(
    config   : ClientConfig,
    hash     : string,
    fileIndex: number,
): Promise<void> {
    for (let attempt = 0; attempt < 100; attempt++) {
        await new Promise(r => setTimeout(r, 300))
        try {
            const files: any[] = await rpcCall(config, 'f.multicall', [hash, '', 'f.size_bytes=', 'f.priority='])
            const fileCount = Array.isArray(files) ? files.length : 0
            if (fileCount === 0) continue

            // Premier épisode choisi : tout désactiver sauf la cible ; sinon activer seulement la cible
            const isInitialState = files.every((f: any) => Number(f[1]) > 0)

            for (let i = 0; i < fileCount; i++) {
                if (i === fileIndex) {
                    await rpcCall(config, 'f.priority.set', [hash, i, 1])
                } else if (isInitialState) {
                    await rpcCall(config, 'f.priority.set', [hash, i, 0])
                }
            }

            logger.info('rtorrent', `Fichier n° ${fileIndex} sélectionné pour ${hash.slice(0, 8)}…`)
            return
        } catch {}
    }

    throw new Error(`Délai dépassé : métadonnées du torrent ${hash.slice(0, 8)}… toujours indisponibles`)
}

// ─── États ────────────────────────────────────────────────────
function mapState(isOpen: number, isActive: number, isChecking: number, isComplete: number): TorrentInfo['state'] {
    if (isChecking)           return 'checking'
    if (!isOpen)              return 'paused'
    if (!isActive)            return 'paused'
    if (isComplete)           return 'seeding'
    return 'downloading'
}

const RT: TorrentClientDriver = {
    definition: {
        id    : 'rtorrent',
        label : 'rTorrent',
        fields: [
            { key: 'url',      label: 'URL',                    type: 'url',      placeholder: 'http://localhost:8080',  required: true },
            { key: 'rpcPath',  label: 'Chemin RPC',             type: 'text',     placeholder: '/RPC2',                  required: false, default: '/RPC2' },
            { key: 'username', label: 'Nom d\'utilisateur',     type: 'text',     placeholder: 'admin',                  required: false },
            { key: 'password', label: 'Mot de passe',           type: 'password', placeholder: '••••••••',              required: false },
            { key: 'category', label: 'Catégorie (label)',      type: 'text',     placeholder: 'fankai',                 required: false, default: 'fankai' },
            { key: 'savePath', label: 'Dossier de téléchargement', type: 'text',  placeholder: '/downloads/fankai',      required: false },
            { key: 'remotePath', label: 'Dossier vu par le client', type: 'text', placeholder: '/downloads',             required: false },
            { key: 'localPath',  label: 'Dossier vu par FanKarr',   type: 'text', placeholder: '/mnt/nas/downloads',     required: false },
            { key: 'ignoreCertificateErrors', label: 'Ignorer les erreurs de certificat SSL', type: 'boolean', required: false },
        ],
    },

    async test(config) {
        try {
            const version = await rpcCall(config, 'system.client_version')
            logger.info('rtorrent', `Test de connexion réussi sur ${config.url} (version ${version})`)
            return { ok: true, message: 'Connexion réussie' }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erreur inattendue, consultez les journaux'
            logger.warn('rtorrent', `Échec du test de connexion sur ${config.url} : ${msg}`)
            return { ok: false, message: msg }
        }
    },

    async healthcheck(config) {
        try {
            const version = await rpcCall(config, 'system.client_version')
            logger.debug('rtorrent', `Client en ligne (version ${version})`)
            return { online: true, version: String(version) }
        } catch (err) {
            logger.debug('rtorrent', `Client injoignable : ${err instanceof Error ? err.message : err}`)
            return { online: false }
        }
    },

    async list(config, category) {
        const methods = [
            'd.hash',
            'd.name',
            'd.is_open',
            'd.is_active',
            'd.is_hash_checking',
            'd.complete',
            'd.size_bytes',
            'd.bytes_done',
            'd.up.total',
            'd.ratio',       // ratio × 1000
            'd.down.rate',
            'd.up.rate',
            'd.left_bytes',
            'd.directory',
            'd.custom1',
        ]

        const rows = await d_multicall(config, 'main', methods)

        const fileMap = new Map<string, any[]>()
        await Promise.all(rows.map(async (r: any) => {
            const hash = String(r[0]).toUpperCase()
            try {
                const files = await rpcCall(config, 'f.multicall', [hash, '', 'f.completed_length=', 'f.size_bytes=', 'f.path=', 'f.priority='])
                if (Array.isArray(files) && files.length > 0) fileMap.set(hash.toLowerCase(), files)
            } catch {}
        }))

        return rows
            .map(r => {
                const [hash, name, isOpen, isActive, isChecking, isComplete,
                    size, downloaded, uploadedTotal, ratioRaw,
                    dlSpeed, ulSpeed, leftBytes, directory, label] = r

                const progress  = size > 0 ? Math.min(100, Math.round(((size - leftBytes) / size) * 100)) : 0
                const eta       = Number(dlSpeed) > 0 && Number(leftBytes) > 0 ? Math.round(Number(leftBytes) / Number(dlSpeed)) : -1
                const hashLower = String(hash).toLowerCase()
                const fileInfo  = fileMap.get(hashLower) ?? []

                return {
                    hash      : hashLower,
                    name      : String(name),
                    state     : mapState(Number(isOpen), Number(isActive), Number(isChecking), Number(isComplete)),
                    progress,
                    size      : Number(size),
                    downloaded: Number(downloaded),
                    uploaded  : Number(uploadedTotal ?? 0),
                    ratio     : Math.round((Number(ratioRaw ?? 0) / 1000) * 100) / 100,
                    speed     : Number(dlSpeed),
                    upspeed   : Number(ulSpeed ?? 0),
                    eta,
                    save_path : String(directory),
                    category  : String(label ?? ''),
                    files     : fileInfo.length > 0
                        ? fileInfo.map((f: any, i: number) => ({
                            index   : i,
                            name    : String(f[2] ?? ''),
                            progress: Number(f[1]) > 0 ? Number(f[0]) / Number(f[1]) : 0,
                            priority: Number(f[3] ?? 1) === 0 ? 0 : 1,
                        }))
                        : undefined,
                } satisfies TorrentInfo
            })
            .filter(t => {
                if (!category) return true
                return t.category === category
            })
    },

    async add(config, url, options?: DownloadOptions) {
        const hashMatch = url.match(/xt=urn:btih:([a-fA-F0-9]{40,})/i)
                       ?? options?.magnet?.match(/xt=urn:btih:([a-fA-F0-9]{40,})/i)
        const hash      = hashMatch?.[1]?.toUpperCase() ?? null

        if (options?.file_index != null && hash) {
            const exists = await rtTorrentExists(config, hash)

            if (exists) {
                logger.info('rtorrent', `Torrent ${hash.slice(0, 8)}… déjà présent, sélection du fichier n° ${options.file_index}`)
                rtApplyFilePriority(config, hash, options.file_index).catch(err =>
                    logger.warn('rtorrent', `Priorité de fichier non appliquée : ${err instanceof Error ? err.message : err}`)
                )
                return
            }

            // Nouveau torrent : priorités appliquées dès que load.start a récupéré les métadonnées
            const args: any[] = ['', url]
            if (config.savePath) args.push(`d.directory.set="${config.savePath}"`)
            if (config.category) args.push(`d.custom1.set=${config.category}`)
            await rpcCall(config, 'load.start', args)

            logger.info('rtorrent', `Torrent ajouté, fichier n° ${options.file_index} sélectionné dès réception des métadonnées`)
            rtApplyFilePriority(config, hash, options.file_index).catch(err =>
                logger.warn('rtorrent', `Priorité de fichier non appliquée : ${err instanceof Error ? err.message : err}`)
            )
            return
        }

        const args: any[] = ['', url]
        if (config.savePath) args.push(`d.directory.set="${config.savePath}"`)
        if (config.category) args.push(`d.custom1.set=${config.category}`)
        await rpcCall(config, 'load.start', args)

        logger.info('rtorrent', `Torrent ajouté${config.savePath ? ` (dossier : ${config.savePath})` : ''}`)
    },

    async remove(config, hash, deleteFiles = false) {
        const h = hash.toUpperCase()
        if (deleteFiles) {
            await rpcCall(config, 'd.delete_tied', [h])
            await rpcCall(config, 'd.erase', [h])
        } else {
            await rpcCall(config, 'd.erase', [h])
        }
        logger.info('rtorrent', `Torrent ${hash.slice(0, 8)}… supprimé${deleteFiles ? ' (avec fichiers)' : ''}`)
    },
}

export default RT
