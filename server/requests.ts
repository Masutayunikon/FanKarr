/**
 * Système de demandes utilisateurs
 */

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
    seasons    : number[]  // numéros de saison ; [] = toutes les saisons dispo
    episodes   : number[]  // IDs d'épisodes spécifiques ; [] = pas d'épisode ciblé
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

// ── Helpers fichier ───────────────────────────────────────────

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

/** Union des saisons demandées sur tous les requesters ([] = toutes) */
export function mergedSeasons(req: SerieRequest): number[] {
    if (req.requesters.some(r => r.seasons.length === 0 && r.episodes.length === 0)) return []
    const all = new Set<number>()
    req.requesters.forEach(r => r.seasons.forEach(s => all.add(s)))
    return [...all].sort((a, b) => a - b)
}

/** Union des IDs d'épisodes spécifiques sur tous les requesters */
export function mergedEpisodes(req: SerieRequest): number[] {
    const all = new Set<number>()
    req.requesters.forEach(r => (r.episodes ?? []).forEach(e => all.add(e)))
    return [...all].sort((a, b) => a - b)
}

// ── CRUD ──────────────────────────────────────────────────────

/**
 * Créer ou fusionner une demande.
 * - Si une demande active (non rejected/completed) existe pour la série → fusionne les saisons de cet user
 * - Sinon → crée une nouvelle demande
 */
export function upsertRequest(
    userId   : string,
    serieId  : number,
    serieName: string,
    seasons  : number[],  // [] = toutes les saisons
    episodes : number[] = [],  // IDs d'épisodes spécifiques
): SerieRequest {
    const user = findById(userId)
    if (!user) throw new Error('Utilisateur introuvable')

    const requests = readRequests()

    // Chercher une demande active (pas rejected ni completed) pour cette série
    const existing = requests.find(r =>
        r.serieId === serieId &&
        r.status !== 'rejected' &&
        r.status !== 'completed'
    )

    const now = new Date().toISOString()

    if (existing) {
        // Mettre à jour ou ajouter ce requester dans la demande existante
        const idx = existing.requesters.findIndex(r => r.userId === userId)
        if (idx >= 0) {
            const r = existing.requesters[idx]
            // Fusionner les saisons
            if (seasons.length === 0 && episodes.length === 0) {
                r.seasons  = []  // "toutes" — efface toute granularité
                r.episodes = []
            } else {
                if (seasons.length === 0 || r.seasons.length === 0) {
                    r.seasons = []  // l'une des deux est "toutes" → toutes
                } else {
                    r.seasons = [...new Set([...r.seasons, ...seasons])].sort((a, b) => a - b)
                }
                // Fusionner les épisodes (union simple)
                r.episodes = [...new Set([...(r.episodes ?? []), ...episodes])].sort((a, b) => a - b)
            }
            r.requestedAt = now
        } else {
            existing.requesters.push({ userId, username: user.username, seasons, episodes, requestedAt: now })
        }
        existing.updatedAt = now
        writeRequests(requests)
        logger.info('requests', `Demande mise à jour pour "${serieName}" par "${user.username}"`)
        return existing
    }

    // Nouvelle demande
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
    logger.info('requests', `Nouvelle demande pour "${serieName}" par "${user.username}"`)
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
    logger.info('requests', `Demande "${req.serieName}" approuvée`)
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
    logger.info('requests', `Demande "${req.serieName}" refusée`)
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

export function getRequestsForUser(userId: string): SerieRequest[] {
    return readRequests().filter(r => r.requesters.some(req => req.userId === userId))
}

export function getPendingCount(): number {
    return readRequests().filter(r => r.status === 'pending').length
}
