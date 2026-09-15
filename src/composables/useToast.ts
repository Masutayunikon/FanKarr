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
const MAX_VISIBLE = 4

function add(message: string, type: Toast['type'] = 'info') {
    const existing = toasts.value.find(t => t.type === type && t.message === message)

    if (existing) {
        clearTimeout(existing.timer)
        existing.count++
        existing.timer = setTimeout(() => remove(existing.id), DURATION)
        return
    }

    const id = nextId++
    const timer = setTimeout(() => remove(id), DURATION)

    toasts.value.push({ id, message, type, count: 1, timer })
    if (toasts.value.length > MAX_VISIBLE) remove(toasts.value[0]!.id)
}

function remove(id: number) {
    const i = toasts.value.findIndex(t => t.id === id)
    if (i !== -1) {
        clearTimeout(toasts.value[i]?.timer)
        toasts.value.splice(i, 1)
    }
}

export function useToast() {
    return { toasts, add, remove }
}