<template>
  <div class="flex flex-col gap-6">

    <div>
      <h2 class="text-base font-semibold text-primary">Avancé</h2>
      <p class="text-sm text-muted mt-1">Options pour le débogage et le développement.</p>
    </div>

    <div class="settings-card flex flex-col gap-5">
      <SettingsToggle
          v-model="devMode"
          label="Mode développeur"
          description="Affiche un panneau de debug sur le dashboard : mémoire, cache, uptime, worker."
      />
    </div>

    <div v-if="saved" class="text-xs text-green-400">Paramètre sauvegardé.</div>

    <div class="settings-card flex flex-col sm:flex-row sm:items-center gap-4">
      <div class="flex-1">
        <p class="text-sm text-primary">Assistant de configuration</p>
        <p class="text-xs text-muted mt-0.5">
          Reprend pas à pas les dossiers, le client torrent, Jellyfin/Plex et le catalogue. La configuration actuelle est conservée.
        </p>
      </div>
      <div class="flex gap-2 shrink-0">
        <button @click="tour.start()" class="btn-ghost">Revoir la visite</button>
        <RouterLink to="/setup" class="btn-secondary">Relancer l'assistant</RouterLink>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import SettingsToggle from '@/components/settings/SettingsToggle.vue'
import { useTourStore } from '@/stores/tour'

const tour    = useTourStore()

const devMode = ref(false)
const saved   = ref(false)
let saveTimer: ReturnType<typeof setTimeout> | null = null
let loaded    = false

onMounted(async () => {
  const res = await fetch('/api/settings', { credentials: 'include' })
  if (res.ok) {
    const s = await res.json()
    devMode.value = s.devMode ?? false
  }
  loaded = true
})

watch(devMode, async (val) => {
  if (!loaded) return
  await fetch('/api/settings', {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body   : JSON.stringify({ devMode: val }),
  })
  saved.value = true
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => { saved.value = false }, 2000)
})
</script>