import fs from 'fs'
import path from 'path'

export const _isBunBinary = typeof (globalThis as any).Bun !== 'undefined'
    && path.dirname((process as any).execPath) !== process.cwd()

// Charge le .env du binaire Bun avant tout module qui lit process.env
;(() => {
    if (!_isBunBinary) return
    const binDir  = path.dirname((process as any).execPath)
    const envPath = path.join(binDir, '.env')
    if (!fs.existsSync(envPath)) return
    try {
        const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
        for (const raw of lines) {
            const line = raw.trim()
            if (!line || line.startsWith('#')) continue
            const eq  = line.indexOf('=')
            if (eq === -1) continue
            const key = line.slice(0, eq).trim()
            let   val = line.slice(eq + 1).trim()
            if ((val.startsWith('"') && val.endsWith('"')) ||
                (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1)
            }
            if (key && !(key in process.env)) process.env[key] = val
        }
        console.log(`[config] .env chargé depuis ${envPath}`)
    } catch (err) {
        console.warn(`[config] Impossible de charger le fichier .env : ${err}`)
    }
})()

export const BASE_DIR = _isBunBinary
    ? path.dirname((process as any).execPath)
    : process.cwd()

const isInContainer = (): boolean => {
    if (fs.existsSync('/.dockerenv')) return true;

    // Podman
    if (fs.existsSync('/.containerenv')) return true;

    try {
        const cgroup = fs.readFileSync('/proc/1/cgroup', 'utf8');
        if (/docker|podman|containerd|lxc/i.test(cgroup)) return true;
    } catch {}

    try {
        const environ = fs.readFileSync('/proc/1/environ', 'utf8');
        if (environ.includes('container=')) return true;
    } catch {}

    return false;
};

export const DATA_DIR = isInContainer()
    ? '/config'
    : path.join(BASE_DIR, 'config');