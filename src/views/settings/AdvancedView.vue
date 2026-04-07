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

  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import SettingsToggle from '@/components/settings/SettingsToggle.vue'

const devMode = ref(false)
const saved   = ref(false)
let saveTimer: ReturnType<typeof setTimeout> | null = null

onMounted(async () => {
  const res = await fetch('/api/settings', { credentials: 'include' })
  if (res.ok) {
    const s = await res.json()
    devMode.value = s.devMode ?? false
  }
})

watch(devMode, async (val) => {
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