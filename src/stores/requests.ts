import { defineStore } from 'pinia'
import { ref } from 'vue'

// Demandes en attente : toutes pour un admin, les siennes pour un utilisateur
export const useRequestsStore = defineStore('requests', () => {
    const pendingCount = ref(0)

    async function refreshPending() {
        try {
            const res = await fetch('/api/requests/pending-count', { credentials: 'include' })
            if (res.ok) pendingCount.value = (await res.json()).count ?? 0
        } catch {}
    }

    return { pendingCount, refreshPending }
})
