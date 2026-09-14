import fs from 'fs'
import os from 'os'
import path from 'path'
import { randomBytes } from 'crypto'
import type { Request, Response } from 'express'

// GET /api/system/info
export function systemInfo(_req: Request, res: Response): void {
    const isTermux  = fs.existsSync('/data/data/com.termux')
    const platform  = os.platform()

    res.json({
        platform,
        isTermux,
        defaultPath: isTermux ? '/sdcard/' : '/',
    })
}

// ── Vérification des dossiers (assistant de configuration) ────

export interface PathCheck {
    input      : string
    resolved   : string
    exists     : boolean
    isDirectory: boolean
    writable   : boolean
    error?     : string
}

export interface HardlinkCheck {
    tested : boolean
    ok     : boolean
    code?  : string
    message: string
}

export type PathRelation = 'distinct' | 'same' | 'nested'

function tempName(prefix: string): string {
    return `.fankarr-${prefix}-${process.pid}-${randomBytes(4).toString('hex')}`
}

function removeQuietly(file: string): void {
    try { fs.rmSync(file, { force: true, maxRetries: 3, retryDelay: 100 }) } catch {}
}

export function checkDirectory(input: string, { allowRoot = true } = {}): PathCheck {
    const raw    = (input ?? '').trim()
    const result: PathCheck = { input: raw, resolved: '', exists: false, isDirectory: false, writable: false }

    if (!raw)                     return { ...result, error: 'Chemin vide' }
    if (/^[A-Za-z]:$/.test(raw))  return { ...result, error: 'Chemin incomplet : ajoutez une barre après la lettre du lecteur' }
    if (!path.isAbsolute(raw))    return { ...result, error: 'Le chemin doit être absolu' }

    result.resolved = path.resolve(raw)
    if (!allowRoot && path.parse(result.resolved).root === result.resolved) {
        return { ...result, error: 'La racine du disque ne peut pas servir de médiathèque' }
    }

    let stat: fs.Stats
    try { stat = fs.statSync(result.resolved) }
    catch { return { ...result, error: 'Dossier introuvable' } }

    result.exists = true
    if (!stat.isDirectory()) return { ...result, error: "Ce chemin n'est pas un dossier" }
    result.isDirectory = true

    // Test d'écriture réel
    const probe = path.join(result.resolved, tempName('write'))
    try {
        fs.writeFileSync(probe, '')
        result.writable = true
    } catch (err) {
        const code = (err as NodeJS.ErrnoException).code
        result.error = `Écriture impossible${code ? ` (${code})` : ''}`
    } finally {
        removeQuietly(probe)
    }
    return result
}

export function pathRelation(a: string, b: string): PathRelation {
    const norm = (p: string) => {
        const r = path.resolve(p).replace(/[\\/]+$/, '')
        return process.platform === 'win32' ? r.toLowerCase() : r
    }
    const na = norm(a), nb = norm(b)
    if (na === nb) return 'same'
    if (na.startsWith(nb + path.sep) || nb.startsWith(na + path.sep)) return 'nested'
    return 'distinct'
}

function hardlinkMessage(code: string | undefined, err: unknown): string {
    switch (code) {
        case 'EXDEV':
            return 'Volumes différents : hardlink impossible. Passez en mode Copier ou, sous Docker, montez un seul volume parent contenant téléchargements et médiathèque.'
        case 'EPERM':
        case 'ENOTSUP':
        case 'ENOSYS':
            return 'Ce système de fichiers ne gère pas les hardlinks (FAT/exFAT, partage réseau…).'
        case 'EACCES':
            return 'Permissions insuffisantes pour créer un hardlink.'
        default:
            return `Hardlink impossible : ${err instanceof Error ? err.message : String(err)}`
    }
}

export function testHardlink(srcDir: string, destDir: string): HardlinkCheck {
    const name = tempName('linktest')
    const src  = path.join(srcDir, name)
    const dest = path.join(destDir, `${name}.link`)
    try {
        fs.writeFileSync(src, '')
        fs.linkSync(src, dest)
        return { tested: true, ok: true, message: 'Hardlink possible entre les deux dossiers' }
    } catch (err) {
        const code = (err as NodeJS.ErrnoException).code
        return { tested: true, ok: false, code, message: hardlinkMessage(code, err) }
    } finally {
        removeQuietly(dest)
        removeQuietly(src)
    }
}

export function checkPaths(mediaPath: string, completePath?: string) {
    const media    = checkDirectory(mediaPath, { allowRoot: false })
    const hasComplete = !!completePath?.trim()
    const complete = hasComplete ? checkDirectory(completePath!) : null

    const valid    = (c: PathCheck | null) => !!c && c.writable && !c.error
    const relation = hasComplete && media.resolved && complete?.resolved
        ? pathRelation(media.resolved, complete.resolved)
        : null

    let hardlink: HardlinkCheck
    if (!hasComplete) {
        hardlink = { tested: false, ok: false, message: 'Renseignez le dossier de téléchargements pour tester le hardlink' }
    } else if (!valid(media) || !valid(complete)) {
        hardlink = { tested: false, ok: false, message: 'Test impossible tant que les dossiers ne sont pas valides' }
    } else if (relation === 'same') {
        hardlink = { tested: false, ok: false, message: 'Les deux dossiers sont identiques' }
    } else {
        hardlink = testHardlink(complete!.resolved, media.resolved)
    }

    return {
        ok: valid(media) && (!hasComplete || valid(complete)) && relation !== 'same',
        mediaPath   : media,
        completePath: complete,
        relation,
        hardlink,
    }
}
