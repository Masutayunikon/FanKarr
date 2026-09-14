<template>
  <div class="flex flex-col gap-4">

    <div v-if="!loaded" class="flex items-center justify-center py-10">
      <div class="w-4 h-4 border border-border border-t-accent rounded-full animate-spin" />
    </div>

    <template v-else>
      <section class="settings-card flex items-center gap-4">
        <span
            class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            :class="status.empty ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-400'"
        >
          <Library :size="17" />
        </span>
        <div class="flex-1 min-w-0">
          <p class="text-sm text-primary font-medium">
            {{ status.empty ? 'Catalogue non téléchargé' : `${status.count} séries disponibles` }}
          </p>
          <p class="text-xs text-muted mt-0.5">
            {{ status.empty
              ? 'Sans catalogue, la médiathèque reste vide.'
              : 'Le catalogue se met à jour automatiquement.' }}
          </p>
        </div>
        <button @click="update" :disabled="updating" :class="status.empty ? 'btn-primary' : 'btn-secondary'" class="shrink-0">
          {{ updating ? 'Téléchargement…' : status.empty ? 'Télécharger' : 'Mettre à jour' }}
        </button>
      </section>

      <section class="settings-card flex items-center gap-4">
        <span class="w-9 h-9 rounded-lg bg-accent-muted text-accent flex items-center justify-center shrink-0">
          <ScanSearch :size="17" />
        </span>
        <div class="flex-1 min-w-0">
          <p class="text-sm text-primary font-medium">Vous avez déjà des séries Fankai ?</p>
          <p class="text-xs text-muted mt-0.5">
            <template v-if="scanResult">{{ scanResult.found }} fichiers analysés · {{ scanResult.added }} référencés.</template>
            <template v-else>Analysez la médiathèque pour référencer les fichiers présents, sans les déplacer.</template>
          </p>
        </div>
        <button @click="scan" :disabled="scanning || status.empty || !settings.mediaPath" class="btn-secondary shrink-0">
          {{ scanning ? 'Analyse…' : 'Analyser' }}
        </button>
      </section>

      <p v-if="warnEmpty" class="text-sm text-yellow-500" role="alert">
        Le catalogue est encore vide. Téléchargez-le, ou cliquez à nouveau sur « Suivant » pour continuer.
      </p>
    </template>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Library, ScanSearch } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
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
      toast(`${data.count} séries chargées ✓`, 'success')
    } else {
      toast(data.error ?? 'Erreur lors de la mise à jour', 'error')
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
      toast("Erreur lors de l'analyse", 'error')
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
