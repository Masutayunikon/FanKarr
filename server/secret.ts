/**
 * secret.ts
 * =========
 * Génère et persiste le JWT secret dans data/secret.key
 * Si JWT_SECRET est défini en variable d'environnement, il est utilisé tel quel.
 * Sinon, on lit data/secret.key — s'il n'existe pas, on en génère un et on le sauvegarde.
 */

import fs       from 'fs'
import path     from 'path'
import crypto   from 'crypto'
import { BASE_DIR } from './config.js'

const SECRET_PATH = path.join(BASE_DIR, 'config', 'secret.key')

function generateSecret(): string {
    return crypto.randomBytes(48).toString('hex')
}

function loadOrCreateSecret(): string {
    // 1. Variable d'environnement — priorité absolue
    if (process.env.JWT_SECRET && process.env.JWT_SECRET !== 'fankarr-secret-change-me') {
        return process.env.JWT_SECRET
    }

    // 2. Fichier existant
    if (fs.existsSync(SECRET_PATH)) {
        const secret = fs.readFileSync(SECRET_PATH, 'utf-8').trim()
        if (secret.length > 0) return secret
    }

    // 3. Génération + sauvegarde
    const secret = generateSecret()
    try {
        fs.mkdirSync(path.dirname(SECRET_PATH), { recursive: true })
        fs.writeFileSync(SECRET_PATH, secret, { encoding: 'utf-8', mode: 0o600 })
        console.log('[auth] JWT secret généré et sauvegardé dans data/secret.key')
    } catch (err) {
        console.error('[auth] Impossible de sauvegarder le secret:', err)
    }

    return secret
}

export const JWT_SECRET: string = loadOrCreateSecret()