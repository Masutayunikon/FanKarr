
import { randomUUID } from 'crypto'
import fs from 'fs'
import path from 'path'
import { Agent, fetch as undiciFetch } from 'undici'
import { DATA_DIR } from '../config.js'
import { logger } from '../logger.js'

// ─── Types ────────────────────────────────────────────────────────────────────

/** Config d'un client torrent (les champs `boolean` sont stockés en booléens). */
export type ClientConfig = Record<string, string | number | boolean>

export interface FieldDef {
    key         : string
    label       : string
    type        : 'text' | 'password' | 'number' | 'url' | 'boolean'
    placeholder?: string
    required    : boolean
    default?    : string | number | boolean
}

export interface TorrentClientDefinition {
    id                    : string
    label                 : string
    fields                : FieldDef[]
    /** Clients sans catégories : dispatchList ne garde que les torrents ajoutés par FanKarr. */
    filterByManagedHashes?: boolean
}

export interface SavedClient {
    uuid  : string
    name  : string
    type  : string
    config: ClientConfig
}

export interface TorrentFileProgress {
    index   : number
    name   ?: string   // chemin relatif dans le torrent (ex. "Pack S1/Episode1.mkv"), selon le client
    progress: number   // 0–1
    priority: number   // 0 = non téléchargé, 1 = normale, 6 = haute, 7 = maximale
}

export interface TorrentInfo {
    hash      : string
    name      : string
    state     : 'downloading' | 'seeding' | 'paused' | 'checking' | 'error' | 'unknown'
    progress  : number
    size      : number
    downloaded: number
    uploaded  : number
    ratio     : number
    speed     : number
    upspeed   : number
    eta       : number
    save_path : string
    category  : string
    files    ?: TorrentFileProgress[]
}

export interface DownloadOptions {
    file_index?: number | null
    file_path ?: string | null
    infohash  ?: string | null   // hash issu du catalogue (plus fiable que le magnet)
    magnet    ?: string | null
}

export interface TorrentClientDriver {
    definition  : TorrentClientDefinition
    test        : (config: ClientConfig) => Promise<{ ok: boolean; message: string }>
    healthcheck : (config: ClientConfig) => Promise<{ online: boolean; version?: string }>
    add         : (config: ClientConfig, url: string, options?: DownloadOptions) => Promise<void>
    list        : (config: ClientConfig, category?: string) => Promise<TorrentInfo[]>
    remove      : (config: ClientConfig, hash: string, deleteFiles?: boolean) => Promise<void>
    getFiles   ?: (config: ClientConfig, hash: string) => Promise<TorrentFileProgress[]>
}

// ─── Certificats TLS ──────────────────────────────────────────────────────────
// ignoreCertificateErrors : Agent undici sous Node, option tls du fetch sous Bun

let _insecureAgent: Agent | null = null

function insecureAgent(): Agent {
    if (!_insecureAgent) _insecureAgent = new Agent({ connect: { rejectUnauthorized: false } })
    return _insecureAgent
}

export function ignoreCertificateErrors(config: ClientConfig): boolean {
    const v = config.ignoreCertificateErrors
    return v === true || v === 'true' || v === 1
}

// Option tls propre à Bun, absente des types standards
interface BunRequestInit extends RequestInit {
    tls?: { rejectUnauthorized?: boolean }
}

const isBun = 'bun' in process.versions

export function clientFetch(
    config : ClientConfig,
    url    : string,
    init   : RequestInit = {},
): Promise<Response> {
    if (!ignoreCertificateErrors(config)) return fetch(url, init)
    if (isBun) {
        const bunInit: BunRequestInit = { ...init, tls: { rejectUnauthorized: false } }
        return fetch(url, bunInit)
    }
    return undiciFetch(url, { ...init, dispatcher: insecureAgent() } as Parameters<typeof undiciFetch>[1]) as unknown as Promise<Response>
}

// ─── Registre ─────────────────────────────────────────────────────────────────

const drivers = new Map<string, TorrentClientDriver>()

export function registerDriver(driver: TorrentClientDriver) {
    drivers.set(driver.definition.id, driver)
    logger.debug('torrent-clients', `Type de client enregistré : ${driver.definition.label}`)
}

