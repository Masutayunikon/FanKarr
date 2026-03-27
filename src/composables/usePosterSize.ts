import { ref, watch } from 'vue'

const STORAGE_KEY = 'fankarr-poster-size'

const sizes = {
    S  : '120px',
    M  : '150px',
    L  : '180px',
    XL : '220px',
} as const

export type PosterSize = keyof typeof sizes

const current = ref<PosterSize>(
    (localStorage.getItem(STORAGE_KEY) as PosterSize) ?? 'M'
)

watch(current, (val) => localStorage.setItem(STORAGE_KEY, val))

export function usePosterSize() {
    return {
        current,
        sizes,
        minmax: () => `minmax(${sizes[current.value]}, 1fr)`,
    }
}