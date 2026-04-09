/**
 * rTorrent Driver
 * ===============
 * Communique via XML-RPC (HTTP POST).
 * Compatible ruTorrent (via /RPC2) et rTorrent standalone (via /RPC2 ou /XMLRPC).
 */

import type { TorrentClientDriver, TorrentInfo } from './index.js'
import { logger } from '../logger.js'

// ─── XML-RPC helpers ──────────────────────────────────────────

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
    config : Record<string, string | number>,
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

    const res = await fetch(url, { method: 'POST', headers, body })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const text = await res.text()

    // Parse XML — Node.js n'a pas DOMParser natif, on fait un parse minimaliste
    const faultMatch = text.match(/<name>faultString<\/name>\s*<value><string>([^<]*)<\/string>/)
    if (faultMatch) throw new Error(`rTorrent fault : ${faultMatch[1]}`)

    const valueMatch = text.match(/<methodResponse>\s*<params>\s*<param>\s*<value>([\s\S]*?)<\/value>\s*<\/param>/)
    if (!valueMatch) return null

    // Parse simplifié pour les types courants
    const inner = valueMatch[1].trim()

    // Array
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

// multicall pour récupérer plusieurs champs en une requête
async function d_multicall(
    config : Record<string, string | number>,
    view   : string,
    methods: string[],
): Promise<any[][]> {
    const params = [view, ...methods.map(m => `${m}=`)]
    const result = await rpcCall(config, 'd.multicall2', ['', ...params])
    return Array.isArray(result) ? result : []
}

// ─── State mapping ────────────────────────────────────────────
// rTorrent state : is_active (0/1) + is_hash_checking (0/1) + get_complete (0/1)
// + is_open (0/1)
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
            { key: 'username', label: 'Identifiant',            type: 'text',     placeholder: 'admin',                  required: false },
            { key: 'password', label: 'Mot de passe',           type: 'password', placeholder: '••••••••',              required: false },
            { key: 'category', label: 'Catégorie (label)',      type: 'text',     placeholder: 'fankai',                 required: false, default: 'fankai' },
            { key: 'savePath', label: 'Dossier cible',          type: 'text',     placeholder: '/downloads/fankai',      required: false },
            { key: 'remotePath', label: 'Chemin distant (client)', type: 'text',  placeholder: '/downloads',             required: false },
            { key: 'localPath',  label: 'Chemin local (FanKarr)',  type: 'text',  placeholder: '/mnt/nas/downloads',     required: false },
        ],
    },

    async test(config) {
        try {
            const version = await rpcCall(config, 'system.client_version')
            logger.info('rtorrent', `Test de connexion réussi sur ${config.url} — version ${version}`)
            return { ok: true, message: 'Connexion réussie' }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erreur inconnue'
            logger.warn('rtorrent', `Test de connexion échoué sur ${config.url} : ${msg}`)
            return { ok: false, message: msg }
        }
    },

    async healthcheck(config) {
        try {
            const version = await rpcCall(config, 'system.client_version')
            logger.debug('rtorrent', `Healthcheck OK — version ${version}`)
            return { online: true, version: String(version) }
        } catch (err) {
            logger.debug('rtorrent', `Healthcheck échoué : ${err instanceof Error ? err.message : err}`)
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
            'd.down.rate',
            'd.left_bytes',
            'd.down.rate',
            'd.directory',
            'd.custom1',  // label rTorrent
        ]

        const rows = await d_multicall(config, 'main', methods)

        return rows
            .map(r => {
                const [hash, name, isOpen, isActive, isChecking, isComplete,
                    size, downloaded, speed, leftBytes, , directory, label] = r

                const progress = size > 0 ? Math.min(100, Math.round(((size - leftBytes) / size) * 100)) : 0
                const eta      = speed > 0 && leftBytes > 0 ? Math.round(leftBytes / speed) : -1

                return {
                    hash      : String(hash).toLowerCase(),
                    name      : String(name),
                    state     : mapState(Number(isOpen), Number(isActive), Number(isChecking), Number(isComplete)),
                    progress,
                    size      : Number(size),
                    downloaded: Number(downloaded),
                    speed     : Number(speed),
                    eta,
                    save_path : String(directory),
                    category  : String(label ?? ''),
                } satisfies TorrentInfo
            })
            .filter(t => {
                if (!category) return true
                return t.category === category
            })
    },

    async add(config, url) {
        // load_start charge et démarre le torrent
        const method = url.startsWith('magnet:') ? 'load.start' : 'load.start'
        const args: any[] = ['', url]

        if (config.savePath) {
            args.push(`d.directory.set="${config.savePath}"`)
        }

        if (config.category) {
            args.push(`d.custom1.set=${config.category}`)
        }

        await rpcCall(config, method, args)
        logger.info('rtorrent', `Torrent ajouté avec succès${config.savePath ? ` (dossier: ${config.savePath})` : ''}`)
    },
}

export default RT