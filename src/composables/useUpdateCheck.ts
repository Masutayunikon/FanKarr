import { ref, onMounted, onUnmounted } from 'vue'

const GITHUB_REPO = 'masutayunikon/FanKarr'

const currentVersion   = ref(import.meta.env.DEV ? 'dev' : '')
const latestVersion    = ref('')
const latestReleaseUrl = ref(`https://github.com/${GITHUB_REPO}/releases/latest`)
const updateAvailable  = ref(false)

let users = 0
let timer: ReturnType<typeof setInterval> | null = null

function parseVersion(v: string): number[] {
    return v.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0)
}

function isNewer(latest: string, current: string): boolean {
    if (current === 'dev') return false
    const l = parseVersion(latest)
    const c = parseVersion(current)
    for (let i = 0; i < Math.max(l.length, c.length); i++) {
        const lv = l[i] ?? 0
        const cv = c[i] ?? 0
        if (lv > cv) return true
        if (lv < cv) return false
    }
    return false
}

async function checkForUpdates() {
    try {
        // Version locale
        const vRes = await fetch('/api/version', { credentials: 'include' })
        if (vRes.ok) {
            const { version } = await vRes.json()
            currentVersion.value = version
        }

        if (currentVersion.value === 'dev') return

        // Dernière release GitHub
        const gRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
            headers: { Accept: 'application/vnd.github.v3+json' },
        })
        if (!gRes.ok) return
        const release = await gRes.json()
        latestVersion.value    = release.tag_name ?? ''
        latestReleaseUrl.value = release.html_url ?? latestReleaseUrl.value

        if (isNewer(latestVersion.value, currentVersion.value)) {
            updateAvailable.value = true
        }
    } catch {}
}

export function useUpdateCheck() {
    onMounted(() => {
        if (users++ > 0) return
        checkForUpdates()
        // Revérifier toutes les 6h
        timer = setInterval(checkForUpdates, 6 * 60 * 60 * 1000)
    })

    onUnmounted(() => {
        if (--users > 0 || !timer) return
        clearInterval(timer)
        timer = null
    })

    return { currentVersion, latestVersion, latestReleaseUrl, updateAvailable }
}
