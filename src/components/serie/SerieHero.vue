<template>
  <div class="relative">
    <div v-if="serie.fanart_image" class="absolute inset-0 h-64 overflow-hidden pointer-events-none">
      <img
          :src="serie.fanart_image"
          class="w-full h-full object-cover opacity-15"
          @error="(e) => ((e.target as HTMLElement).closest('div') as HTMLElement).style.display = 'none'"
      />
      <div class="absolute inset-0 bg-gradient-to-b from-transparent to-main" />
    </div>

    <div class="relative px-4 md:px-8 pt-6 pb-10 flex gap-6 min-h-[200px]">
      <!-- Poster -->
      <div class="shrink-0 w-32 rounded-xl overflow-hidden border border-border shadow-xl hidden sm:block">
        <img v-if="serie.poster_image" :src="serie.poster_image" class="w-full h-full object-cover" />
        <div v-else class="w-full aspect-[2/3] bg-card flex items-center justify-center text-muted">
          <Tv :size="28" />
        </div>
      </div>

      <!-- Infos -->
      <div class="flex flex-col gap-3 justify-end min-w-0">
        <RouterLink to="/series" class="inline-flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors w-fit">
          <ArrowLeft :size="13" />
          Séries
        </RouterLink>

        <!-- Titre + boutons actions -->
        <div class="flex items-center gap-3 flex-wrap">
          <h1 class="text-2xl font-bold text-primary tracking-tight">{{ serie.title }}</h1>

          <button
              @click="emit('openManualImport')"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border text-muted hover:text-primary hover:border-secondary transition shrink-0"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Import manuel
          </button>

          <div v-if="Object.keys(organizedByEpisode).length > 0" class="relative" @click.stop>
            <button
                @click="unimportMenuOpen = !unimportMenuOpen"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border text-muted hover:text-red-400 hover:border-red-500/40 transition shrink-0"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
              </svg>
              Désimporter
            </button>
            <div v-if="unimportMenuOpen" class="absolute top-full left-0 mt-1 bg-card border border-border rounded-xl p-1 z-20 w-48 shadow-xl flex flex-col gap-0.5">
              <button @click="emit('unimport', false); unimportMenuOpen = false" class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted hover:bg-hover transition-colors">
                Retirer de la bibliothèque
              </button>
              <button @click="emit('unimport', true); unimportMenuOpen = false" class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors">
                Supprimer les fichiers
              </button>
            </div>
          </div>
        </div>

        <!-- Métadonnées -->
        <div class="flex flex-wrap items-center gap-2">
          <span v-if="serie.year" class="text-sm text-muted">{{ serie.year }}</span>
          <span
              v-if="serie.status"
              class="text-xs px-2 py-0.5 rounded-full border"
              :class="serie.status.toLowerCase() === 'continuing'
              ? 'bg-green-500/15 text-green-400 border-green-500/20'
              : 'bg-hover text-muted border-border'"
          >{{ serie.status }}</span>
        </div>

        <p v-if="serie.plot" class="text-sm text-secondary leading-relaxed max-w-2xl line-clamp-3">
          {{ serie.plot }}
        </p>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowLeft, Tv } from 'lucide-vue-next'

const props = defineProps<{
  serie              : any
  organizedByEpisode : Record<string, any>
}>()

const emit = defineEmits<{
  openManualImport: []
  unimport        : [deleteFile: boolean]
}>()

const unimportMenuOpen = ref(false)

defineExpose({ closeUnimportMenu: () => { unimportMenuOpen.value = false } })
</script>
