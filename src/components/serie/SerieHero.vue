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

        <h1 class="text-2xl font-bold text-primary tracking-tight">{{ serie.title }}</h1>

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
import { RouterLink } from 'vue-router'
import { ArrowLeft, Tv } from 'lucide-vue-next'

defineProps<{ serie: any }>()
</script>
