/**
 * logger.ts
 * =========
 * Logger centralisé — écrit dans data/logs.jsonl (une ligne JSON par event)
 * Niveaux : debug | info | warn | error
 * En prod (NODE_ENV=production) les lignes debug ne sont pas écrites sur disque.
 */

import fs   from 'fs'
import path from 'path'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
    at      : string    // ISO timestamp
    level   : LogLevel
    source  : string    // 'organize' | 'api' | 'scraper' | ...
    msg     : string
    meta?   : Record<string, any>
}

const LOGS_PATH    = path.join(process.cwd(), 'data', 'logs.jsonl')
const MAX_LINES    = 2000   // rotation auto au-delà
const IS_PROD      = process.env.NODE_ENV === 'production'

// ── Écriture ──────────────────────────────────────────────────

function writeLine(entry: LogEntry) {
    try {
        fs.appendFileSync(LOGS_PATH, JSON.stringify(entry) + '\n', 'utf-8')
        // Rotation si trop grand
        const content = fs.readFileSync(LOGS_PATH, 'utf-8')
        const lines   = content.split('\n').filter(Boolean)
        if (lines.length > MAX_LINES) {
            fs.writeFileSync(LOGS_PATH, lines.slice(-MAX_LINES).join('\n') + '\n', 'utf-8')
        }
    } catch {}
}

// ── API publique ──────────────────────────────────────────────

export function log(level: LogLevel, source: string, msg: string, meta?: Record<string, any>) {
    const entry: LogEntry = { at: new Date().toISOString(), level, source, msg, meta }

    // Console
    const prefix = `[${source}]`
    if (level === 'error') console.error(prefix, msg, meta ?? '')
    else if (level === 'warn')  console.warn(prefix, msg, meta ?? '')
    else if (level === 'debug' && !IS_PROD) console.log(prefix, msg, meta ?? '')
    else if (level === 'info')  console.log(prefix, msg, meta ?? '')

    // Disque — pas les debug en prod
    if (level === 'debug' && IS_PROD) return
    writeLine(entry)
}

export const logger = {
    debug: (source: string, msg: string, meta?: Record<string, any>) => log('debug', source, msg, meta),
    info : (source: string, msg: string, meta?: Record<string, any>) => log('info',  source, msg, meta),
    warn : (source: string, msg: string, meta?: Record<string, any>) => log('warn',  source, msg, meta),
    error: (source: string, msg: string, meta?: Record<string, any>) => log('error', source, msg, meta),
}

// ── Lecture pour l'API ────────────────────────────────────────

export interface LogsReadOptions {
    limit?  : number           // nb de lignes (défaut 100)
    level?  : LogLevel | 'all' // filtre niveau
    source? : string           // filtre source
}

export function readLogs(opts: LogsReadOptions = {}): LogEntry[] {
    try {
        if (!fs.existsSync(LOGS_PATH)) return []
        const content = fs.readFileSync(LOGS_PATH, 'utf-8')
        let lines = content.split('\n').filter(Boolean)

        // Parse
        let entries: LogEntry[] = []
        for (const line of lines) {
            try { entries.push(JSON.parse(line)) } catch {}
        }

        // Filtres
        if (opts.level && opts.level !== 'all')
            entries = entries.filter(e => e.level === opts.level)
        if (opts.source)
            entries = entries.filter(e => e.source === opts.source)

        // Plus récents en premier
        entries.reverse()

        // Limite
        const limit = opts.limit ?? 100
        return entries.slice(0, limit)
    } catch { return [] }
}

export function clearLogs(): void {
    try { fs.writeFileSync(LOGS_PATH, '', 'utf-8') } catch {}
}

export function logsFileSize(): number {
    try { return fs.statSync(LOGS_PATH).size } catch { return 0 }
}