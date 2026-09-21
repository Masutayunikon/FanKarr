const MAX_FAILURES = 5
const WINDOW_MS    = 15 * 60_000

const failures = new Map<string, { count: number; firstAt: number }>()

function keyOf(ip: string, username: string): string {
    return `${ip}|${username.toLowerCase()}`
}

function sweep(now: number): void {
    for (const [key, entry] of failures) {
        if (now - entry.firstAt >= WINDOW_MS) failures.delete(key)
    }
}

// Secondes avant une nouvelle tentative, 0 si la connexion est permise
export function loginRetryAfter(ip: string, username: string): number {
    const key   = keyOf(ip, username)
    const entry = failures.get(key)
    if (!entry) return 0
    const elapsed = Date.now() - entry.firstAt
    if (elapsed >= WINDOW_MS) { failures.delete(key); return 0 }
    return entry.count >= MAX_FAILURES ? Math.ceil((WINDOW_MS - elapsed) / 1000) : 0
}

export function recordLoginFailure(ip: string, username: string): void {
    const now = Date.now()
    if (failures.size > 10_000) sweep(now)
    const key   = keyOf(ip, username)
    const entry = failures.get(key)
    if (!entry || now - entry.firstAt >= WINDOW_MS) failures.set(key, { count: 1, firstAt: now })
    else entry.count++
}

export function clearLoginFailures(ip: string, username: string): void {
    failures.delete(keyOf(ip, username))
}
