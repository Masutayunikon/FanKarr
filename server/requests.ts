
import fs     from 'fs'
import path   from 'path'
import crypto from 'crypto'
import { DATA_DIR } from './config.js'
import { logger }   from './logger.js'
import { findById } from './users.js'

export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'completed'

export interface Requester {
    userId     : string
    username   : string
    seasons    : number[]  // numéros de saison ; [] = toutes les saisons disponibles
    episodes   : number[]  // IDs d'épisodes ciblés ; [] = aucun
    requestedAt: string
}

export interface SerieRequest {
    id               : string
    serieId          : number
    serieName        : string
    requesters       : Requester[]
    status           : RequestStatus
    rejectionMessage?: string
    createdAt        : string
    updatedAt        : string
}

const REQUESTS_PATH = path.join(DATA_DIR, 'requests.json')

// ── Fichier des demandes ──────────────────────────────────────

export function readRequests(): SerieRequest[] {
    try {
        if (!fs.existsSync(REQUESTS_PATH)) return []
        return JSON.parse(fs.readFileSync(REQUESTS_PATH, 'utf-8')) as SerieRequest[]
    } catch { return [] }
}

function writeRequests(requests: SerieRequest[]): void {
    fs.mkdirSync(path.dirname(REQUESTS_PATH), { recursive: true })
    fs.writeFileSync(REQUESTS_PATH, JSON.stringify(requests, null, 2))
}

/** Saisons demandées par l'ensemble des demandeurs ([] = toutes). */
export function mergedSeasons(req: SerieRequest): number[] {
    if (req.requesters.some(r => r.seasons.length === 0 && r.episodes.length === 0)) return []
    const all = new Set<number>()
    req.requesters.forEach(r => r.seasons.forEach(s => all.add(s)))
    return [...all].sort((a, b) => a - b)
}

export function mergedEpisodes(req: SerieRequest): number[] {
    const all = new Set<number>()
    req.requesters.forEach(r => (r.episodes ?? []).forEach(e => all.add(e)))
    return [...all].sort((a, b) => a - b)
}

// ── Création et suivi ─────────────────────────────────────────

export function upsertRequest(
    userId   : string,
    serieId  : number,
    serieName: string,
    seasons  : number[],  // [] = toutes les saisons
    episodes : number[] = [],
): SerieRequest {
    const user = findById(userId)
    if (!user) throw new Error('Utilisateur introuvable')

    const requests = readRequests()

    const existing = requests.find(r =>
        r.serieId === serieId &&
        r.status !== 'rejected' &&
        r.status !== 'completed'
    )

    const now = new Date().toISOString()

    if (existing) {
        const idx = existing.requesters.findIndex(r => r.userId === userId)
        if (idx >= 0) {
            const r = existing.requesters[idx]
            const newIsAll = seasons.length === 0 && episodes.length === 0
            const curIsAll = r.seasons.length === 0 && (r.episodes ?? []).length === 0
            if (newIsAll || curIsAll) {
                // Si l'une couvre toute la série : plus de filtre saison ni épisode
                r.seasons  = []
                r.episodes = []
            } else {
                r.seasons  = [...new Set([...r.seasons,           ...seasons ])].sort((a, b) => a - b)
                r.episodes = [...new Set([...(r.episodes ?? []), ...episodes ])].sort((a, b) => a - b)
            }
            r.requestedAt = now
        } else {
            existing.requesters.push({ userId, username: user.username, seasons, episodes, requestedAt: now })
        }
        existing.updatedAt = now
        writeRequests(requests)
        logger.info('requests', `Demande de « ${serieName} » complétée par « ${user.username} »`)
        return existing
    }

    const request: SerieRequest = {
        id        : crypto.randomUUID(),
        serieId,
        serieName,
        requesters: [{ userId, username: user.username, seasons, episodes, requestedAt: now }],
        status    : 'pending',
        createdAt : now,
        updatedAt : now,
    }
    writeRequests([...requests, request])
    logger.info('requests', `Nouvelle demande de « ${serieName} » par « ${user.username} »`)
    return request
}

export function approveRequest(id: string): SerieRequest {
    const requests = readRequests()
    const req = requests.find(r => r.id === id)
    if (!req) throw new Error('Demande introuvable')
    req.status            = 'approved'
    req.rejectionMessage  = undefined
    req.updatedAt         = new Date().toISOString()
    writeRequests(requests)
    logger.info('requests', `Demande « ${req.serieName} » approuvée`)
    return req
}

export function rejectRequest(id: string, message?: string): SerieRequest {
    const requests = readRequests()
    const req = requests.find(r => r.id === id)
    if (!req) throw new Error('Demande introuvable')
    req.status           = 'rejected'
    req.rejectionMessage = message
    req.updatedAt        = new Date().toISOString()
    writeRequests(requests)
    logger.info('requests', `Demande « ${req.serieName} » refusée`)
    return req
}

export function completeRequest(id: string): SerieRequest {
    const requests = readRequests()
    const req = requests.find(r => r.id === id)
    if (!req) throw new Error('Demande introuvable')
    req.status    = 'completed'
    req.updatedAt = new Date().toISOString()
    writeRequests(requests)
    return req
}

export function deleteRequest(id: string): void {
    const requests = readRequests()
    if (!requests.find(r => r.id === id)) throw new Error('Demande introuvable')
    writeRequests(requests.filter(r => r.id !== id))
}

/** Retire l'utilisateur d'une demande en attente ; supprime la demande s'il était seul. */
export function withdrawRequest(id: string, userId: string): { deleted: boolean; request: SerieRequest | null } {
    const requests = readRequests()
    const req = requests.find(r => r.id === id)
    if (!req || !req.requesters.some(r => r.userId === userId)) throw new Error('Demande introuvable')
    if (req.status !== 'pending') throw new Error('Seule une demande en attente peut être annulée')

    const username = req.requesters.find(r => r.userId === userId)!.username
    req.requesters = req.requesters.filter(r => r.userId !== userId)
    if (req.requesters.length === 0) {
        writeRequests(requests.filter(r => r.id !== id))
        logger.info('requests', `Demande « ${req.serieName} » annulée par « ${username} »`)
        return { deleted: true, request: null }
    }
    req.updatedAt = new Date().toISOString()
    writeRequests(requests)
    logger.info('requests', `« ${username} » retiré de la demande « ${req.serieName} »`)
    return { deleted: false, request: req }
}

export function getRequestsForUser(userId: string): SerieRequest[] {
    return readRequests().filter(r => r.requesters.some(req => req.userId === userId))
}

export function getPendingCount(): number {
    return readRequests().filter(r => r.status === 'pending').length
}
