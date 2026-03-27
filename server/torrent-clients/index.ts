/**
 * Torrent Client Registry
 * =======================
 * Interface commune + registry de tous les clients disponibles.
 */

import { randomUUID } from 'crypto'
import fs from 'fs'
import path from 'path'
import { DATA_DIR } from '../config.js'
import { logger } from '../logger.js'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FieldDef {
    key         : string
    label       : string
    type        : 'text' | 'password' | 'number' | 'url'
    placeholder?: string
    required    : boolean
    default?    : string | number
}

export interface TorrentClientDefinition {
    id     : string
    label  : string
    fields : FieldDef[]
}

export interface SavedClient {
    uuid  : string
    name  : string
    type  : string
    config: Record<string, string | number>
}

export interface TorrentInfo {
    hash      : string
    name      : string
    state     : 'downloading' | 'seeding' | 'paused' | 'checking' | 'error' | 'unknown'
    progress  : number
    size      : number
    downloaded: number
    speed     : number
    eta       : number
    save_path : string
    category  : string
}

export interface TorrentClientDriver {
    definition  : TorrentClientDefinition
    test        : (config: Record<string, string | number>) => Promise<{ ok: boolean; message: string }>
    healthcheck : (config: Record<string, string | number>) => Promise<{ online: boolean; version?: string }>
    add         : (config: Record<string, string | number>, url: string) => Promise<void>
    list        : (config: Record<string, string | number>, category?: string) => Promise<TorrentInfo[]>
}

// ─── Registry ─────────────────────────────────────────────────────────────────

const drivers = new Map<string, TorrentClientDriver>()

export function registerDriver(driver: TorrentClientDriver) {
    drivers.set(driver.definition.id, driver)
    logger.debug('torrent-clients', `Driver enregistré : ${driver.definition.label}`)
}

export function getDriver(type: string): TorrentClientDriver | undefined {
    return drivers.get(type)
}

export function getAvailableClients(): TorrentClientDefinition[] {
    return [...drivers.values()].map(d => d.definition)
}

// ─── Persistence ──────────────────────────────────────────────────────────────

const CLIENTS_PATH = path.join(DATA_DIR, 'torrent_clients.json')

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

export function addClient(name: string, type: string, config: Record<string, string | number>): SavedClient {
    const clients = loadClients()
    const client: SavedClient = { uuid: randomUUID(), name, type, config }
    clients.push(client)
    saveClients(clients)
    logger.info('torrent-clients', `Client ajouté : "${name}" (${type})`)
    return client
}

export function removeClient(uuid: string): boolean {
    const clients  = loadClients()
    const target   = clients.find(c => c.uuid === uuid)
    const filtered = clients.filter(c => c.uuid !== uuid)
    if (filtered.length === clients.length) return false
    saveClients(filtered)
    logger.info('torrent-clients', `Client supprimé : "${target?.name}" (${target?.type})`)
    return true
}

export function getClient(uuid: string): SavedClient | undefined {
    return loadClients().find(c => c.uuid === uuid)
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

// ─── Dispatch download ─────────────────────────────────────────────────────────

export async function dispatchDownload(url: string): Promise<{ uuid: string; name: string; ok: boolean; error?: string }[]> {
    const clients = loadClients()

    if (clients.length === 0) {
        logger.warn('torrent-clients', 'Aucun client configuré — téléchargement impossible')
        return []
    }

    const results = []

    for (const client of clients) {
        const driver = getDriver(client.type)
        if (!driver) {
            logger.error('torrent-clients', `Driver "${client.type}" introuvable pour le client "${client.name}"`)
            results.push({ uuid: client.uuid, name: client.name, ok: false, error: `Driver "${client.type}" introuvable` })
            continue
        }
        try {
            await driver.add(client.config, url)
            logger.info('torrent-clients', `Téléchargement envoyé à "${client.name}"`)
            results.push({ uuid: client.uuid, name: client.name, ok: true })
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erreur inconnue'
            logger.error('torrent-clients', `Échec envoi vers "${client.name}" : ${msg}`)
            results.push({ uuid: client.uuid, name: client.name, ok: false, error: msg })
        }
    }

    return results
}

// ─── Dispatch list ─────────────────────────────────────────────────────────────

export async function dispatchList(category?: string): Promise<(TorrentInfo & { client_uuid: string; client_name: string })[]> {
    const clients = loadClients()
    const results: (TorrentInfo & { client_uuid: string; client_name: string })[] = []

    for (const client of clients) {
        const driver = getDriver(client.type)
        if (!driver) continue
        try {
            const clientCategory = (client.config.category as string) || category
            const torrents = await driver.list(client.config, clientCategory)
            for (const t of torrents) {
                results.push({ ...t, client_uuid: client.uuid, client_name: client.name })
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erreur inconnue'
            logger.error('torrent-clients', `Impossible de récupérer la liste depuis "${client.name}" : ${msg}`)
        }
    }

    return results
}