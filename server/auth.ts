import fs   from 'fs'
import path from 'path'
import bcrypt from 'bcryptjs'
import jwt    from 'jsonwebtoken'
import type { Request, Response, NextFunction } from 'express'
import { JWT_SECRET } from './secret.js'
import { DATA_DIR }   from './config.js'
import { logger }     from './logger.js'
import {
    findByUsername, findById, findByApiToken, findByJellyfinId, importJellyfinUser,
    createUser, changePassword, regenerateApiToken, safeUser, hasUsers, markTourSeen, markLogin,
    type User,
} from './users.js'
import { readSettings, type Settings } from './settings.js'
import { startOnboarding } from './onboarding.js'
import { isJellyfinConfigured, authenticateJellyfinUser, getJellyfinServerId } from './lib/jellyfin.js'
import { loginRetryAfter, recordLoginFailure, clearLoginFailures } from './lib/login-throttle.js'

// ── Typage Express étendu ─────────────────────────────────────
declare global {
    namespace Express {
        interface Request { user?: User }
    }
}

// ── Durée de session (JWT) ────────────────────────────────────
const RAW_EXPIRY = process.env.AUTH_TOKEN_EXPIRY ?? '30d'
const NO_EXPIRY  = RAW_EXPIRY === '0' || RAW_EXPIRY.toLowerCase() === 'never'
const TOKEN_EXPIRY: string | undefined = NO_EXPIRY ? undefined : RAW_EXPIRY

function signToken(user: User): string {
    const payload = { id: user.id, username: user.username, role: user.role }
    return NO_EXPIRY
        ? jwt.sign(payload, JWT_SECRET)
        : jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY as any })
}

function setCookieAndRespond(res: Response, user: User): void {
    user.lastLoginAt = markLogin(user.id) ?? user.lastLoginAt
    const token = signToken(user)
    res.cookie('fankarr_token', token, { httpOnly: true, sameSite: 'lax' })
    res.json({ success: true, user: safeUser(user) })
}

// ── Routes ────────────────────────────────────────────────────

function jellyfinLoginEnabled(s: Settings): boolean {
    return s.jellyfinLogin && isJellyfinConfigured(s)
}

// GET /api/auth/status
export function authStatus(req: Request, res: Response): void {
    const settings      = readSettings()
    const setup         = hasUsers()
    const jellyfinLogin = jellyfinLoginEnabled(settings)
    const token         = req.cookies?.fankarr_token

    if (!token) { res.json({ setup, loggedIn: false, jellyfinLogin }); return }

    try {
        const payload = jwt.verify(token, JWT_SECRET) as any
        const user    = findById(payload.id)
        if (!user) { res.json({ setup, loggedIn: false, jellyfinLogin }); return }
        res.json({
            setup, loggedIn: true, jellyfinLogin, role: user.role, username: user.username, userId: user.id,
            onboardingDone: !!settings.onboardingCompletedAt,
            tourSeen      : !!user.tourSeenAt,
        })
    } catch {
        res.json({ setup, loggedIn: false, jellyfinLogin })
    }
}

// POST /api/auth/setup  (premier lancement uniquement)
export function authSetup(req: Request, res: Response): void {
    if (hasUsers()) {
        logger.warn('auth', 'Tentative de création du premier compte alors qu\'un compte existe')
        res.status(400).json({ error: 'Un compte existe déjà' }); return
    }

    const { username, password } = req.body
    if (!username || !password) {
        res.status(400).json({ error: 'Nom d\'utilisateur et mot de passe requis' }); return
    }
    if (password.length < 6) {
        res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' }); return
    }

    try {
        const user = createUser(username, password, 'admin')
        startOnboarding()
        logger.info('auth', `Premier compte admin créé pour « ${username} »`)
        setCookieAndRespond(res, user)
    } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur inattendue, consultez les journaux' })
    }
}

// Compte FanKarr lié à l'utilisateur Jellyfin authentifié, ou undefined si refusé
async function loginWithJellyfin(username: string, password: string, ip: string): Promise<{ user?: User; unreachable?: boolean }> {
    const result = await authenticateJellyfinUser(username, password, ip)
    if (!result.ok) {
        if (result.reason === 'unreachable') {
            logger.warn('auth', `Connexion Jellyfin de « ${username} » impossible : ${result.error}`)
            return { unreachable: true }
        }
        return {}
    }

    const serverId = await getJellyfinServerId()
    if (!serverId) {
        logger.error('auth', `Connexion Jellyfin de « ${username} » refusée : impossible de lire l'identifiant du serveur Jellyfin avec la clé API`)
        return {}
    }
    if (result.serverId !== serverId) {
        logger.error('auth', `Connexion Jellyfin de « ${username} » refusée : la réponse vient d'un autre serveur Jellyfin que celui configuré`)
        return {}
    }

    const linked = findByJellyfinId(result.id)
    if (linked) return { user: linked }

    if (!readSettings().jellyfinNewUserLogin) {
        logger.warn('auth', `Connexion Jellyfin de « ${result.name} » refusée : compte pas encore importé`)
        return {}
    }
    const imported = importJellyfinUser({ Id: result.id, Name: result.name })
    if (imported?.action === 'created') logger.info('auth', `Compte créé pour « ${result.name} » à sa première connexion Jellyfin`)
    return { user: imported?.user }
}

