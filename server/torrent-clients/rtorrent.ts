/** rTorrent via XML-RPC (ruTorrent ou rTorrent seul, sur /RPC2 ou /XMLRPC). */

import type { TorrentClientDriver, TorrentInfo, DownloadOptions, ClientConfig } from './index.js'
import fs from 'fs'
import path from 'path'
import { clientFetch, remapSavePath } from './index.js'
import { logger } from '../logger.js'

// ─── XML-RPC ──────────────────────────────────────────────────

// Les magnets contiennent des « & » : sans échappement, le XML envoyé est invalide
function xmlEscape(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function xmlUnescape(s: string): string {
    return s.replace(/&(#x[0-9a-f]+|#\d+|lt|gt|amp|quot|apos);/gi, (_, e: string) => {
        const lower = e.toLowerCase()
        if (lower.startsWith('#x')) return String.fromCodePoint(parseInt(e.slice(2), 16))
        if (lower.startsWith('#'))  return String.fromCodePoint(parseInt(e.slice(1), 10))
        return ({ lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" } as Record<string, string>)[lower]
    })
}

function xmlValue(val: any): string {
    if (typeof val === 'string')  return `<value><string>${xmlEscape(val)}</string></value>`
    if (typeof val === 'number')  return `<value><i8>${val}</i8></value>`
    if (typeof val === 'boolean') return `<value><boolean>${val ? 1 : 0}</boolean></value>`
    if (Array.isArray(val))       return `<value><array><data>${val.map(xmlValue).join('')}</data></array></value>`
    return `<value><string>${xmlEscape(String(val))}</string></value>`
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

    // Pas de DOMParser sous Node : analyse XML-RPC maison
    const fault = text.match(/<fault>([\s\S]*)<\/fault>/)
    if (fault) {
        const f = parseXmlRpc(fault[1])
        throw new Error(`Erreur rTorrent : ${f?.faultString ?? 'réponse en erreur'}`)
    }

    const param = text.match(/<param>([\s\S]*)<\/param>/)
    if (!param) return null
    return parseXmlRpc(param[1])
}

/**
 * Analyse récursive d'un <value> XML-RPC. Les réponses de d.multicall2 et f.multicall
 * sont des tableaux de tableaux : une analyse par regex non imbriquée les aplatit.
 */
function parseXmlRpc(xml: string): any {
    type Tok = { text?: string; tag?: string; close?: boolean; self?: boolean }
    const tokens: Tok[] = [...xml.matchAll(/<(\/?)([\w.]+)[^>]*?(\/?)>|([^<]+)/g)].map(m =>
        m[4] !== undefined
            ? { text: m[4] }
            : { tag: m[2], close: m[1] === '/', self: m[3] === '/' }
    )
    let i = 0

    const skipBlank = () => { while (i < tokens.length && 'text' in tokens[i] && !tokens[i].text!.trim()) i++ }
    const expect = (tag: string, close: boolean) => {
        skipBlank()
        const t = tokens[i]
        if (!t || t.tag !== tag || t.close !== close) throw new Error(`Réponse XML-RPC inattendue (attendu <${close ? '/' : ''}${tag}>)`)
        i++
        return t
    }
    const readText = (tag: string) => {
        let s = ''
        while (i < tokens.length && !(tokens[i].tag === tag && tokens[i].close)) s += tokens[i++].text ?? ''
        i++
        return xmlUnescape(s)
    }

    const value = (): any => {
        if (expect('value', false).self) return ''
        // Valeur sans type : chaîne
        if (tokens[i] && (('text' in tokens[i] && tokens[i + 1]?.tag === 'value') || tokens[i].tag === 'value')) {
            return readText('value')
        }
        skipBlank()
        const t = tokens[i++]
        let v: any
        if (t.self) {
            v = t.tag === 'array' ? [] : t.tag === 'struct' ? {} : ''
        } else if (t.tag === 'array') {
            v = []
            if (!expect('data', false).self) {
                skipBlank()
                while (tokens[i]?.tag === 'value' && !tokens[i].close) { v.push(value()); skipBlank() }
                expect('data', true)
            }
            expect('array', true)
        } else if (t.tag === 'struct') {
            v = {}
            skipBlank()
            while (tokens[i]?.tag === 'member' && !tokens[i].close) {
                i++
                expect('name', false)
                const name = readText('name')
                v[name] = value()
                expect('member', true)
                skipBlank()
            }
            expect('struct', true)
        } else {
            const raw = readText(t.tag!)
            switch (t.tag) {
                case 'int': case 'i4': case 'i8': v = parseInt(raw, 10); break
                case 'double' : v = parseFloat(raw); break
                case 'boolean': v = raw.trim() === '1'; break
                default       : v = raw
            }
        }
        expect('value', true)
        return v
    }

    skipBlank()
    return value()
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

async function rtIsMeta(config: ClientConfig, hash: string): Promise<boolean> {
    try {
        return Number(await rpcCall(config, 'd.is_meta', [hash])) === 1
    } catch {
        return false  // rTorrent trop ancien pour d.is_meta, ou torrent pas encore ajouté
    }
}

/** Attend les métadonnées puis applique les priorités, avant le début du téléchargement. */
async function rtApplyFilePriority(
    config   : ClientConfig,
    hash     : string,
    fileIndex: number,
): Promise<void> {
    let lastError = ''
    for (let attempt = 0; attempt < 100; attempt++) {
        await new Promise(r => setTimeout(r, 300))
        let files: any[]
        try {
            // Magnet sans métadonnées : rTorrent expose un faux fichier .meta, pas encore les épisodes
            if (await rtIsMeta(config, hash)) continue
            const res = await rpcCall(config, 'f.multicall', [hash, '', 'f.size_bytes=', 'f.priority='])
            files = Array.isArray(res) ? res : []
        } catch (err) {
            // Torrent pas encore connu de rTorrent
            lastError = err instanceof Error ? err.message : String(err)
            continue
        }
        if (fileIndex >= files.length) continue

        // Premier épisode choisi : tout désactiver sauf la cible ; sinon activer seulement la cible
        const isInitialState = files.every((f: any) => Number(f[1]) > 0)

        // Cible d'un fichier : « HASH:fN » ; d.update_priorities applique les changements
        for (let i = 0; i < files.length; i++) {
            if (i === fileIndex) {
                await rpcCall(config, 'f.priority.set', [`${hash}:f${i}`, 1])
            } else if (isInitialState) {
                await rpcCall(config, 'f.priority.set', [`${hash}:f${i}`, 0])
            }
        }
        await rpcCall(config, 'd.update_priorities', [hash])

        logger.info('rtorrent', `Fichier n° ${fileIndex} sélectionné pour ${hash.slice(0, 8)}…`)
        return
    }

    throw new Error(`Délai dépassé : métadonnées du torrent ${hash.slice(0, 8)}… toujours indisponibles${lastError ? ` (${lastError})` : ''}`)
}

// ─── États ────────────────────────────────────────────────────
function mapState(isOpen: number, isActive: number, isChecking: number, isComplete: number): TorrentInfo['state'] {
    if (isChecking)           return 'checking'
    // Terminé même arrêté : seedboxes et règles de ratio arrêtent souvent le torrent à la fin,
    // et l'import ne prend que les torrents « seeding »
    if (isComplete)           return 'seeding'
    if (!isOpen)              return 'paused'
    if (!isActive)            return 'paused'
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
                const files = await rpcCall(config, 'f.multicall', [hash, '', 'f.completed_chunks=', 'f.size_chunks=', 'f.path=', 'f.priority=', 'f.size_bytes='])
                if (Array.isArray(files) && files.length > 0) fileMap.set(hash.toLowerCase(), files)
            } catch {}
        }))

        return rows
            .map(r => {
                const [hash, name, isOpen, isActive, isChecking, isComplete,
                    size, downloaded, uploadedTotal, ratioRaw,
                    dlSpeed, ulSpeed, leftBytes, directory, label] = r

                const hashLower = String(hash).toLowerCase()
                const fileInfo  = fileMap.get(hashLower) ?? []

                // Sélection partielle : d.complete et d.left_bytes comptent aussi les fichiers
                // désactivés, le torrent ne serait jamais terminé ni importé
                const fileDone  = (f: any) => Number(f[1]) > 0 ? Math.min(1, Number(f[0]) / Number(f[1])) : 0
                const wanted    = fileInfo.filter((f: any) => Number(f[3] ?? 1) > 0)
                const partial   = wanted.length > 0 && wanted.length < fileInfo.length
                const wantedSize = wanted.reduce((s: number, f: any) => s + Number(f[4] ?? 0), 0)
                const wantedLeft = wanted.reduce((s: number, f: any) => s + Number(f[4] ?? 0) * (1 - fileDone(f)), 0)

                const totalSize = partial ? wantedSize : Number(size)
                const left      = partial ? wantedLeft : Number(leftBytes)
                const complete  = partial ? wanted.every((f: any) => fileDone(f) >= 1) : Number(isComplete) === 1

                const progress  = complete ? 100 : totalSize > 0 ? Math.min(100, Math.round(((totalSize - left) / totalSize) * 100)) : 0
                const eta       = !complete && Number(dlSpeed) > 0 && left > 0 ? Math.round(left / Number(dlSpeed)) : -1

                return {
                    hash      : hashLower,
                    name      : String(name),
                    state     : mapState(Number(isOpen), Number(isActive), Number(isChecking), complete ? 1 : 0),
                    progress,
                    size      : totalSize,
                    downloaded: partial ? Math.round(wantedSize - wantedLeft) : Number(downloaded),
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

    // Progression par fichier : l'import manuel n'importe que les fichiers complets
    // (rTorrent crée aussi sur le disque, partiellement, les fichiers voisins d'un épisode choisi)
    async getFiles(config, hash) {
        const res = await rpcCall(config, 'f.multicall', [hash.toUpperCase(), '', 'f.path=', 'f.completed_chunks=', 'f.size_chunks=', 'f.priority='])
        return (Array.isArray(res) ? res : []).map((f: any, i: number) => ({
            index   : i,
            name    : String(f[0] ?? ''),
            progress: Number(f[2]) > 0 ? Math.min(1, Number(f[1]) / Number(f[2])) : 0,
            priority: Number(f[3] ?? 1),
        }))
    },

    async add(config, url, options?: DownloadOptions) {
        const hashMatch = url.match(/xt=urn:btih:([a-fA-F0-9]{40,})/i)
                       ?? options?.magnet?.match(/xt=urn:btih:([a-fA-F0-9]{40,})/i)
        const hash      = (options?.infohash ?? hashMatch?.[1])?.toUpperCase() ?? null

        // Torrent entier demandé alors qu'il est déjà là avec une sélection partielle (un épisode,
        // puis toute la saison) : rTorrent ignore un second load.start, il faut réactiver les fichiers
        if (options?.file_index == null && hash && await rtTorrentExists(config, hash)) {
            const res   = await rpcCall(config, 'f.multicall', [hash, '', 'f.priority='])
            const files = Array.isArray(res) ? res : []
            for (let i = 0; i < files.length; i++) {
                if (Number(files[i][0]) === 0) await rpcCall(config, 'f.priority.set', [`${hash}:f${i}`, 1])
            }
            await rpcCall(config, 'd.update_priorities', [hash])
            await rpcCall(config, 'd.start', [hash])
            logger.info('rtorrent', `Torrent ${hash.slice(0, 8)}… déjà présent : tous ses fichiers sont maintenant téléchargés`)
            return
        }

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
        if (!deleteFiles) {
            await rpcCall(config, 'd.erase', [h])
            logger.info('rtorrent', `Torrent ${hash.slice(0, 8)}… supprimé`)
            return
        }

        // rTorrent n'efface jamais les données (d.delete_tied ne retire que le .torrent ;
        // ruTorrent passe par son plugin erasedata) : FanKarr supprime lui-même les fichiers
        const directory = String(await rpcCall(config, 'd.directory', [h]) ?? '')
        const isMulti   = Number(await rpcCall(config, 'd.is_multi_file', [h])) === 1
        const res       = await rpcCall(config, 'f.multicall', [h, '', 'f.path='])
        const relPaths  = (Array.isArray(res) ? res : []).map((f: any) => String(f[0] ?? '')).filter(Boolean)

        await rpcCall(config, 'd.delete_tied', [h])
        await rpcCall(config, 'd.erase', [h])

        const local = (p: string) => remapSavePath(p, String(config.remotePath ?? ''), String(config.localPath ?? ''))
        const root  = local(directory)
        if (!path.isAbsolute(root) || path.dirname(root) === root) {
            logger.warn('rtorrent', `Torrent ${hash.slice(0, 8)}… supprimé, fichiers conservés : dossier « ${directory} » inattendu`)
            return
        }

        let deleted = 0
        const dirs  = new Set<string>()
        for (const rel of relPaths) {
            const file = path.resolve(root, rel)
            // Jamais en dehors du dossier du torrent
            if (!file.startsWith(root + path.sep)) continue
            try {
                if (fs.existsSync(file)) { fs.unlinkSync(file); deleted++ }
                dirs.add(path.dirname(file))
            } catch (err) {
                logger.warn('rtorrent', `Fichier non supprimé « ${file} » : ${err instanceof Error ? err.message : err}`)
            }
        }

        // Dossiers vidés, du plus profond au dossier du torrent (seulement s'il lui est propre)
        const stop = isMulti ? path.dirname(root) : root
        for (const start of [...dirs].sort((a, b) => b.length - a.length)) {
            for (let dir = start; dir !== stop && dir.startsWith(stop + path.sep); dir = path.dirname(dir)) {
                try { fs.rmdirSync(dir) } catch { break }  // non vide ou déjà supprimé
            }
        }

        logger.info('rtorrent', `Torrent ${hash.slice(0, 8)}… supprimé avec ${deleted} fichier(s) dans « ${root} »`)
    },
}

export default RT
