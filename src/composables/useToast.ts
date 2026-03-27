import { ref } from 'vue'

interface Toast {
    id       : number
    message  : string
    type     : 'success' | 'error' | 'info'
    count    : number
    timer    : ReturnType<typeof setTimeout>
}

const toasts = ref<Toast[]>([])
let nextId = 0
const DURATION = 3500
const GROUP_WINDOW = 800 // ms — toasts du même type dans cette fenêtre sont groupés

function add(message: string, type: Toast['type'] = 'info') {
    const now = Date.now()

    // Cherche un toast récent du même type à grouper
    const existing = toasts.value.find(t => t.type === type)

    if (existing) {
        // Grouper — incrémenter le count et mettre à jour le message
        clearTimeout(existing.timer)
        existing.count++
        existing.message = buildGroupMessage(type, existing.count)
        existing.timer = setTimeout(() => remove(existing.id), DURATION)
        return
    }

    // Nouveau toast
    const id = nextId++
    const timer = setTimeout(() => remove(id), DURATION)

    toasts.value.push({ id, message, type, count: 1, timer })
}

function buildGroupMessage(type: Toast['type'], count: number): string {
    if (type === 'success') return `${count} opérations réussies`
    if (type === 'error')   return `${count} erreurs`
    return                         `${count} notifications`
}

function remove(id: number) {
    const i = toasts.value.findIndex(t => t.id === id)
    if (i !== -1) {
        clearTimeout(toasts.value[i].timer)
        toasts.value.splice(i, 1)
    }
}

export function useToast() {
    return { toasts, add, remove }
}