// POST /api/auth/login
export async function authLogin(req: Request, res: Response): Promise<void> {
    if (!hasUsers()) {
        res.status(400).json({ error: 'Aucun compte configuré' }); return
    }

    const { username, password } = req.body ?? {}
    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
        res.status(400).json({ error: 'Nom d\'utilisateur et mot de passe requis' }); return
    }

    const ip   = req.ip ?? ''
    const wait = loginRetryAfter(ip, username)
    if (wait > 0) {
        logger.warn('auth', `Connexion de « ${username} » bloquée : trop de tentatives depuis ${ip}`)
        res.set('Retry-After', String(wait))
        res.status(429).json({ error: `Trop de tentatives. Réessayez dans ${Math.ceil(wait / 60)} min.` }); return
    }

    const session = NO_EXPIRY ? 'sans expiration' : TOKEN_EXPIRY
    const user    = findByUsername(username)
    if (user && bcrypt.compareSync(password, user.passwordHash)) {
        clearLoginFailures(ip, username)
        logger.info('auth', `Connexion de « ${username} » (rôle : ${user.role}, session : ${session})`)
        setCookieAndRespond(res, user); return
    }

    // Jellyfin n'est interrogé que pour un compte importé, ou un nouveau compte si le réglage l'autorise
    const settings = readSettings()
    const tryJellyfin = jellyfinLoginEnabled(settings) && (user ? !!user.jellyfinId : settings.jellyfinNewUserLogin)
    if (tryJellyfin) {
        const jf = await loginWithJellyfin(username, password, ip)
        if (jf.user) {
            clearLoginFailures(ip, username)
            logger.info('auth', `Connexion de « ${jf.user.username} » via Jellyfin (rôle : ${jf.user.role}, session : ${session})`)
            setCookieAndRespond(res, jf.user); return
        }
        if (jf.unreachable) {
            res.status(503).json({ error: 'Connexion Jellyfin impossible : Jellyfin ne répond pas.' }); return
        }
    }

    recordLoginFailure(ip, username)
    logger.warn('auth', `Échec de la connexion de « ${username} »`)
    res.status(401).json({ error: 'Identifiants incorrects' })
}

// POST /api/auth/logout
export function authLogout(req: Request, res: Response): void {
    const token = req.cookies?.fankarr_token
    if (token) {
        try {
            const p = jwt.verify(token, JWT_SECRET) as any
            logger.info('auth', `Déconnexion de « ${p.username} »`)
        } catch {}
    }
    res.clearCookie('fankarr_token')
    res.json({ success: true })
}

// GET /api/auth/me
export function authMe(req: Request, res: Response): void {
    res.json(safeUser(req.user!))
}

// POST /api/auth/change-password
export function authChangePassword(req: Request, res: Response): void {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) {
        res.status(400).json({ error: 'Mot de passe actuel et nouveau mot de passe requis' }); return
    }
    if (newPassword.length < 6) {
        res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 6 caractères' }); return
    }
    try {
        changePassword(req.user!.id, currentPassword, newPassword)
        res.json({ success: true })
    } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur inattendue, consultez les journaux' })
    }
}

// POST /api/auth/regenerate-token
export function authRegenerateToken(req: Request, res: Response): void {
    try {
        const token = regenerateApiToken(req.user!.id)
        res.json({ apiToken: token })
    } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur inattendue, consultez les journaux' })
    }
}

// POST /api/auth/tour-seen
export function authTourSeen(req: Request, res: Response): void {
    try {
        res.json({ tourSeenAt: markTourSeen(req.user!.id) })
    } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Erreur inattendue, consultez les journaux' })
    }
}

// ── Contrôle d'accès ─────────────────────────────────────────

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
    const token = req.cookies?.fankarr_token
    if (!token) {
        logger.debug('auth', `Accès refusé : non authentifié (${req.method} ${req.path})`)
        res.status(401).json({ error: 'Session expirée, reconnectez-vous' }); return
    }
    try {
        const payload = jwt.verify(token, JWT_SECRET) as any
        const user    = findById(payload.id)
        if (!user) {
            res.status(401).json({ error: 'Utilisateur introuvable' }); return
        }
        req.user = user
        next()
    } catch {
        logger.warn('auth', `Jeton de session invalide (${req.method} ${req.path})`)
        res.status(401).json({ error: 'Session expirée, reconnectez-vous' })
    }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
    requireAuth(req, res, () => {
        if (req.user?.role !== 'admin') {
            logger.warn('auth', `Accès admin refusé pour « ${req.user?.username} » (${req.method} ${req.path})`)
            res.status(403).json({ error: 'Accès réservé aux administrateurs' }); return
        }
        next()
    })
}

export function requireAuthOrApiToken(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
        const user = findByApiToken(authHeader.slice(7))
        if (user) { req.user = user; next(); return }
    }
    requireAuth(req, res, next)
}
