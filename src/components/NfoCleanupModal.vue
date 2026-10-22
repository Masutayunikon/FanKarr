<template>
  <Teleport to="body">
    <div v-if="folders.length" class="modal-backdrop" @click.self="later">
      <div class="modal max-w-md" role="dialog" aria-modal="true" aria-labelledby="nfo-cleanup-title">
        <div class="flex flex-col gap-1.5">
          <h2 id="nfo-cleanup-title" class="card-title">NFO dans des dossiers « Saison »</h2>
          <p class="text-body text-secondary">
            Les dossiers de saison en anglais sont activés, mais {{ plural(totalFiles, 'fichier NFO ou image', 'fichiers NFO ou images') }}
            {{ totalFiles > 1 ? 'sont restés' : 'est resté' }} dans des dossiers « Saison N ».
            Le nettoyage les déplace vers « Season NN » et supprime les doublons. Les vidéos ne sont pas touchées.
          </p>
        </div>

        <ul class="flex flex-col gap-1 max-h-56 overflow-y-auto text-meta">
          <li v-for="f in folders" :key="`${f.serie}/${f.folder}`" class="flex items-center justify-between gap-3">
            <span class="truncate text-primary">{{ f.serie }}</span>
            <span class="shrink-0 text-muted">{{ f.folder }} → {{ f.target }} · {{ f.files }}</span>
          </li>
        </ul>

        <div class="flex gap-2.5 justify-end">
          <button @click="later" class="btn-ghost" :disabled="busy">Plus tard</button>
          <button @click="cleanup" class="btn-primary" :disabled="busy">{{ busy ? 'Nettoyage…' : 'Nettoyer' }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from '@/composables/useToast'
import { plural } from '@/utils/format'

interface MisplacedFolder { serie: string; folder: string; target: string; files: number }

// « Plus tard » : la popup ne revient que si la liste change
const DISMISS_KEY = 'fankarr.nfoCleanupDismissed'

const { add: toast } = useToast()
const folders    = ref<MisplacedFolder[]>([])
const busy       = ref(false)
const totalFiles = computed(() => folders.value.reduce((n, f) => n + f.files, 0))

function signature(list: MisplacedFolder[]) {
  return list.map(f => `${f.serie}/${f.folder}:${f.files}`).sort().join('|')
}

onMounted(async () => {
  try {
    const res = await fetch('/api/nfo-updates/misplaced', { credentials: 'include' })
    if (!res.ok) return
    const list: MisplacedFolder[] = await res.json()
    let dismissed: string | null = null
    try { dismissed = localStorage.getItem(DISMISS_KEY) } catch {}
    if (list.length && dismissed !== signature(list)) folders.value = list
  } catch {}
})

function later() {
  if (busy.value) return
  try { localStorage.setItem(DISMISS_KEY, signature(folders.value)) } catch {}
  folders.value = []
}

async function cleanup() {
  busy.value = true
  try {
    const res  = await fetch('/api/nfo-updates/misplaced/cleanup', { method: 'POST', credentials: 'include' })
    const data = await res.json()
    if (!res.ok) { toast(data.error ?? 'Impossible de nettoyer les NFO', 'error'); return }
    const moved = data.moved + data.removed
    toast(data.errors
      ? `${plural(moved, 'fichier rangé', 'fichiers rangés')}, ${plural(data.errors, 'échec')}`
      : `${plural(moved, 'fichier rangé', 'fichiers rangés')} dans les dossiers « Season »`, data.errors ? 'error' : 'success')
    folders.value = []
  } catch {
    toast('Impossible de contacter le serveur', 'error')
  } finally {
    busy.value = false
  }
}
</script>
