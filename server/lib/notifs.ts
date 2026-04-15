export interface OrganizeNotif {
    hash: string; name: string; done: number; skipped: number; errors: number
    errorFiles: { file: string; error: string }[]; at: string
}

export const recentOrganized: OrganizeNotif[] = []
const MAX_NOTIFS = 20

export function pushNotif(n: OrganizeNotif) {
    recentOrganized.unshift(n)
    if (recentOrganized.length > MAX_NOTIFS) recentOrganized.pop()
}
