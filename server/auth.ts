import fs   from 'fs'
import path from 'path'
import bcrypt from 'bcryptjs'
import jwt    from 'jsonwebtoken'
import type { Request, Response, NextFunction } from 'express'
import { JWT_SECRET } from './secret.js'
import { DATA_DIR }   from './config.js'
import { logger }     from './logger.js'
import {
    findByUsername, findById, findByApiToken,
    createUser, changePassword, regenerateApiToken, safeUser, hasUsers, markTourSeen, markLogin,
    type User,
} from './users.js'
import { readSettings } from './settings.js'
import { startOnboarding } from './onboarding.js'

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

// GET /api/auth/status
export function authStatus(req: Request, res: Response): void {
    const setup = hasUsers()
    const token = req.cookies?.fankarr_token

    if (!token) { res.json({ setup, loggedIn: false }); return }

    try {
        const payload = jwt.verify(token, JWT_SECRET) as any
        const user    = findById(payload.id)
        if (!user) { res.json({ setup, loggedIn: false }); return }
        res.json({
            setup, loggedIn: true, role: user.role, username: user.username, userId: user.id,
            onboardingDone: !!readSettings().onboardingCompletedAt,
            tourSeen      : !!user.tourSeenAt,
        })
    } catch {
        res.json({ setup, loggedIn: false })
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

// POST /api/auth/login
export function authLogin(req: Request, res: Response): void {
    if (!hasUsers()) {
        res.status(400).json({ error: 'Aucun compte configuré' }); return
    }

    const { username, password } = req.body
    if (!username || !password) {
        res.status(400).json({ error: 'Nom d\'utilisateur et mot de passe requis' }); return
    }

    const user = findByUsername(username)
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
        logger.warn('auth', `Échec de la connexion de « ${username} »`)
        res.status(401).json({ error: 'Identifiants incorrects' }); return
    }

    logger.info('auth', `Connexion de « ${username} » (rôle : ${user.role}, session : ${NO_EXPIRY ? 'sans expiration' : TOKEN_EXPIRY})`)
    setCookieAndRespond(res, user)
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