export function getDriver(type: string): TorrentClientDriver | undefined {
    return drivers.get(type)
}

export function getAvailableClients(): TorrentClientDefinition[] {
    return [...drivers.values()].map(d => d.definition)
}

// ─── Stockage ─────────────────────────────────────────────────────────────────

const CLIENTS_PATH  = path.join(DATA_DIR, 'torrent_clients.json')

// ─── Torrents suivis ──────────────────────────────────────────────────────────
// Hashes ajoutés par FanKarr, par client : filtre les clients sans catégories (Synology)

const MANAGED_PATH = path.join(DATA_DIR, 'managed_tasks.json')

function loadManagedMap(): Record<string, string[]> {
    try {
        if (!fs.existsSync(MANAGED_PATH)) return {}
        return JSON.parse(fs.readFileSync(MANAGED_PATH, 'utf-8'))
    } catch { return {} }
}

function saveManagedMap(data: Record<string, string[]>) {
    try {
        fs.mkdirSync(path.dirname(MANAGED_PATH), { recursive: true })
        fs.writeFileSync(MANAGED_PATH, JSON.stringify(data, null, 2), 'utf-8')
    } catch {}
}

function getManagedSet(clientUuid: string): Set<string> | null {
    const list = loadManagedMap()[clientUuid]
    if (!list || list.length === 0) return null
    return new Set(list)
}

export function trackManagedHash(clientUuid: string, infohash: string) {
    const data = loadManagedMap()
    if (!data[clientUuid]) data[clientUuid] = []
    const h = infohash.toLowerCase()
    if (!data[clientUuid].includes(h)) {
        data[clientUuid].push(h)
        saveManagedMap(data)
    }
}

export function untrackManagedHash(clientUuid: string, infohash: string) {
    const data = loadManagedMap()
    if (!data[clientUuid]) return
    data[clientUuid] = data[clientUuid].filter(h => h !== infohash.toLowerCase())
    if (data[clientUuid].length === 0) delete data[clientUuid]
    saveManagedMap(data)
}

function clearManagedHashes(clientUuid: string) {
    const data = loadManagedMap()
    if (!data[clientUuid]) return
    delete data[clientUuid]
    saveManagedMap(data)
}

function loadClients(): SavedClient[] {
    try {
        if (!fs.existsSync(CLIENTS_PATH)) return []
        const raw = fs.readFileSync(CLIENTS_PATH, 'utf-8').trim()
        if (!raw || raw === '[]') return []
        return JSON.parse(raw)
    } catch { return [] }
}

function saveClients(clients: SavedClient[]) {
    fs.mkdirSync(path.dirname(CLIENTS_PATH), { recursive: true })
    fs.writeFileSync(CLIENTS_PATH, JSON.stringify(clients, null, 2), 'utf-8')
}

export function listClients(): SavedClient[] {
    return loadClients()
}

export function addClient(name: string, type: string, config: ClientConfig): SavedClient {
    const clients = loadClients()
    const client: SavedClient = { uuid: randomUUID(), name, type, config }
    clients.push(client)
    saveClients(clients)
    logger.info('torrent-clients', `Client ajouté : « ${name} » (${type})`)
    return client
}

export function removeClient(uuid: string): boolean {
    const clients  = loadClients()
    const target   = clients.find(c => c.uuid === uuid)
    const filtered = clients.filter(c => c.uuid !== uuid)
    if (filtered.length === clients.length) return false
    saveClients(filtered)
    clearManagedHashes(uuid)
    logger.info('torrent-clients', `Client supprimé : « ${target?.name} » (${target?.type})`)
    return true
}

export function getClient(uuid: string): SavedClient | undefined {
    return loadClients().find(c => c.uuid === uuid)
}

export function updateClient(uuid: string, name: string, type: string, config: ClientConfig): SavedClient | null {
    const clients = loadClients()
    const index   = clients.findIndex(c => c.uuid === uuid)
    if (index === -1) return null
    clients[index] = { ...clients[index], name, type, config }
    saveClients(clients)
    logger.info('torrent-clients', `Client modifié : « ${name} » (${type})`)
    return clients[index]
}

