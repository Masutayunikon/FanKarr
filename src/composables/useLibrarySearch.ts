import { ref } from 'vue'
import { useRouter } from 'vue-router'

const query   = ref('')
const pending = ref(false)

export function useLibrarySearch() {
    const router = useRouter()

    function open(text = '') {
        query.value   = text
        pending.value = true
        router.push('/series')
    }

    function consume(): string | null {
        if (!pending.value) return null
        pending.value = false
        return query.value
    }

    return { pending, open, consume }
}
