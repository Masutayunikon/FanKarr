import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
    const loggedIn  = ref(false)
    const setup     = ref(false)
    const loading   = ref(true)
    const role      = ref<'admin' | 'user' | null>(null)
    const username  = ref<string | null>(null)
    const userId    = ref<string | null>(null)

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
            loggedIn.value = true
            role.value     = data.user?.role     ?? null
            username.value = data.user?.username ?? null
            userId.value   = data.user?.id       ?? null
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
    }

    return { loggedIn, setup, loading, role, username, userId, isAdmin, checkStatus, login, setupAccount, logout }
})
