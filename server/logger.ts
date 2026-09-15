
import fs   from 'fs'
import path from 'path'
import { DATA_DIR } from './config.js'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
    at      : string    // date ISO
    level   : LogLevel
    source  : string    // 'api', 'organize', 'torrent-clients', 'rss-sync'…
    msg     : string
    meta?   : Record<string, any>
}

const LOGS_PATH    = path.join(DATA_DIR, 'logs.jsonl')
const MAX_LINES    = 2000   // rotation automatique au-delà
const ROTATE_SLACK = 200    // marge avant rotation, pour ne pas réécrire le fichier à chaque ligne
const IS_PROD      = process.env.NODE_ENV === 'production'

// ── Écriture ──────────────────────────────────────────────────

let lineCount: number | null = null

function countLines(): number {
    if (!fs.existsSync(LOGS_PATH)) return 0
    return fs.readFileSync(LOGS_PATH, 'utf-8').split('\n').filter(Boolean).length
}

function writeLine(entry: LogEntry) {
    try {
        lineCount ??= countLines()
        fs.appendFileSync(LOGS_PATH, JSON.stringify(entry) + '\n', 'utf-8')
        if (++lineCount > MAX_LINES + ROTATE_SLACK) {
            const lines = fs.readFileSync(LOGS_PATH, 'utf-8').split('\n').filter(Boolean).slice(-MAX_LINES)
            fs.writeFileSync(LOGS_PATH, lines.join('\n') + '\n', 'utf-8')
            lineCount = lines.length
        }
    } catch {}
}

// ── API publique ──────────────────────────────────────────────

export function log(level: LogLevel, source: string, msg: string, meta?: Record<string, any>) {
    const entry: LogEntry = { at: new Date().toISOString(), level, source, msg, meta }

    const prefix = `[${source}]`
    if (level === 'error') console.error(prefix, msg, meta ?? '')
    else if (level === 'warn')  console.warn(prefix, msg, meta ?? '')
    else if (level === 'debug' && !IS_PROD) console.log(prefix, msg, meta ?? '')
    else if (level === 'info')  console.log(prefix, msg, meta ?? '')

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
    limit?  : number           // nombre de lignes (100 par défaut)
    level?  : LogLevel | 'all'
    source? : string
}

export function readLogs(opts: LogsReadOptions = {}): LogEntry[] {
    try {
        if (!fs.existsSync(LOGS_PATH)) return []
        const content = fs.readFileSync(LOGS_PATH, 'utf-8')
        let lines = content.split('\n').filter(Boolean)

        let entries: LogEntry[] = []
        for (const line of lines) {
            try { entries.push(JSON.parse(line)) } catch {}
        }

        if (opts.level && opts.level !== 'all')
            entries = entries.filter(e => e.level === opts.level)
        if (opts.source)
            entries = entries.filter(e => e.source === opts.source)

        entries.reverse()

        const limit = opts.limit ?? 100
        return entries.slice(0, limit)
    } catch { return [] }
}

export function clearLogs(): void {
    try { fs.writeFileSync(LOGS_PATH, '', 'utf-8'); lineCount = 0 } catch {}
}

export function logsFileSize(): number {
    try { return fs.statSync(LOGS_PATH).size } catch { return 0 }
}