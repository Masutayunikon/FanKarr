<template>
  <section class="relative overflow-hidden">
    <img
        v-if="serie.poster_image"
        :src="serie.poster_image"
        alt=""
        class="absolute inset-0 w-full h-full object-cover blur-[40px] saturate-[1.25] scale-[1.4] opacity-50 pointer-events-none"
    />
    <div class="absolute inset-0 bg-linear-100 from-main/97 via-main/86 via-52% to-main/40" />
    <div class="dot-grid [--dot-grid-angle:100deg] [--dot-grid-fade:60%]" />

    <div class="relative grid grid-cols-[96px_minmax(0,1fr)] gap-x-4 gap-y-4 sm:flex sm:items-start sm:gap-7 px-4 md:px-10 pt-4 pb-5 sm:py-6">
      <div class="shrink-0 w-[96px] sm:w-[152px] sm:mt-[22px]">
        <img
            v-if="serie.poster_image"
            :src="serie.poster_image"
            :alt="serie.title"
            class="w-[96px] h-[144px] sm:w-[152px] sm:h-[228px] object-cover rounded-lg shadow-[0_22px_44px_rgb(0_0_0/0.5),0_0_0_1px_rgb(239_233_221/0.08)]"
        />
        <div v-else class="w-[96px] h-[144px] sm:w-[152px] sm:h-[228px] rounded-lg bg-card flex items-center justify-center text-muted">
          <Tv :size="28" />
        </div>
      </div>

      <div class="contents sm:flex sm:flex-1 sm:min-w-0 sm:flex-col sm:gap-2.5">
        <div class="min-w-0 flex flex-col gap-2.5">
          <RouterLink to="/series" class="inline-flex items-center gap-[7px] min-h-7 text-meta text-secondary hover:text-primary transition-colors w-fit">
            <ChevronLeft :size="14" :stroke-width="2" />
            Médiathèque
          </RouterLink>

          <h1 class="font-display text-[26px] sm:text-[42px] leading-[1.1] font-extrabold text-primary">{{ serie.title }}</h1>

          <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span v-if="serie.year" class="text-body text-secondary">{{ serie.year }}</span>
            <span
                v-if="serie.status"
                class="pill h-[22px] px-2.5"
                :class="serie.status.toLowerCase() === 'continuing' ? 'pill-ok' : 'pill-neutral'"
            >{{ statusLabel(serie.status) }}</span>
            <span v-if="episodeCount" class="text-body text-secondary">
              <template v-if="seasonCount">{{ seasonCount }} saison{{ seasonCount > 1 ? 's' : '' }} · </template>{{ episodeCount }} épisode{{ episodeCount > 1 ? 's' : '' }}
            </span>
            <span v-if="watched" class="pill pill-wait h-[22px] px-2.5">
              <Rss :size="11" :stroke-width="2.5" /> Surveillée
            </span>
            <a
                v-if="serie.wiki"
                :href="serie.wiki"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1.5 text-meta text-secondary hover:text-accent transition-colors"
            >
              <ExternalLink :size="12" /> Wiki
            </a>
          </div>
        </div>

        <div class="col-span-2 min-w-0 flex flex-col gap-2.5 empty:hidden">
          <p
              v-if="serie.plot"
              @click="expanded = !expanded"
              class="text-body leading-[1.6] text-secondary max-w-[640px] text-pretty cursor-pointer select-none"
              :class="expanded ? '' : 'line-clamp-3'"
              :title="expanded ? 'Réduire' : 'Lire la suite'"
          >
            {{ serie.plot }}
          </p>

          <div v-if="episodeCount" class="flex items-center gap-3.5 mt-0.5 flex-wrap">
            <div class="w-[260px] max-w-full h-1 rounded-[2px] bg-hover overflow-hidden">
              <div
                  class="h-full rounded-[2px] transition-[width] duration-500"
                  :class="organizedCount >= episodeCount ? 'bg-ok' : 'bg-accent'"
                  :style="{ width: `${Math.round(organizedCount / episodeCount * 100)}%` }"
              />
            </div>
            <span class="text-meta text-secondary">{{ organizedCount }} épisode{{ organizedCount > 1 ? 's' : '' }} {{ organizedLabel }}{{ organizedCount > 1 ? 's' : '' }} sur {{ episodeCount }}</span>
          </div>

          <div v-if="$slots.actions" class="flex items-center gap-2.5 mt-1.5 max-sm:flex-nowrap flex-wrap">
            <slot name="actions" />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ChevronLeft, ExternalLink, Rss, Tv } from 'lucide-vue-next'
import { statusLabel } from '@/utils/series'

defineProps<{
  serie         : any
  seasonCount   : number
  episodeCount  : number
  organizedCount: number
  organizedLabel: string
  watched?      : boolean
}>()

const expanded = ref(false)
</script>