export function sanitizeClient(client: SavedClient, definition?: TorrentClientDefinition): SavedClient {
    if (!definition) definition = getDriver(client.type)?.definition
    if (!definition) return client
    const config = { ...client.config }
    for (const field of definition.fields) {
        if (field.type === 'password' && config[field.key]) {
            config[field.key] = '••••••••'
        }
    }
    return { ...client, config }
}

// ─── Pause après échecs de connexion ──────────────────────────────────────────
// Client refusant l'authentification mis en pause pour éviter un bannissement d'IP

interface BackoffEntry {
    failCount  : number
    nextRetry  : number  // timestamp ms
}

const _backoff = new Map<string, BackoffEntry>()

const BACKOFF_DELAYS = [60_000, 5 * 60_000, 15 * 60_000, 30 * 60_000, 60 * 60_000]

function isInCooldown(uuid: string): boolean {
    const entry = _backoff.get(uuid)
    if (!entry) return false
    return Date.now() < entry.nextRetry
}

function cooldownRemaining(uuid: string): string {
    const entry = _backoff.get(uuid)
    if (!entry) return ''
    const remaining = Math.max(0, entry.nextRetry - Date.now())
    const m = Math.ceil(remaining / 60_000)
    return m > 0 ? `${m} min` : ''
}

function registerFailure(uuid: string, clientName: string) {
    const entry     = _backoff.get(uuid) ?? { failCount: 0, nextRetry: 0 }
    entry.failCount = Math.min(entry.failCount + 1, BACKOFF_DELAYS.length - 1) + (entry.failCount === 0 ? 0 : 0)
    const delay     = BACKOFF_DELAYS[Math.min(entry.failCount - 1, BACKOFF_DELAYS.length - 1)]
    entry.nextRetry = Date.now() + delay
    _backoff.set(uuid, entry)
    const min = Math.round(delay / 60_000)
    logger.warn('torrent-clients', `Client « ${clientName} » en pause ${min} min après ${entry.failCount} échec(s) de connexion`)
}

function registerSuccess(uuid: string) {
    _backoff.delete(uuid)
}

// Exposé pour l'API d'état
export function getClientCooldowns(): Record<string, { failCount: number; nextRetry: number }> {
    const result: Record<string, { failCount: number; nextRetry: number }> = {}
    for (const [uuid, entry] of _backoff.entries()) {
        if (Date.now() < entry.nextRetry) result[uuid] = entry
    }
    return result
}

// ─── Correspondance des chemins ───────────────────────────────────────────────

// Remplace le préfixe remotePath par localPath (ex. /downloads/x devient /mnt/nas/downloads/x)
function remapSavePath(savePath: string, remotePath: string, localPath: string): string {
    const remote = remotePath.replace(/\/+$/, '')
    const local  = localPath.replace(/\/+$/, '')
    if (!remote || !local) return savePath
    if (!savePath.startsWith(remote)) return savePath
    return local + savePath.slice(remote.length)
}

// ─── Envoi d'un téléchargement ────────────────────────────────────────────────

export async function dispatchDownload(url: string, options?: DownloadOptions): Promise<{ uuid: string; name: string; ok: boolean; error?: string }[]> {
    const clients = loadClients()

    if (clients.length === 0) {
        logger.warn('torrent-clients', 'Aucun client torrent configuré : téléchargement impossible')
        return []
    }

    const results = []

    for (const client of clients) {
        const driver = getDriver(client.type)
        if (!driver) {
            logger.error('torrent-clients', `Type de client « ${client.type} » non pris en charge (client « ${client.name} »)`)
            results.push({ uuid: client.uuid, name: client.name, ok: false, error: `Type de client « ${client.type} » non pris en charge` })
            continue
        }
        try {
            await driver.add(client.config, url, options)
            if (options?.infohash) {
                trackManagedHash(client.uuid, options.infohash)
                logger.debug('torrent-clients', `Torrent ${options.infohash.slice(0, 8)}… suivi pour « ${client.name} »`)
            }
            logger.info('torrent-clients', `Téléchargement envoyé à « ${client.name} »`)
            results.push({ uuid: client.uuid, name: client.name, ok: true })
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erreur inattendue, consultez les journaux'
            logger.error('torrent-clients', `Échec de l'envoi à « ${client.name} » : ${msg}`)
            results.push({ uuid: client.uuid, name: client.name, ok: false, error: msg })
        }
    }

    return results
}

