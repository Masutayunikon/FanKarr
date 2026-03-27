<template>
  <div>
    <div class="px-8 py-8 max-w-4xl">
      <h1 class="text-lg font-semibold text-primary mb-6">{{ pageTitle }}</h1>
      <RouterView />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const titles: Record<string, string> = {
  'settings-download'  : 'Clients de téléchargement',
  'settings-media'     : 'Gestion des médias',
  'settings-catalogue' : 'Catalogue Fankai',
  'settings-logs'      : 'Journaux',
}

const pageTitle = computed(() => titles[route.name as string] ?? 'Paramètres')
</script>