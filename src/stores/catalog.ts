import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
    fetchProductions,
    fetchProduction,
    type Production,
    type ProductionDetail
} from '@/api/fankai'

export const useCatalogStore = defineStore('catalog', () => {
    const productions = ref<Production[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)

    async function loadProductions() {
        if (productions.value.length > 0) return
        loading.value = true
        error.value = null
        try {
            productions.value = await fetchProductions()
        } catch {
            error.value = 'Impossible de charger le catalogue.'
        } finally {
            loading.value = false
        }
    }

    async function loadProduction(id: number, name: string): Promise<ProductionDetail> {
        return await fetchProduction(id, name)
    }

    return { productions, loading, error, loadProductions, loadProduction }
})