/**
 * Torrent Client Registry
 * =======================
 * Interface commune + registry de tous les clients disponibles.
 * Chaque client expose son schema de configuration (FieldDef[])
 * pour que le frontend génère le formulaire dynamiquement.
 */

import { randomUUID } from 'crypto'
import fs from 'fs'
import path from 'path'
import { BASE_DIR } from '../config.js'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FieldDef {
    key         : string
    label       : string
    type        : 'text' | 'password' | 'number' | 'url'
    placeholder?: string
    required    : boolean
    default?    : string | number
}

/** Définition statique d'un type de client (ce qu'il expose au front) */
export interface TorrentClientDefinition {
    id     : string      // "qbittorrent", "transmission", etc.
    label  : string      // "qBittorrent"
    fields : FieldDef[]  // schema du formulaire
}

/** Instance sauvegardée d'un client configuré par l'utilisateur */
export interface SavedClient {
    uuid  : string   // identifiant unique de cette instance
    name  : string   // nom custom donné par l'utilisateur
    type  : string   // id du TorrentClientDefinition
    config: Record<string, string | number>
}

/** État normalisé d'un torrent (commun à tous les clients) */
export interface TorrentInfo {
    hash      : string
    name      : string
    state     : 'downloading' | 'seeding' | 'paused' | 'checking' | 'error' | 'unknown'
    progress  : number        // 0-100
    size      : number        // bytes
    downloaded: number        // bytes
    speed     : number        // bytes/s
    eta       : number        // secondes, -1 si inconnu
    save_path : string        // dossier de complétion
    category  : string
}

/** Interface que chaque client doit implémenter */
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
}

export function getDriver(type: string): TorrentClientDriver | undefined {
    return drivers.get(type)
}

export function getAvailableClients(): TorrentClientDefinition[] {
    return [...drivers.values()].map(d => d.definition)
}

// ─── Persistence (clients enregistrés) ────────────────────────────────────────

const CLIENTS_PATH = path.join(BASE_DIR, 'config', 'torrent_clients.json')

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
    return client
}

export function removeClient(uuid: string): boolean {
    const clients = loadClients()
    const filtered = clients.filter(c => c.uuid !== uuid)
    if (filtered.length === clients.length) return false
    saveClients(filtered)
    return true
}

export function getClient(uuid: string): SavedClient | undefined {
    return loadClients().find(c => c.uuid === uuid)
}

/** Masque les champs password pour l'envoi au front */
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

// ─── Dispatch download vers tous les clients ──────────────────────────────────

export async function dispatchDownload(url: string): Promise<{ uuid: string; name: string; ok: boolean; error?: string }[]> {
    const clients = loadClients()
    const results = []

    for (const client of clients) {
        const driver = getDriver(client.type)
        if (!driver) {
            results.push({ uuid: client.uuid, name: client.name, ok: false, error: `Driver "${client.type}" introuvable` })
            continue
        }
        try {
            await driver.add(client.config, url)
            results.push({ uuid: client.uuid, name: client.name, ok: true })
        } catch (err) {
            results.push({
                uuid : client.uuid,
                name : client.name,
                ok   : false,
                error: err instanceof Error ? err.message : 'Erreur inconnue'
            })
        }
    }

    return results
}

// ─── Dispatch list vers tous les clients ─────────────────────────────────────

export async function dispatchList(category?: string): Promise<(TorrentInfo & { client_uuid: string; client_name: string })[]> {
    const clients = loadClients()
    const results: (TorrentInfo & { client_uuid: string; client_name: string })[] = []

    for (const client of clients) {
        const driver = getDriver(client.type)
        if (!driver) continue
        try {
            // La catégorie du client est prioritaire sur la catégorie globale
            const clientCategory = (client.config.category as string) || category
            const torrents = await driver.list(client.config, clientCategory)
            for (const t of torrents) {
                results.push({ ...t, client_uuid: client.uuid, client_name: client.name })
            }
        } catch (err) {
            console.error(`[torrent-clients] list() échoué pour ${client.name}:`, err)
        }
    }

    return results
}