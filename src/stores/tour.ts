import { defineStore } from 'pinia'
import { ref, shallowRef, computed } from 'vue'
import { buildTourSteps, type TourStep } from '@/tour/steps'
import { useAuthStore } from '@/stores/auth'

export const useTourStore = defineStore('tour', () => {
    const active = ref(false)
    const index  = ref(0)
    const steps  = shallowRef<TourStep[]>([])

    const current = computed(() => active.value ? steps.value[index.value] ?? null : null)
    const isLast  = computed(() => index.value >= steps.value.length - 1)

    function start() {
        steps.value  = buildTourSteps(useAuthStore().isAdmin)
        index.value  = 0
        active.value = true
    }

    function next() {
        if (isLast.value) finish()
        else index.value++
    }

    function prev() {
        if (index.value > 0) index.value--
    }

    function finish() {
        active.value = false
        const auth = useAuthStore()
        if (!auth.tourSeen) auth.markTourSeen()
    }

    return { active, index, steps, current, isLast, start, next, prev, finish }
})
