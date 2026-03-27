import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useDownloadsStore = defineStore('downloads', () => {
    const activeCount = ref(0)

    async function refresh() {
        try {
            const res = await fetch('/api/downloads', { credentials: 'include' })
            if (!res.ok) return
            const torrents = await res.json()
            activeCount.value = torrents.filter((t: any) => t.state === 'downloading').length
        } catch {
            activeCount.value = 0
        }
    }

    return { activeCount, refresh }
})