
import fs       from 'fs'
import path     from 'path'
import crypto   from 'crypto'
import { DATA_DIR } from './config.js'

const SECRET_PATH = path.join(DATA_DIR, 'secret.key')

function generateSecret(): string {
    return crypto.randomBytes(48).toString('hex')
}

function loadOrCreateSecret(): string {
    if (process.env.JWT_SECRET && process.env.JWT_SECRET !== 'fankarr-secret-change-me') {
        return process.env.JWT_SECRET
    }

    if (fs.existsSync(SECRET_PATH)) {
        const secret = fs.readFileSync(SECRET_PATH, 'utf-8').trim()
        if (secret.length > 0) return secret
    }

    const secret = generateSecret()
    try {
        fs.mkdirSync(path.dirname(SECRET_PATH), { recursive: true })
        fs.writeFileSync(SECRET_PATH, secret, { encoding: 'utf-8', mode: 0o600 })
        console.log(`[auth] Secret JWT généré dans ${SECRET_PATH}`)
    } catch (err) {
        console.error('[auth] Impossible d\'enregistrer le secret JWT :', err)
    }

    return secret
}

export const JWT_SECRET: string = loadOrCreateSecret()