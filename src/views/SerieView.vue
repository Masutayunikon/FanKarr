<template>
  <div class="min-h-screen bg-zinc-950 text-zinc-100">

    <!-- Back -->
    <div class="max-w-7xl mx-auto px-6 pt-6">
      <router-link to="/" class="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-100 transition">
        <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
        Catalogue
      </router-link>
    </div>

    <!-- Loading -->
    <div v-if="store.loadingDetail" class="flex flex-col items-center justify-center gap-4 min-h-96 text-zinc-600">
      <div class="w-8 h-8 border-2 border-white/10 border-t-orange-500 rounded-full animate-spin" />
      <p class="text-sm">Chargement…</p>
    </div>

    <!-- Error -->
    <div v-else-if="store.error" class="flex flex-col items-center justify-center gap-4 min-h-96 text-orange-400">
      <p class="text-sm">{{ store.error }}</p>
      <button class="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm" @click="load">Réessayer</button>
    </div>

    <template v-else-if="data">
      <!-- Hero -->
      <div class="relative">
        <div v-if="data.serie.fanart_image" class="absolute inset-0 h-72 overflow-hidden pointer-events-none">
          <img :src="data.serie.fanart_image" class="w-full h-full object-cover opacity-20" />
          <div class="absolute inset-0 bg-gradient-to-b from-transparent to-zinc-950" />
        </div>

        <div class="relative max-w-7xl mx-auto px-6 pt-8 pb-10 flex gap-8">
          <!-- Poster -->
          <div class="shrink-0 w-36 rounded-xl overflow-hidden border border-white/10 shadow-2xl hidden sm:block">
            <img v-if="data.serie.poster_image" :src="data.serie.poster_image" class="w-full h-full object-cover" />
            <div v-else class="w-full aspect-[2/3] bg-zinc-900 flex items-center justify-center text-zinc-700">
              <svg width="28" height="28" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <rect x="2" y="2" width="20" height="20" rx="2"/><path d="m9 9 6 6M15 9l-6 6"/>
              </svg>
            </div>
          </div>

          <!-- Info -->
          <div class="flex flex-col gap-3 justify-end min-w-0">
            <h1 class="text-3xl font-bold tracking-tight">{{ data.serie.title }}</h1>
            <div class="flex flex-wrap items-center gap-2">
              <span v-if="data.serie.year" class="text-sm text-zinc-400">{{ data.serie.year }}</span>
              <span
                  v-if="data.serie.status"
                  class="text-xs px-2 py-0.5 rounded-full font-medium border"
                  :class="data.serie.status.toLowerCase() === 'continuing'
                  ? 'bg-green-500/15 text-green-400 border-green-500/20'
                  : 'bg-white/5 text-zinc-500 border-white/10'"
              >{{ data.serie.status }}</span>
            </div>
            <p v-if="data.serie.plot" class="text-sm text-zinc-400 leading-relaxed max-w-2xl line-clamp-3">
              {{ data.serie.plot }}
            </p>

            <!-- Boutons hero : intégrale, pack_saison promu, pack_episodes -->
            <div class="flex flex-wrap gap-2 mt-1">
              <button
                  v-for="(t, i) in data.torrents_integrale"
                  :key="i"
                  class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition"
                  :class="t.label === 'Intégrale'
                  ? 'bg-orange-500 hover:bg-orange-600 text-white'
                  : 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20'"
                  :disabled="downloading === `integrale-${i}`"
                  @click="download(`integrale-${i}`, t.torrent_url, t.magnet)"
              >
                <DownloadIcon :spinning="downloading === `integrale-${i}`" />
                {{ t.label }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Seasons -->
      <div class="max-w-7xl mx-auto px-6 pb-16 flex flex-col gap-6">
        <div
            v-for="season in data.seasons"
            :key="season.id"
            class="bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden"
        >
          <!-- Season header -->
          <div class="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <div class="flex items-center gap-3">
              <button class="text-zinc-500 hover:text-zinc-100 transition" @click="toggleSeason(season.id)">
                <svg
                    width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
                    class="transition-transform duration-200"
                    :class="collapsedSeasons.has(season.id) ? '' : 'rotate-180'"
                >
                  <path d="M18 15l-6-6-6 6"/>
                </svg>
              </button>
              <div>
                <h2 class="font-semibold text-sm">
                  {{ season.season_number === 0 ? 'Spéciaux' : `Saison ${season.season_number}` }}
                  <span v-if="season.title && season.title !== `Saison ${season.season_number}`" class="text-zinc-500 font-normal ml-1">
                    — {{ season.title }}
                  </span>
                </h2>
                <p class="text-xs text-zinc-600 mt-0.5">
                  {{ season.episodes.length }} épisode{{ season.episodes.length > 1 ? 's' : '' }}
                  · {{ seasonAvailableCount(season) }}/{{ season.episodes.length }} dispo
                  <span v-if="season.organized_state !== 'none'"
                        class="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium"
                        :class="season.organized_state === 'complete'
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-yellow-500/10 text-yellow-500'">
                    {{ season.organized_state === 'complete'
                      ? `✓ ${season.organized_count} organisé${season.organized_count > 1 ? 's' : ''}`
                      : `${season.organized_count}/${seasonAvailableCount(season)} organisés` }}
                  </span>
                </p>
              </div>
            </div>

            <!-- Bouton pack_saison sur le header -->
            <button
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition"
                :class="season.torrent
                ? 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border-orange-500/20'
                : 'bg-white/[0.03] text-zinc-600 border-white/8 cursor-not-allowed'"
                :disabled="!season.torrent || downloading === `season-${season.id}`"
                @click="season.torrent && download(`season-${season.id}`, season.torrent.torrent_url, season.torrent.magnet)"
            >
              <DownloadIcon :spinning="downloading === `season-${season.id}`" :size="12" />
              Saison entière
            </button>
          </div>

          <!-- Episodes -->
          <div v-if="!collapsedSeasons.has(season.id)" class="divide-y divide-white/[0.04]">
            <div
                v-for="ep in season.episodes"
                :key="ep.id"
                class="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.02] transition"
            >
              <!-- Thumbnail -->
              <div class="shrink-0 w-24 aspect-video rounded-lg overflow-hidden bg-zinc-800 hidden sm:block">
                <img v-if="ep.thumb_image" :src="ep.thumb_image" class="w-full h-full object-cover" loading="lazy" />
                <div v-else class="w-full h-full flex items-center justify-center text-zinc-700 text-xs font-mono">
                  {{ season.season_number === 0 ? 'SP' : `E${ep.episode_number}` }}
                </div>
              </div>

              <!-- Info -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-xs text-zinc-600 shrink-0 font-mono">
                    {{ season.season_number === 0 ? 'SP' : `E${String(ep.episode_number).padStart(2,'0')}` }}
                  </span>
                  <span class="text-sm font-medium truncate">{{ ep.title || `Épisode ${ep.episode_number}` }}</span>
                </div>
                <div class="flex items-center gap-3 mt-0.5">
                  <span v-if="ep.aired" class="text-xs text-zinc-600">{{ formatDate(ep.aired) }}</span>
                  <span v-if="ep.duration" class="text-xs text-zinc-600">{{ ep.duration }} min</span>
                </div>
              </div>

              <!-- Bouton épisode (type episode uniquement) -->
              <div class="shrink-0 flex items-center gap-2">
                <!-- Badge organisé -->
                <span v-if="ep.organized"
                      class="text-[10px] px-2 py-0.5 rounded-full border bg-green-500/10 text-green-400 border-green-500/20">
                  ✓ organisé
                </span>

                <!-- Badge dispo/indispo basé sur available (episode résolu dans un torrent) -->
                <span
                    class="inline-block text-[10px] px-2 py-0.5 rounded-full border"
                    :class="ep.available
                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                    : 'bg-white/5 text-zinc-600 border-white/8'"
                >
                  {{ ep.available ? 'dispo' : 'indispo' }}
                </span>

                <!-- Bouton download — visible seulement si type=episode, sinon grisé -->
                <button
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition"
                    :class="ep.torrent
                    ? 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border-orange-500/20'
                    : 'bg-white/[0.03] text-zinc-600 border-white/8 cursor-not-allowed'"
                    :disabled="!ep.torrent || downloading === `ep-${ep.id}`"
                    @click="ep.torrent && download(`ep-${ep.id}`, ep.torrent.torrent_url, ep.torrent.magnet)"
                >
                  <DownloadIcon :spinning="downloading === `ep-${ep.id}`" :size="12" />
                  Ep.
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Toast -->
    <Transition name="toast">
      <div
          v-if="toast"
          class="fixed bottom-6 right-6 flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium z-50"
          :class="toast.type === 'success'
          ? 'bg-zinc-800 border border-green-500/30 text-green-400'
          : 'bg-zinc-800 border border-red-500/30 text-red-400'"
      >
        <svg v-if="toast.type === 'success'" width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path d="M20 6 9 17l-5-5"/>
        </svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
        </svg>
        {{ toast.message }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, defineComponent, h } from 'vue'
import { useRoute } from 'vue-router'
import { useSeriesStore } from '@/stores/series'
import type { Season } from '@/stores/series'

// ── Composant icône download ──────────────────────────────────
const DownloadIcon = defineComponent({
  props: { spinning: Boolean, size: { type: Number, default: 14 } },
  setup(props) {
    return () => props.spinning
        ? h('div', { class: `w-${props.size === 12 ? '3' : '3.5'} h-${props.size === 12 ? '3' : '3.5'} border border-current/30 border-t-current rounded-full animate-spin` })
        : h('svg', { width: props.size, height: props.size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2' }, [
          h('path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3' })
        ])
  }
})

// ── Setup ─────────────────────────────────────────────────────
const route = useRoute()
const store = useSeriesStore()

const collapsedSeasons = ref<Set<number>>(new Set())
const downloading = ref<string | null>(null)
const toast = ref<{ type: 'success' | 'error'; message: string } | null>(null)

const data = computed(() => store.currentSerie)

function seasonAvailableCount(season: Season) {
  return season.episodes.filter(e => e.available).length
}

function toggleSeason(id: number) {
  if (collapsedSeasons.value.has(id)) collapsedSeasons.value.delete(id)
  else collapsedSeasons.value.add(id)
}

function formatDate(d: string) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' })
}

function showToast(type: 'success' | 'error', message: string) {
  toast.value = { type, message }
  setTimeout(() => { toast.value = null }, 3500)
}

async function download(key: string, torrent_url: string | null, magnet: string | null) {
  downloading.value = key
  const result = await store.download(torrent_url, magnet)
  downloading.value = null
  if (result.success) showToast('success', 'Téléchargement lancé')
  else showToast('error', result.error ?? 'Erreur inconnue')
}

function load() {
  store.fetchSerieDetail(Number(route.params.id))
}

onMounted(load)
</script>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: all 0.25s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(6px); }
</style>