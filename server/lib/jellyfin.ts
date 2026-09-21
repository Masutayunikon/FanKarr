
import crypto from 'crypto'
import { readSettings, writeSettings, type Settings } from '../settings.js'
import { logger }       from '../logger.js'

const CLIENT_HEADER = 'MediaBrowser Client="FanKarr", Device="Server", DeviceId="fankarr-server", Version="1.0"'
const TIMEOUT_MS    = 10_000

export function isJellyfinConfigured(s: Settings = readSettings()): boolean {
    return !!(s.jellyfinUrl && s.jellyfinAdminToken)
}

function adminHeaders(token: string): Record<string, string> {
    return {
        'X-Emby-Token': token,
        'Authorization': `${CLIENT_HEADER}, Token="${token}"`,
        'Content-Type': 'application/json',
    }
}

function userHeaders(token: string): Record<string, string> {
    return {
        'Authorization': `${CLIENT_HEADER}, Token="${token}"`,
        'Content-Type': 'application/json',
    }
}

// ── Types Jellyfin ────────────────────────────────────────────

export interface JellyfinUser {
    Id          : string
    Name        : string
    ServerId?   : string
    HasPassword : boolean
    Policy      : { IsAdministrator: boolean; IsDisabled: boolean }
}

// ── Test de connexion ─────────────────────────────────────────

export async function testJellyfinConnection(url: string, token: string): Promise<{ ok: boolean; version?: string; error?: string }> {
    try {
        const res = await fetch(`${url.replace(/\/$/, '')}/System/Info`, {
            headers: adminHeaders(token),
        })
        if (!res.ok) return { ok: false, error: `Jellyfin a répondu HTTP ${res.status} : vérifiez l'URL et la clé API` }
        const data = await res.json()
        return { ok: true, version: data.Version }
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Erreur réseau' }
    }
}

// ── Récupération des utilisateurs Jellyfin ────────────────────

export async function fetchJellyfinUsers(): Promise<JellyfinUser[]> {
    const { jellyfinUrl, jellyfinAdminToken } = readSettings()
    if (!jellyfinUrl || !jellyfinAdminToken) throw new Error('Jellyfin non configuré (URL ou clé API manquante)')

    const base = jellyfinUrl.replace(/\/$/, '')
    const res  = await fetch(`${base}/Users`, { headers: adminHeaders(jellyfinAdminToken) })
    if (!res.ok) throw new Error(`Impossible de récupérer les utilisateurs Jellyfin (HTTP ${res.status})`)
    return res.json()
}

// ── Identifiant du serveur ────────────────────────────────────

export async function getJellyfinServerId(): Promise<string | null> {
    const { jellyfinUrl, jellyfinAdminToken, jellyfinServerId } = readSettings()
    if (jellyfinServerId) return jellyfinServerId
    if (!jellyfinUrl || !jellyfinAdminToken) return null

    try {
        const res = await fetch(`${jellyfinUrl.replace(/\/$/, '')}/System/Info`, {
            headers: adminHeaders(jellyfinAdminToken),
            signal : AbortSignal.timeout(TIMEOUT_MS),
        })
        if (!res.ok) return null
        const data = await res.json()
        if (!data?.Id) return null
        const id = normalizeJellyfinId(data.Id)
        writeSettings({ jellyfinServerId: id })
        logger.info('jellyfin', `Identifiant du serveur Jellyfin enregistré (${id.slice(0, 8)}…)`)
        return id
    } catch {
        return null
    }
}

// ── Authentification par nom et mot de passe ──────────────────

export type JellyfinAuthResult =
    | { ok: true;  id: string; name: string; serverId: string }
    | { ok: false; reason: 'credentials' | 'unreachable'; error?: string }

