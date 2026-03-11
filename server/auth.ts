import fs from 'fs'
import path from 'path'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import type { Request, Response, NextFunction } from 'express'
import { JWT_SECRET } from './secret.js'

const DATA_PATH = path.join(process.cwd(), 'data', 'auth.json')
const SALT_ROUNDS = 10

interface AuthData {
    username: string
    passwordHash: string
}

// ── Helpers fichier ───────────────────────────────────────────
function readAuth(): AuthData | null {
    try {
        if (!fs.existsSync(DATA_PATH)) return null
        return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'))
    } catch { return null }
}

function writeAuth(data: AuthData): void {
    fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true })
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2))
}

// ── Routes ────────────────────────────────────────────────────

// GET /api/auth/status
export function authStatus(req: Request, res: Response): void {
    const existing = readAuth()
    const token = req.cookies?.fankarr_token

    let loggedIn = false
    if (token) {
        try {
            jwt.verify(token, JWT_SECRET)
            loggedIn = true
        } catch {}
    }

    res.json({
        setup: !!existing,
        loggedIn
    })
}

// POST /api/auth/setup
export function authSetup(req: Request, res: Response): void {
    if (readAuth()) {
        res.status(400).json({ error: 'Un compte existe déjà' })
        return
    }

    const { username, password } = req.body
    if (!username || !password) {
        res.status(400).json({ error: 'Username et password requis' })
        return
    }

    const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS)
    writeAuth({ username, passwordHash })

    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1d' })
    res.cookie('fankarr_token', token, { httpOnly: true, sameSite: 'lax' })
    res.json({ success: true })
}

// POST /api/auth/login
export function authLogin(req: Request, res: Response): void {
    const auth = readAuth()
    if (!auth) {
        res.status(400).json({ error: 'Aucun compte configuré' })
        return
    }

    const { username, password } = req.body
    if (!username || !password) {
        res.status(400).json({ error: 'Username et password requis' })
        return
    }

    if (username !== auth.username || !bcrypt.compareSync(password, auth.passwordHash)) {
        res.status(401).json({ error: 'Identifiants incorrects' })
        return
    }

    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1d' })
    res.cookie('fankarr_token', token, { httpOnly: true, sameSite: 'lax' })
    res.json({ success: true })
}

// POST /api/auth/logout
export function authLogout(_req: Request, res: Response): void {
    res.clearCookie('fankarr_token')
    res.json({ success: true })
}

// Middleware protection des routes
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
    const token = req.cookies?.fankarr_token
    if (!token) {
        res.status(401).json({ error: 'Non authentifié' })
        return
    }
    try {
        jwt.verify(token, JWT_SECRET)
        next()
    } catch {
        res.status(401).json({ error: 'Token invalide' })
    }
}