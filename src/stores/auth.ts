import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
    const loggedIn  = ref(false)
    const setup     = ref(false)
    const loading   = ref(true)
    const role      = ref<'admin' | 'user' | null>(null)
    const username  = ref<string | null>(null)
    const userId    = ref<string | null>(null)

    const onboardingDone = ref(true)
    const tourSeen       = ref(true)

    const isAdmin = computed(() => role.value === 'admin')

    async function checkStatus() {
        try {
            const res  = await fetch('/api/auth/status')
            const data = await res.json()
            setup.value    = data.setup
            loggedIn.value = data.loggedIn
            role.value     = data.role     ?? null
            username.value = data.username ?? null
            userId.value   = data.userId   ?? null
            onboardingDone.value = data.onboardingDone ?? true
            tourSeen.value       = data.tourSeen       ?? true
        } catch {
            loggedIn.value = false
        } finally {
            loading.value = false
        }
    }

    async function login(u: string, password: string): Promise<string | null> {
        const res  = await fetch('/api/auth/login', {
            method : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body   : JSON.stringify({ username: u, password }),
        })
        const data = await res.json()
        if (res.ok) {
            await checkStatus()
            return null
        }
        return data.error
    }

    async function setupAccount(u: string, password: string): Promise<string | null> {
        const res  = await fetch('/api/auth/setup', {
            method : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body   : JSON.stringify({ username: u, password }),
        })
        const data = await res.json()
        if (res.ok) {
            loggedIn.value = true
            setup.value    = true
            role.value     = data.user?.role     ?? 'admin'
            username.value = data.user?.username ?? u
            userId.value   = data.user?.id       ?? null
            onboardingDone.value = false
            tourSeen.value       = false
            return null
        }
        return data.error
    }

    async function logout() {
        await fetch('/api/auth/logout', { method: 'POST' })
        loggedIn.value = false
        role.value     = null
        username.value = null
        userId.value   = null
        onboardingDone.value = true
        tourSeen.value       = true
    }

    async function markTourSeen() {
        tourSeen.value = true
        try { await fetch('/api/auth/tour-seen', { method: 'POST', credentials: 'include' }) } catch {}
    }

    async function completeOnboarding(): Promise<boolean> {
        const res = await fetch('/api/settings/onboarding', {
            method : 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body   : JSON.stringify({ complete: true }),
        })
        if (res.ok) onboardingDone.value = true
        return res.ok
    }

    return {
        loggedIn, setup, loading, role, username, userId, isAdmin,
        onboardingDone, tourSeen,
        checkStatus, login, setupAccount, logout, markTourSeen, completeOnboarding,
    }
})