// ─── Suppression ──────────────────────────────────────────────────────────────

export async function dispatchRemove(hash: string, deleteFiles = false): Promise<{ ok: boolean; error?: string }> {
    const clients = loadClients()
    let found = false
    for (const client of clients) {
        const driver = getDriver(client.type)
        if (!driver) continue
        try {
            await driver.remove(client.config, hash, deleteFiles)
            logger.info('torrent-clients', `Torrent ${hash.slice(0, 8)}… supprimé de « ${client.name} »${deleteFiles ? ' (avec fichiers)' : ''}`)
            untrackManagedHash(client.uuid, hash)
            found = true
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erreur inattendue, consultez les journaux'
            logger.warn('torrent-clients', `Impossible de supprimer le torrent de « ${client.name} » : ${msg}`)
        }
    }
    return found ? { ok: true } : { ok: false, error: 'Torrent introuvable dans les clients torrent' }
}

// Titre normalisé vers infohash, pour retrouver les torrents Synology
function buildTitleIndex(infohashMap: Record<string, string>): Map<string, string> {
    const index = new Map<string, string>()
    for (const [hash, title] of Object.entries(infohashMap)) {
        index.set(title.toLowerCase().trim(), hash.toLowerCase())
    }
    return index
}

export async function dispatchList(
    category?    : string,
    infohashMap? : Record<string, string>,
): Promise<(TorrentInfo & { client_uuid: string; client_name: string })[]> {
    const clients    = loadClients()
    const results: (TorrentInfo & { client_uuid: string; client_name: string })[] = []
    const titleIndex = infohashMap ? buildTitleIndex(infohashMap) : null

    for (const client of clients) {
        const driver = getDriver(client.type)
        if (!driver) continue

        if (isInCooldown(client.uuid)) {
            const remaining = cooldownRemaining(client.uuid)
            logger.debug('torrent-clients', `Client « ${client.name} » en pause, nouvel essai dans ${remaining}`)
            continue
        }

        try {
            const clientCategory = (client.config.category as string) || category
            const torrents = await driver.list(client.config, clientCategory)

            registerSuccess(client.uuid)

            const remotePath = String(client.config.remotePath ?? '')
            const localPath  = String(client.config.localPath  ?? '')
            const hasRemap   = remotePath && localPath

            for (const t of torrents) {
                const save_path = hasRemap
                    ? remapSavePath(t.save_path, remotePath, localPath)
                    : t.save_path

                // Synology (dbid_xxx) : retrouver l'infohash par le titre
                let hash = t.hash
                if (titleIndex && t.hash.startsWith('dbid_')) {
                    const resolved = titleIndex.get(t.name.toLowerCase().trim())
                    if (resolved) {
                        logger.debug('torrent-clients', `Hash Synology résolu : « ${t.name} » (${resolved.slice(0, 8)}…)`)
                        hash = resolved
                    }
                }

                if (driver.definition.filterByManagedHashes) {
                    const managed = getManagedSet(client.uuid)
                    if (managed && !managed.has(hash)) continue
                }

                results.push({ ...t, hash, save_path, client_uuid: client.uuid, client_name: client.name })
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erreur inattendue, consultez les journaux'
            logger.error('torrent-clients', `Impossible de récupérer la liste des torrents de « ${client.name} » : ${msg}`)
            const lower = msg.toLowerCase()
            const isAuthError = ['login', 'auth', 'ban', 'forbidden', '401', '403', 'connexion refusée', 'refusé la connexion',
                'connexion à deluge refusée', 'clé api', 'échec de la connexion'].some(k => lower.includes(k))
            if (isAuthError) registerFailure(client.uuid, client.name)
        }
    }

    return results
}

// ─── Progression par fichier ──────────────────────────────────────────────────

export async function dispatchGetFiles(
    hash       : string,
    clientUuid?: string,
): Promise<TorrentFileProgress[]> {
    const clients = clientUuid
        ? loadClients().filter(c => c.uuid === clientUuid)
        : loadClients()

    for (const client of clients) {
        const driver = getDriver(client.type)
        if (!driver?.getFiles) continue
        try {
            const files = await driver.getFiles(client.config, hash)
            if (files.length > 0) return files
        } catch {}
    }
    return []
}