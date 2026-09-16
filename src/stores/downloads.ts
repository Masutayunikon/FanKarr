import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useDownloadsStore = defineStore('downloads', () => {
    const activeCount = ref(0)
    const torrents    = ref<any[]>([])

    async function refresh() {
        try {
            const res = await fetch('/api/downloads', { credentials: 'include' })
            if (!res.ok) return
            torrents.value    = await res.json()
            activeCount.value = torrents.value.filter((t: any) => t.state === 'downloading').length
        } catch {
            activeCount.value = 0
        }
    }

    return { activeCount, torrents, refresh }
})
