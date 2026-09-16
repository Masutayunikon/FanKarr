import fs from 'fs'
import path from 'path'
import { threadId } from 'worker_threads'
import { DATA_DIR } from '../config.js'

export type Organized = Record<string, Record<string, any>>

export const ORGANIZED_PATH = path.join(DATA_DIR, 'organized.json')

// Un fichier existant mais illisible lève une erreur : ne jamais repartir de {} avant d'écrire
export function readOrganized(file = ORGANIZED_PATH): Organized {
    if (!fs.existsSync(file)) return {}
    const raw = fs.readFileSync(file, 'utf-8')
    let data: unknown
    try { data = JSON.parse(raw) }
    catch (err) { throw new Error(`Fichier de suivi des imports (organized.json) corrompu : ${err instanceof Error ? err.message : err}`) }
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Fichier de suivi des imports (organized.json) corrompu : contenu inattendu')
    return data as Organized
}

export function writeOrganized(data: Organized, file = ORGANIZED_PATH): void {
    for (const hash of Object.keys(data))
        if (!data[hash] || Object.keys(data[hash]).length === 0) delete data[hash]
    const tmp = `${file}.${process.pid}-${threadId}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8')
    renameWithRetry(tmp, file)
}

// Répercute des déplacements de fichiers sur toutes les entrées qui les suivent, tous hashes confondus
export function retargetEntries(data: Organized, moves: Map<string, string>): number {
    let updated = 0
    for (const eps of Object.values(data)) {
        for (const entry of Object.values(eps)) {
            const to = entry?.dest_path ? moves.get(entry.dest_path) : undefined
            if (!to) continue
            entry.dest_path     = to
            entry.dest_filename = path.basename(to)
            entry.dest_dir      = path.dirname(to)
            updated++
        }
    }
    return updated
}

// Lecture-modification-écriture synchrone ; fn renvoie false pour ne rien écrire
export function updateOrganized(fn: (data: Organized) => boolean | void, file = ORGANIZED_PATH): void {
    const data = readOrganized(file)
    if (fn(data) !== false) writeOrganized(data, file)
}

function renameWithRetry(from: string, to: string, attempts = 5): void {
    for (let i = 1; ; i++) {
        try { fs.renameSync(from, to); return }
        catch (err: any) {
            if (i >= attempts || !['EPERM', 'EACCES', 'EBUSY'].includes(err?.code)) throw err
            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20 * i)
        }
    }
}
