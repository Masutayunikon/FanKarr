import fs from 'fs'
import path from 'path'

export const _isBunBinary = typeof (globalThis as any).Bun !== 'undefined'
    && path.dirname((process as any).execPath) !== process.cwd()

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