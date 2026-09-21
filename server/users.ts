
import fs     from 'fs'
import path   from 'path'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { DATA_DIR } from './config.js'
import { logger }   from './logger.js'
import { normalizeJellyfinId } from './lib/jellyfin.js'

export type UserRole = 'admin' | 'user'

export interface User {
    id          : string
    username    : string
    passwordHash: string
    role        : UserRole
    apiToken    : string
    createdAt   : string
    tourSeenAt? : string | null
    lastLoginAt?: string | null
    jellyfinId? : string | null
}

const USERS_PATH  = path.join(DATA_DIR, 'users.json')
const LEGACY_PATH = path.join(DATA_DIR, 'auth.json')
const SALT_ROUNDS = 10

// ── Migration depuis auth.json ────────────────────────────────

export function migrateIfNeeded(): void {
    if (fs.existsSync(USERS_PATH)) return
    if (!fs.existsSync(LEGACY_PATH)) return

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
        logger.info('users', `Migration de auth.json vers users.json réussie pour « ${legacy.username} »`)
    } catch (err) {
        logger.error('users', `Échec de la migration de auth.json : ${err instanceof Error ? err.message : err}`)
    }
}

// ── Fichier des utilisateurs ──────────────────────────────────

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
export function findByJellyfinId(id: string):     User | undefined {
    const jellyfinId = normalizeJellyfinId(id)
    return readUsers().find(u => !!u.jellyfinId && u.jellyfinId === jellyfinId)
}

export function safeUser(user: User) {
    const { passwordHash, ...safe } = user
    return { ...safe, hasPassword: !!passwordHash }
}

// ── Gestion des comptes ───────────────────────────────────────

// Mot de passe vide : compte sans mot de passe FanKarr (import Jellyfin)
export function createUser(username: string, password: string, role: UserRole = 'user', jellyfinId: string | null = null): User {
    const users = readUsers()
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        throw new Error(`Nom d'utilisateur « ${username} » déjà utilisé`)
    }
    const user: User = {
        id          : crypto.randomUUID(),
        username,
        passwordHash: password ? bcrypt.hashSync(password, SALT_ROUNDS) : '',
        role,
        apiToken    : crypto.randomBytes(32).toString('hex'),
        createdAt   : new Date().toISOString(),
        tourSeenAt  : null,
        jellyfinId  : jellyfinId ? normalizeJellyfinId(jellyfinId) : null,
    }
    writeUsers([...users, user])
    logger.info('users', `Utilisateur « ${username} » créé (rôle : ${role})`)
    return user
}

export type JellyfinImportAction = 'existing' | 'linked' | 'created'

// null : nom déjà pris par un compte lié à un autre utilisateur Jellyfin
export function importJellyfinUser(jUser: { Id: string; Name: string }): { user: User; action: JellyfinImportAction } | null {
    const users      = readUsers()
    const jellyfinId = normalizeJellyfinId(jUser.Id)

    const linked = users.find(u => u.jellyfinId === jellyfinId)
    if (linked) return { user: linked, action: 'existing' }

    const sameName = users.find(u => u.username.toLowerCase() === jUser.Name.toLowerCase())
    if (sameName?.jellyfinId) {
        logger.warn('users', `Import Jellyfin de « ${jUser.Name} » impossible : le compte FanKarr de ce nom est lié à un autre utilisateur Jellyfin`)
        return null
    }
    if (sameName) {
        sameName.jellyfinId = jellyfinId
        writeUsers(users)
        logger.info('users', `Compte « ${sameName.username} » lié à l'utilisateur Jellyfin « ${jUser.Name} »`)
        return { user: sameName, action: 'linked' }
    }

    return { user: createUser(jUser.Name, '', 'user', jellyfinId), action: 'created' }
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
            throw new Error(`Nom d'utilisateur « ${changes.username} » déjà utilisé`)
        }
        user.username = changes.username
    }
    if (changes.role     !== undefined) user.role        = changes.role
    if (changes.password !== undefined) user.passwordHash = bcrypt.hashSync(changes.password, SALT_ROUNDS)

    writeUsers(users)
    logger.info('users', `Utilisateur « ${user.username} » mis à jour`)
    return user
}

export function deleteUser(id: string): void {
    const users = readUsers()
    const user  = users.find(u => u.id === id)
    if (!user) throw new Error('Utilisateur introuvable')
    writeUsers(users.filter(u => u.id !== id))
    logger.info('users', `Utilisateur « ${user.username} » supprimé`)
}

export function changePassword(id: string, currentPassword: string, newPassword: string): void {
    const users = readUsers()
    const user  = users.find(u => u.id === id)
    if (!user) throw new Error('Utilisateur introuvable')
    if (!user.passwordHash) throw new Error('Ce compte se connecte avec Jellyfin : il n\'a pas de mot de passe FanKarr')
    if (!bcrypt.compareSync(currentPassword, user.passwordHash)) {
        throw new Error('Mot de passe actuel incorrect')
    }
    user.passwordHash = bcrypt.hashSync(newPassword, SALT_ROUNDS)
    writeUsers(users)
    logger.info('users', `Mot de passe changé pour « ${user.username} »`)
}

export function markLogin(id: string): string | null {
    const users = readUsers()
    const user  = users.find(u => u.id === id)
    if (!user) return null
    user.lastLoginAt = new Date().toISOString()
    writeUsers(users)
    return user.lastLoginAt
}

export function markTourSeen(id: string): string {
    const users = readUsers()
    const user  = users.find(u => u.id === id)
    if (!user) throw new Error('Utilisateur introuvable')
    user.tourSeenAt = user.tourSeenAt ?? new Date().toISOString()
    writeUsers(users)
    return user.tourSeenAt
}

export function markAllToursSeen(at: string): number {
    const users   = readUsers()
    const pending = users.filter(u => !u.tourSeenAt)
    if (pending.length === 0) return 0
    for (const u of pending) u.tourSeenAt = at
    writeUsers(users)
    return pending.length
}

export function regenerateApiToken(id: string): string {
    const users = readUsers()
    const user  = users.find(u => u.id === id)
    if (!user) throw new Error('Utilisateur introuvable')
    user.apiToken = crypto.randomBytes(32).toString('hex')
    writeUsers(users)
    return user.apiToken
}
