import fs from 'fs'
import path from 'path'

export const _isBunBinary = typeof (globalThis as any).Bun !== 'undefined'
    && path.dirname((process as any).execPath) !== process.cwd()

// ── Chargement anticipé du fichier .env pour les binaires bun ─────────────
// Doit s'exécuter avant tout autre module qui lit process.env
// (secret.ts, auth.ts…) car config.ts est la dépendance la plus profonde.
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
            // Supprimer les guillemets optionnels
            if ((val.startsWith('"') && val.endsWith('"')) ||
                (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1)
            }
            // Ne pas écraser les variables déjà définies (CLI/système prioritaires)
            if (key && !(key in process.env)) process.env[key] = val
        }
        console.log(`[config] .env chargé depuis ${envPath}`)
    } catch (err) {
        console.warn(`[config] Impossible de charger .env : ${err}`)
    }
})()

export const BASE_DIR = _isBunBinary
    ? path.dirname((process as any).execPath)
    : process.cwd()

const isInContainer = (): boolean => {
    // Docker
    if (fs.existsSync('/.dockerenv')) return true;

    // Podman (crée un fichier /.containerenv)
    if (fs.existsSync('/.containerenv')) return true;

    // Vérification via cgroup (Docker, Podman, LXC, etc.)
    try {
        const cgroup = fs.readFileSync('/proc/1/cgroup', 'utf8');
        if (/docker|podman|containerd|lxc/i.test(cgroup)) return true;
    } catch {}

    // Vérification via /proc/1/environ (fallback général)
    try {
        const environ = fs.readFileSync('/proc/1/environ', 'utf8');
        if (environ.includes('container=')) return true;
    } catch {}

    return false;
};

export const DATA_DIR = isInContainer()
    ? '/config'
    : path.join(BASE_DIR, 'config');