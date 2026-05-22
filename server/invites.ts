/**
 * Système d'invitations
 */

import fs     from 'fs'
import path   from 'path'
import crypto from 'crypto'
import { DATA_DIR } from './config.js'
import { logger }   from './logger.js'

export interface Invite {
    code     : string
    createdBy: string        // userId de l'admin
    createdAt: string
    expiresAt: string | null // null = pas d'expiration
    maxUses  : number | null // null = utilisations illimitées
    uses     : number
    note?    : string
}

const INVITES_PATH = path.join(DATA_DIR, 'invites.json')

// ── Helpers fichier ───────────────────────────────────────────

export function readInvites(): Invite[] {
    try {
        if (!fs.existsSync(INVITES_PATH)) return []
        return JSON.parse(fs.readFileSync(INVITES_PATH, 'utf-8')) as Invite[]
    } catch { return [] }
}

function writeInvites(invites: Invite[]): void {
    fs.mkdirSync(path.dirname(INVITES_PATH), { recursive: true })
    fs.writeFileSync(INVITES_PATH, JSON.stringify(invites, null, 2))
}

// ── CRUD ──────────────────────────────────────────────────────

export function createInvite(opts: {
    createdBy: string
    expiresInHours?: number | null
    maxUses?: number | null
    note?: string
}): Invite {
    const invite: Invite = {
        code     : crypto.randomBytes(16).toString('hex'),
        createdBy: opts.createdBy,
        createdAt: new Date().toISOString(),
        expiresAt: opts.expiresInHours
            ? new Date(Date.now() + opts.expiresInHours * 3_600_000).toISOString()
            : null,
        maxUses  : opts.maxUses ?? 1,
        uses     : 0,
        note     : opts.note,
    }
    writeInvites([...readInvites(), invite])
    logger.info('invites', `Invitation créée : ${invite.code.slice(0, 8)}… (maxUses: ${invite.maxUses ?? '∞'}, expire: ${invite.expiresAt ?? 'jamais'})`)
    return invite
}

export function deleteInvite(code: string): void {
    const invites = readInvites()
    if (!invites.find(i => i.code === code)) throw new Error('Invitation introuvable')
    writeInvites(invites.filter(i => i.code !== code))
}

export function findInvite(code: string): Invite | undefined {
    return readInvites().find(i => i.code === code)
}

/** Vérifie si un code est valide (non expiré, non épuisé) */
export function validateInvite(code: string): { valid: true; invite: Invite } | { valid: false; reason: string } {
    const invite = findInvite(code)
    if (!invite) return { valid: false, reason: 'Code d\'invitation invalide' }
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
        return { valid: false, reason: 'Ce lien d\'invitation a expiré' }
    }
    if (invite.maxUses !== null && invite.uses >= invite.maxUses) {
        return { valid: false, reason: 'Ce lien d\'invitation a atteint son nombre maximum d\'utilisations' }
    }
    return { valid: true, invite }
}

/** Incrémente le compteur d'utilisations */
export function consumeInvite(code: string): void {
    const invites = readInvites()
    const invite  = invites.find(i => i.code === code)
    if (!invite) return
    invite.uses++
    writeInvites(invites)
}
