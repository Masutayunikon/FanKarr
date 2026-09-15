const STATUS: Record<string, string> = {
    continuing: 'En diffusion',
    ended     : 'Terminée',
    canceled  : 'Annulée',
}

export function statusLabel(status: string | null | undefined): string {
    if (!status) return ''
    return STATUS[status.toLowerCase()] ?? status
}

export function splitTitle(title: string): { name: string; suffix: string } {
    const m = title.match(/^(.+?)\s+((?:Henshū|Henshu|Kaï|Kai|Yabai|Recut|Fan-Cut)(?:\s+\(\d{4}\))?)$/)
    return m ? { name: m[1]!, suffix: m[2]! } : { name: title, suffix: '' }
}

export function isNew(lastImportedAt: string | null | undefined): boolean {
    return !!lastImportedAt && Date.now() - new Date(lastImportedAt).getTime() < 7 * 86_400_000
}
