const UNITS = ['o', 'Ko', 'Mo', 'Go', 'To']

// 936 Ko, 501,8 Mo, 20,3 Go
export function formatSize(bytes: number): string {
    if (!bytes || bytes < 0) return '0 o'
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1)
    const v = bytes / 1024 ** i
    const digits = i <= 1 ? 0 : 1
    return `${v.toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits })} ${UNITS[i]}`
}

export function formatSpeed(bytesPerSecond: number): string {
    return `${formatSize(bytesPerSecond)}/s`
}

// 26 s, 5 min 41 s, 1 h 41 min
export function formatDuration(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0 || seconds > 86400 * 7) return '∞'
    const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = Math.floor(seconds % 60)
    if (h > 0) return `${h} h ${m} min`
    if (m > 0) return `${m} min ${s} s`
    return `${s} s`
}

// à l'instant, il y a 3 h, hier, il y a 2 j, il y a 1 sem.
export function formatRelative(iso: string | null | undefined): string {
    if (!iso) return ''
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60_000), h = Math.floor(diff / 3_600_000), d = Math.floor(diff / 86_400_000)
    if (m < 1)   return "à l'instant"
    if (m < 60)  return `il y a ${m} min`
    if (h < 24)  return `il y a ${h} h`
    if (d === 1) return 'hier'
    if (d < 7)   return `il y a ${d} j`
    if (d < 35)  return `il y a ${Math.floor(d / 7)} sem.`
    return `il y a ${Math.max(1, Math.floor(d / 30))} mois`
}

// vendredi 11 septembre
export function formatToday(date = new Date()): string {
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

// 1, 2 et 3
export function listFr(items: string[]): string {
    if (items.length <= 1) return items[0] ?? ''
    return `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`
}

export function plural(n: number, singular: string, pluralForm = `${singular}s`): string {
    return `${n} ${n > 1 ? pluralForm : singular}`
}
