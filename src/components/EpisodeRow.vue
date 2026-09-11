<template>
  <div class="bg-[#0d1219] flex gap-4 p-3 hover:bg-[#121920] transition-colors">
    <div class="w-24 flex-shrink-0">
      <img
          v-if="ep.cover"
          :src="imageUrl(ep.cover) ?? undefined"
          :alt="ep.name"
          class="w-full aspect-video object-cover"
      />
      <div v-else class="w-full aspect-video bg-[#121920]"></div>
    </div>

    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 mb-1">
        <span class="text-[10px] text-[#e8513a]">FILM {{ ep.number }}</span>
        <span class="text-sm font-bold text-white truncate">{{ ep.name }}</span>
      </div>
      <div class="text-[10px] text-[#5a7a94] mb-1">
        Épisodes {{ ep.episodes }} · {{ ep.duration }}
      </div>
      <p class="text-xs text-[#5a7a94] leading-relaxed line-clamp-2">{{ ep.description }}</p>
    </div>

    <div class="flex-shrink-0 flex items-center">
      <a
        v-if="ep.path_fr"
        :href="`https://fankai.fr/productions/${productionId}?episode=${ep.number}`"
        target="_blank"
        title="Streamable sur fankai.fr"
        class="text-[10px] text-[#3ae87a] border border-[#3ae87a] px-2 py-1 tracking-widest hover:bg-[#3ae87a]/10 transition-colors"
        @click.stop
      >
        ▶ STREAM
      </a>
      <div
          v-else
          class="text-[10px] text-[#1e2d3d] border border-[#1e2d3d] px-2 py-1 tracking-widest"
      >
        BIENTÔT
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { imageUrl, type Episode } from '@/api/fankai'

defineProps<{
  ep: Episode
  productionId: number
}>()
</script>