export async function authenticateJellyfinUser(username: string, password: string, clientIp?: string): Promise<JellyfinAuthResult> {
    const { jellyfinUrl } = readSettings()
    if (!jellyfinUrl) return { ok: false, reason: 'unreachable', error: 'Jellyfin non configuré' }

    const base     = jellyfinUrl.replace(/\/$/, '')
    const deviceId = `fankarr-web-${crypto.createHash('sha256').update(username.toLowerCase()).digest('hex').slice(0, 16)}`
    const client   = `MediaBrowser Client="FanKarr", Device="FanKarr (connexion web)", DeviceId="${deviceId}", Version="1.0"`

    let data: any
    try {
        const res = await fetch(`${base}/Users/AuthenticateByName`, {
            method : 'POST',
            headers: {
                'Authorization': client,
                'Content-Type' : 'application/json',
                ...(clientIp ? { 'X-Forwarded-For': clientIp.replace(/^::ffff:/, '') } : {}),
            },
            body  : JSON.stringify({ Username: username, Pw: password }),
            signal: AbortSignal.timeout(TIMEOUT_MS),
        })
        if (res.status === 401 || res.status === 403) return { ok: false, reason: 'credentials' }
        if (!res.ok) return { ok: false, reason: 'unreachable', error: `Jellyfin a répondu HTTP ${res.status}` }
        data = await res.json()
    } catch (err) {
        return { ok: false, reason: 'unreachable', error: err instanceof Error ? err.message : 'Erreur réseau' }
    }

    if (!data?.User?.Id) return { ok: false, reason: 'unreachable', error: 'Réponse Jellyfin inattendue' }

    // Session fermée aussitôt : FanKarr ne garde aucun jeton Jellyfin
    if (data.AccessToken) {
        fetch(`${base}/Sessions/Logout`, {
            method : 'POST',
            headers: { 'Authorization': `${client}, Token="${data.AccessToken}"` },
            signal : AbortSignal.timeout(TIMEOUT_MS),
        }).catch(() => {})
    }

    return {
        ok      : true,
        id      : normalizeJellyfinId(data.User.Id),
        name    : data.User.Name,
        serverId: normalizeJellyfinId(data.ServerId ?? data.User.ServerId ?? ''),
    }
}

// ── Validation d'un jeton utilisateur Jellyfin ────────────────

export interface JellyfinTokenInfo {
    valid   : boolean
    userId? : string
    username?: string
    error?  : string
}

export function normalizeJellyfinId(id: string): string {
    return String(id).replace(/-/g, '').toLowerCase()
}

export async function validateJellyfinToken(jellyfinUserId: string, jellyfinToken: string): Promise<JellyfinTokenInfo> {
    const { jellyfinUrl } = readSettings()
    if (!jellyfinUrl) return { valid: false, error: 'Jellyfin non configuré sur ce serveur FanKarr' }

    try {
        const base = jellyfinUrl.replace(/\/$/, '')
        // /Users/{id}
        const res  = await fetch(`${base}/Users/Me`, {
            headers: userHeaders(jellyfinToken),
        })
        if (res.status === 401 || res.status === 403) return { valid: false, error: 'Jeton Jellyfin invalide ou expiré' }
        if (!res.ok) return { valid: false, error: `Jellyfin a répondu HTTP ${res.status}` }

        const user: JellyfinUser = await res.json()
        if (normalizeJellyfinId(user.Id) !== normalizeJellyfinId(jellyfinUserId)) {
            logger.warn('jellyfin', `Jeton de « ${user.Name} » présenté pour un autre utilisateur Jellyfin (${String(jellyfinUserId).slice(0, 8)}…)`)
            return { valid: false, error: 'Ce jeton Jellyfin appartient à un autre utilisateur' }
        }
        if (user.Policy?.IsDisabled) return { valid: false, error: 'Compte Jellyfin désactivé' }

        const serverId = await getJellyfinServerId()
        if (serverId && user.ServerId && normalizeJellyfinId(user.ServerId) !== serverId) {
            logger.error('jellyfin', `Jeton de « ${user.Name} » refusé : il vient d'un autre serveur Jellyfin que celui configuré`)
            return { valid: false, error: 'Ce jeton vient d\'un autre serveur Jellyfin' }
        }

        logger.debug('jellyfin', `Jeton valide pour « ${user.Name} » (${user.Id.slice(0, 8)}…)`)
        return { valid: true, userId: user.Id, username: user.Name }
    } catch (err) {
        return { valid: false, error: err instanceof Error ? err.message : 'Erreur réseau' }
    }
}
