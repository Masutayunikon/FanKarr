import { ref } from 'vue'

const STORAGE_KEY = 'fankarr-theme'

export const themes = [
    { id: 'or',        label: 'Or',        color: '#f2c44a' },
    { id: 'vermillon', label: 'Vermillon', color: '#e8734f' },
    { id: 'jade',      label: 'Jade',      color: '#6fc79a' },
] as const

export type ThemeId = typeof themes[number]['id']

const LEGACY: Record<string, ThemeId> = { indigo: 'or', crimson: 'vermillon', teal: 'jade' }

const current = ref<ThemeId>('or')

function setTheme(id: ThemeId) {
    current.value = id
    document.documentElement.setAttribute('data-theme', id)
    localStorage.setItem(STORAGE_KEY, id)
}

export function initTheme() {
    const saved = localStorage.getItem(STORAGE_KEY) ?? 'or'
    setTheme(themes.some(t => t.id === saved) ? saved as ThemeId : LEGACY[saved] ?? 'or')
}

export function useTheme() {
    return { themes, current, setTheme }
}
