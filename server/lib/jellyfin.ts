
import { readSettings } from '../settings.js'
import { logger }       from '../logger.js'

const CLIENT_HEADER = 'MediaBrowser Client="FanKarr", Device="Server", DeviceId="fankarr-server", Version="1.0"'

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

        logger.debug('jellyfin', `Jeton valide pour « ${user.Name} » (${user.Id.slice(0, 8)}…)`)
        return { valid: true, userId: user.Id, username: user.Name }
    } catch (err) {
        return { valid: false, error: err instanceof Error ? err.message : 'Erreur réseau' }
    }
}
