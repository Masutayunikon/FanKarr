/**
 * Gestion des utilisateurs multi-user
 * Migration automatique depuis l'ancien auth.json mono-user
 */

import fs     from 'fs'
import path   from 'path'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { DATA_DIR } from './config.js'
import { logger }   from './logger.js'

export type UserRole = 'admin' | 'user'

export interface User {
    id          : string
    username    : string
    passwordHash: string
    role        : UserRole
    apiToken    : string
    createdAt   : string
}

const USERS_PATH  = path.join(DATA_DIR, 'users.json')
const LEGACY_PATH = path.join(DATA_DIR, 'auth.json')
const SALT_ROUNDS = 10

// ── Migration mono → multi-user ───────────────────────────────

export function migrateIfNeeded(): void {
    if (fs.existsSync(USERS_PATH)) return   // déjà en format multi-user
    if (!fs.existsSync(LEGACY_PATH)) return // pas encore configuré

    try {
        const legacy = JSON.parse(fs.readFileSync(LEGACY_PATH, 'utf-8')) as {
            username: string
            passwordHash: string
        }
        const admin: User = {
            id          : crypto.randomUUID(),
            username    : legacy.username,
            passwordHash: legacy.passwordHash,
            role        : 'admin',
            apiToken    : crypto.randomBytes(32).toString('hex'),
            createdAt   : new Date().toISOString(),
        }
        writeUsers([admin])
        logger.info('users', `Migration auth.json → users.json réussie pour "${legacy.username}"`)
    } catch (err) {
        logger.error('users', `Échec migration auth.json : ${err instanceof Error ? err.message : err}`)
    }
}

// ── Helpers fichier ───────────────────────────────────────────

export function readUsers(): User[] {
    try {
        if (!fs.existsSync(USERS_PATH)) return []
        return JSON.parse(fs.readFileSync(USERS_PATH, 'utf-8')) as User[]
    } catch { return [] }
}

export function writeUsers(users: User[]): void {
    fs.mkdirSync(path.dirname(USERS_PATH), { recursive: true })
    fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2))
}

export function hasUsers():  boolean { return readUsers().length > 0 }
export function hasAdmin():  boolean { return readUsers().some(u => u.role === 'admin') }

export function findById(id: string):             User | undefined { return readUsers().find(u => u.id === id) }
export function findByUsername(username: string): User | undefined { return readUsers().find(u => u.username.toLowerCase() === username.toLowerCase()) }
export function findByApiToken(token: string):    User | undefined { return readUsers().find(u => u.apiToken === token) }

/** Sérialise sans passwordHash pour les réponses API */
export function safeUser(user: User) {
    const { passwordHash: _, ...safe } = user
    return safe
}

// ── CRUD ──────────────────────────────────────────────────────

export function createUser(username: string, password: string, role: UserRole = 'user'): User {
    const users = readUsers()
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        throw new Error(`Nom d'utilisateur "${username}" déjà utilisé`)
    }
    const user: User = {
        id          : crypto.randomUUID(),
        username,
        passwordHash: bcrypt.hashSync(password, SALT_ROUNDS),
        role,
        apiToken    : crypto.randomBytes(32).toString('hex'),
        createdAt   : new Date().toISOString(),
    }
    writeUsers([...users, user])
    logger.info('users', `Utilisateur "${username}" créé (rôle: ${role})`)
    return user
}

export function updateUser(
    id     : string,
    changes: Partial<{ username: string; password: string; role: UserRole }>,
): User {
    const users = readUsers()
    const idx   = users.findIndex(u => u.id === id)
    if (idx === -1) throw new Error('Utilisateur introuvable')

    const user = users[idx]

    if (changes.username !== undefined && changes.username !== user.username) {
        if (users.some((u, i) => i !== idx && u.username.toLowerCase() === changes.username!.toLowerCase())) {
            throw new Error(`Nom d'utilisateur "${changes.username}" déjà utilisé`)
        }
        user.username = changes.username
    }
    if (changes.role     !== undefined) user.role        = changes.role
    if (changes.password !== undefined) user.passwordHash = bcrypt.hashSync(changes.password, SALT_ROUNDS)

    writeUsers(users)
    logger.info('users', `Utilisateur "${user.username}" mis à jour`)
    return user
}

export function deleteUser(id: string): void {
    const users = readUsers()
    const user  = users.find(u => u.id === id)
    if (!user) throw new Error('Utilisateur introuvable')
    writeUsers(users.filter(u => u.id !== id))
    logger.info('users', `Utilisateur "${user.username}" supprimé`)
}

export function changePassword(id: string, currentPassword: string, newPassword: string): void {
    const users = readUsers()
    const user  = users.find(u => u.id === id)
    if (!user) throw new Error('Utilisateur introuvable')
    if (!bcrypt.compareSync(currentPassword, user.passwordHash)) {
        throw new Error('Mot de passe actuel incorrect')
    }
    user.passwordHash = bcrypt.hashSync(newPassword, SALT_ROUNDS)
    writeUsers(users)
    logger.info('users', `Mot de passe changé pour "${user.username}"`)
}

export function regenerateApiToken(id: string): string {
    const users = readUsers()
    const user  = users.find(u => u.id === id)
    if (!user) throw new Error('Utilisateur introuvable')
    user.apiToken = crypto.randomBytes(32).toString('hex')
    writeUsers(users)
    return user.apiToken
}
