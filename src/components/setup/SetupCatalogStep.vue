<template>
  <div class="flex flex-col gap-4">

    <div v-if="!loaded" class="flex items-center justify-center py-10">
      <div class="w-4 h-4 border border-border border-t-accent rounded-full animate-spin" />
    </div>

    <template v-else>
      <section class="card flex items-center gap-4">
        <span
            class="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            :class="status.empty ? 'bg-accent-muted text-accent' : 'bg-ok/10 text-ok'"
        >
          <Library :size="17" />
        </span>
        <div class="flex-1 min-w-0">
          <p class="text-sm text-primary font-medium">
            {{ status.empty ? 'Catalogue non synchronisé' : plural(status.count, 'série disponible', 'séries disponibles') }}
          </p>
          <p class="text-meta text-muted mt-0.5">
            {{ status.empty
              ? 'Sans catalogue, la médiathèque reste vide.'
              : 'Le catalogue se met à jour automatiquement.' }}
          </p>
        </div>
        <button @click="update" :disabled="updating" :class="status.empty ? 'btn-primary' : 'btn-secondary'" class="shrink-0">
          {{ updating ? 'Synchronisation…' : status.empty ? 'Synchroniser le catalogue' : 'Synchroniser' }}
        </button>
      </section>

      <section class="card flex items-center gap-4">
        <span class="w-9 h-9 rounded-full bg-accent-muted text-accent flex items-center justify-center shrink-0">
          <ScanSearch :size="17" />
        </span>
        <div class="flex-1 min-w-0">
          <p class="text-sm text-primary font-medium">Vous avez déjà des séries Fankai ?</p>
          <p class="text-meta text-muted mt-0.5">
            <template v-if="scanResult">{{ plural(scanResult.found, 'fichier trouvé', 'fichiers trouvés') }}, {{ plural(scanResult.added, 'ajouté', 'ajoutés') }} à la médiathèque.</template>
            <template v-else>Analysez la médiathèque pour reconnaître les épisodes déjà présents. Aucun fichier n'est déplacé.</template>
          </p>
        </div>
        <button @click="scan" :disabled="scanning || status.empty || !settings.mediaPath" class="btn-secondary shrink-0">
          {{ scanning ? 'Analyse…' : 'Analyser' }}
        </button>
      </section>

      <p v-if="warnEmpty" class="text-body text-accent" role="alert">
        Le catalogue est encore vide. Synchronisez-le, ou cliquez à nouveau sur « Suivant » pour continuer.
      </p>
    </template>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Library, ScanSearch } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
import { plural } from '@/utils/format'
import type { SetupSettings } from './setup'

defineProps<{ settings: SetupSettings; isDocker: boolean; defaultPath: string }>()

const { add: toast } = useToast()

const loaded     = ref(false)
const status     = ref({ exists: false, count: 0, empty: true })
const updating   = ref(false)
const scanning   = ref(false)
const scanResult = ref<{ found: number; added: number } | null>(null)
const warnEmpty  = ref(false)

async function update() {
  updating.value = true
  try {
    const res = await fetch('/api/update', { method: 'POST', credentials: 'include' })
    const data = await res.json()
    if (res.ok) {
      status.value    = { exists: true, count: data.count, empty: data.count === 0 }
      warnEmpty.value = false
      toast(`Catalogue synchronisé : ${plural(data.count, 'série')}`, 'success')
    } else {
      toast(data.error ?? 'Impossible de synchroniser le catalogue', 'error')
    }
  } catch {
    toast('Impossible de contacter le serveur', 'error')
  } finally {
    updating.value = false
  }
}

async function scan() {
  scanning.value = true
  try {
    const res = await fetch('/api/scan', { method: 'POST', credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      scanResult.value = { found: data.found, added: data.added }
    } else {
      toast("Impossible d'analyser la médiathèque", 'error')
    }
  } catch {
    toast('Impossible de contacter le serveur', 'error')
  } finally {
    scanning.value = false
  }
}

async function submit(): Promise<boolean> {
  if (!status.value.empty || warnEmpty.value) return true
  warnEmpty.value = true
  return false
}

onMounted(async () => {
  try {
    const res = await fetch('/api/torrents/status', { credentials: 'include' })
    if (res.ok) status.value = await res.json()
  } catch {}
  loaded.value = true
})

defineExpose({ submit })
</script>
