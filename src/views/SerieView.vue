<template>
  <div>

    <!-- Loading -->
    <div v-if="store.loadingDetail" class="flex flex-col items-center justify-center gap-3 h-64 text-muted">
      <div class="w-6 h-6 border border-border border-t-accent rounded-full animate-spin" />
      <p class="text-sm">Chargement…</p>
    </div>

    <!-- Error -->
    <div v-else-if="store.error" class="flex flex-col items-center justify-center gap-3 h-64">
      <p class="text-sm text-red-400">{{ store.error }}</p>
      <button class="btn-primary" @click="load">Réessayer</button>
    </div>

    <template v-else-if="data">

      <!-- Hero avec fanart -->
      <div class="relative">
        <div v-if="data.serie.fanart_image" class="absolute inset-0 h-64 overflow-hidden pointer-events-none">
          <img
              :src="data.serie.fanart_image"
              class="w-full h-full object-cover opacity-15"
              @error="(e) => ((e.target as HTMLElement).closest('div') as HTMLElement).style.display = 'none'"
          />
          <div class="absolute inset-0 bg-gradient-to-b from-transparent to-main" />
        </div>

        <div class="relative px-4 md:px-8 pt-6 pb-10 flex gap-6 min-h-[200px]">
          <!-- Poster -->
          <div class="shrink-0 w-32 rounded-xl overflow-hidden border border-border shadow-xl hidden sm:block">
            <img v-if="data.serie.poster_image" :src="data.serie.poster_image" class="w-full h-full object-cover" />
            <div v-else class="w-full aspect-[2/3] bg-card flex items-center justify-center text-muted">
              <Tv :size="28" />
            </div>
          </div>

          <!-- Infos -->
          <div class="flex flex-col gap-3 justify-end min-w-0">
            <!-- Retour -->
            <RouterLink to="/series" class="inline-flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors w-fit">
              <ArrowLeft :size="13" />
              Séries
            </RouterLink>

            <h1 class="text-2xl font-bold text-primary tracking-tight">{{ data.serie.title }}</h1>

            <div class="flex flex-wrap items-center gap-2">
              <span v-if="data.serie.year" class="text-sm text-muted">{{ data.serie.year }}</span>
              <span
                  v-if="data.serie.status"
                  class="text-xs px-2 py-0.5 rounded-full border"
                  :class="data.serie.status.toLowerCase() === 'continuing'
                  ? 'bg-green-500/15 text-green-400 border-green-500/20'
                  : 'bg-hover text-muted border-border'"
              >
                {{ data.serie.status }}
              </span>
            </div>

            <p v-if="data.serie.plot" class="text-sm text-secondary leading-relaxed max-w-2xl line-clamp-3">
              {{ data.serie.plot }}
            </p>

            <!-- Boutons intégrale -->
            <div class="flex flex-wrap gap-2 mt-1">
              <button
                  v-for="(t, i) in data.torrents_integrale"
                  :key="i"
                  :title="t.raw"
                  class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition"
                  :class="[
                  t.label === 'Intégrale'
                    ? 'bg-accent text-white hover:bg-accent-hover'
                    : 'bg-accent-muted text-accent border border-accent/20 hover:bg-accent/20',
                  (isDownloading(`integrale-${i}`) || isDownloaded(`integrale-${i}`) || isAlreadyQueued(t))
                    ? 'opacity-50 cursor-not-allowed' : ''
                ]"
                  :disabled="isDownloading(`integrale-${i}`) || isDownloaded(`integrale-${i}`) || isAlreadyQueued(t)"
                  @click="download(`integrale-${i}`, t.torrent_url, t.magnet)"
              >
                <EpStateIcon :state="epBtnState(`integrale-${i}`, t)" />
                {{ isAlreadyQueued(t) ? 'Déjà ajouté' : isDownloaded(`integrale-${i}`) ? 'Envoyé ✓' : t.label }}
              </button>
            </div>

            <!-- Progression intégrale -->
            <template v-for="(t, i) in data.torrents_integrale" :key="`prog-${i}`">
              <ProgressBar :progress="torrentProgress(extractHash(t))?.progress" />
            </template>
          </div>
        </div>
      </div>

      <!-- Saisons -->
      <div class="px-4 md:px-8 pb-16 flex flex-col gap-4">
        <div
            v-for="season in data.seasons"
            :key="season.id"
            class="bg-card border border-border rounded-xl overflow-hidden"
        >
          <!-- Header saison -->
          <div class="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <div class="flex items-center gap-3">
              <button class="text-muted hover:text-primary transition-colors" @click="toggleSeason(season.id)">
                <ChevronUp
                    :size="15"
                    class="transition-transform duration-200"
                    :class="collapsedSeasons.has(season.id) ? 'rotate-180' : ''"
                />
              </button>
              <div>
                <h2 class="text-sm font-semibold text-primary">
                  {{ season.season_number === 0 ? 'Spéciaux' : `Saison ${season.season_number}` }}
                  <span
                      v-if="season.title && season.title !== `Saison ${season.season_number}`"
                      class="text-muted font-normal ml-1"
                  >
                    — {{ season.title }}
                  </span>
                </h2>
                <p class="text-xs text-muted mt-0.5">
                  {{ season.episodes.length }} épisode{{ season.episodes.length > 1 ? 's' : '' }}
                  · {{ seasonAvailableCount(season) }}/{{ season.episodes.length }} dispo
                  <span
                      v-if="season.organized_state !== 'none'"
                      class="ml-1.5 px-1.5 py-0.5 rounded text-[10px]"
                      :class="season.organized_state === 'complete'
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-yellow-500/10 text-yellow-500'"
                  >
                    {{ season.organized_state === 'complete'
                      ? `✓ ${season.organized_count} importé${season.organized_count > 1 ? 's' : ''}`
                      : `${season.organized_count}/${seasonAvailableCount(season)} importés` }}
                  </span>
                </p>
              </div>
            </div>

            <!-- Bouton pack saison -->
            <button
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition"
                :class="season.torrent && !isDownloaded(`season-${season.id}`) && !isAlreadyQueued(season.torrent) && season.organized_state !== 'complete'
                ? 'bg-accent-muted text-accent border-accent/20 hover:bg-accent/20'
                : 'text-muted border-border cursor-not-allowed opacity-50'"
                :disabled="!season.torrent || isDownloading(`season-${season.id}`) || isDownloaded(`season-${season.id}`) || isAlreadyQueued(season.torrent) || season.organized_state === 'complete'"
                @click="season.torrent && download(`season-${season.id}`, season.torrent.torrent_url, season.torrent.magnet)"
            >
              <EpStateIcon :state="seasonBtnState(season)" :size="12" />
              {{ season.organized_state === 'complete' ? 'Importé' : isAlreadyQueued(season.torrent) ? 'Déjà ajouté' : isDownloaded(`season-${season.id}`) ? 'Envoyé' : 'Saison entière' }}
            </button>
          </div>

          <!-- Progression saison — dans le header, sous les contrôles -->
          <div
              v-if="torrentProgress(extractHash(season.torrent)) && torrentProgress(extractHash(season.torrent))!.progress < 100"
              class="px-5 pb-3 -mt-1"
          >
            <div class="h-0.5 bg-border rounded-full overflow-hidden">
              <div
                  class="h-full bg-accent rounded-full transition-all duration-500"
                  :style="{ width: `${torrentProgress(extractHash(season.torrent))!.progress}%` }"
              />
            </div>
            <p class="text-[11px] text-muted mt-1">{{ torrentProgress(extractHash(season.torrent))!.progress }}%</p>
          </div>

          <!-- Épisodes -->
          <div v-if="!collapsedSeasons.has(season.id)" class="divide-y divide-border/50">
            <div
                v-for="ep in season.episodes"
                :key="ep.id"
                class="px-5 py-3 hover:bg-hover/50 transition-colors"
                :class="{ 'opacity-40': !ep.available && !ep.organized }"
            >
              <div class="flex items-center gap-3">

                <!-- Thumbnail -->
                <div class="shrink-0 w-20 aspect-video rounded-md overflow-hidden bg-shell hidden sm:flex items-center justify-center text-muted text-xs font-mono">
                  <img v-if="ep.thumb_image" :src="ep.thumb_image" class="w-full h-full object-cover" loading="lazy" />
                  <span v-else>{{ season.season_number === 0 ? 'SP' : `E${ep.episode_number}` }}</span>
                </div>

                <!-- Infos épisode -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-muted shrink-0 font-mono">
                      {{ season.season_number === 0 ? 'SP' : `E${String(ep.episode_number).padStart(2, '0')}` }}
                    </span>
                    <span class="text-sm text-primary truncate">{{ ep.title || `Épisode ${ep.episode_number}` }}</span>
                    <!-- Badge Hors Fankai -->
                    <span
                        v-if="ep.fankai === false || ep.torrent?.fankai === false"
                        class="shrink-0 text-[10px] px-1.5 py-0.5 rounded border bg-purple-500/10 text-purple-400 border-purple-500/20"
                        title="Ce fichier ne provient pas du catalogue Fan-Kai officiel"
                    >
                      Hors Fankai
                    </span>
                  </div>
                  <div class="flex items-center gap-2 mt-0.5">
                    <span v-if="ep.aired" class="text-xs text-muted">{{ formatDate(ep.aired) }}</span>
                    <span v-if="ep.duration" class="text-xs text-muted">{{ formatDuration(ep.duration) }}</span>
                  </div>
                </div>

                <!-- Bouton état unique -->
                <button
                    class="shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center transition-colors"
                    :class="epBtnClass(ep)"
                    :disabled="!ep.torrent || ep.organized || isAlreadyQueued(ep.torrent)"
                    @click="ep.torrent && !ep.organized && !isAlreadyQueued(ep.torrent) && download(`ep-${ep.id}`, ep.torrent.torrent_url, ep.torrent.magnet)"
                >
                  <EpStateIcon :state="epState(ep)" :size="14" />
                </button>

              </div>

              <!-- Barre progression épisode -->
              <div
                  v-if="torrentProgress(extractHash(ep.torrent)) && torrentProgress(extractHash(ep.torrent))!.progress < 100"
                  class="mt-1.5 sm:pl-[92px]"
              >
                <div class="h-0.5 bg-border rounded-full overflow-hidden">
                  <div
                      class="h-full bg-accent rounded-full transition-all duration-500"
                      :style="{ width: `${torrentProgress(extractHash(ep.torrent))!.progress}%` }"
                  />
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, defineComponent, h } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ArrowLeft, Tv, ChevronUp, Download, Loader, Check, X } from 'lucide-vue-next'
import { useSeriesStore } from '@/stores/series'
import { useToast } from '@/composables/useToast'
import type { Season } from '@/stores/series'

// ── Icône d'état du bouton ────────────────────────────────────
// states: 'idle' | 'loading' | 'done' | 'unavailable'
const EpStateIcon = defineComponent({
  props: {
    state: { type: String, default: 'idle' },
    size : { type: Number, default: 14 },
  },
  setup(props) {
    return () => {
      if (props.state === 'loading')     return h(Loader,   { size: props.size, class: 'animate-spin' })
      if (props.state === 'done')        return h(Check,    { size: props.size })
      if (props.state === 'unavailable') return h(X,        { size: props.size })
      return h(Download, { size: props.size })
    }
  },
})

// ── Barre de progression ──────────────────────────────────────
const ProgressBar = defineComponent({
  props: { progress: { type: Number, default: null } },
  setup(props) {
    return () => {
      if (props.progress == null || props.progress >= 100) return null
      return h('div', { class: 'h-0.5 bg-border rounded-full overflow-hidden' }, [
        h('div', {
          class: 'h-full bg-accent rounded-full transition-all duration-500',
          style: { width: `${props.progress}%` },
        }),
      ])
    }
  },
})

const route  = useRoute()
const store  = useSeriesStore()
const { add: toast } = useToast()

const collapsedSeasons = ref<Set<number>>(new Set())
const downloading = ref<string[]>([])
const downloaded  = ref<string[]>([])

function isDownloading(key: string) { return downloading.value.includes(key) }
function isDownloaded(key: string)  { return downloaded.value.includes(key) }
function addDownloading(key: string) { if (!downloading.value.includes(key)) downloading.value.push(key) }
function removeDownloading(key: string) { downloading.value = downloading.value.filter(k => k !== key) }
function addDownloaded(key: string) { if (!downloaded.value.includes(key)) downloaded.value.push(key) }

interface ActiveTorrent { hash: string; progress: number; state: string }
const activeTorrents = ref<ActiveTorrent[]>([])
let pollTimer: ReturnType<typeof setInterval> | null = null

const data = computed(() => store.currentSerie)

// ── Polling downloads ─────────────────────────────────────────
async function fetchActiveDownloads() {
  try {
    const res = await fetch('/api/downloads', { credentials: 'include' })
    if (!res.ok) return
    const list: any[] = await res.json()
    activeTorrents.value = list.map(t => ({
      hash    : t.hash,
      progress: t.progress ?? 0,
      state   : t.state,
    }))
  } catch {}
}

function torrentProgress(hash: string | null | undefined): ActiveTorrent | null {
  if (!hash) return null
  return activeTorrents.value.find(t => t.hash.toLowerCase() === hash.toLowerCase()) ?? null
}

function extractHash(torrent: { magnet?: string | null } | null | undefined): string | null {
  if (!torrent?.magnet) return null
  const m = torrent.magnet.match(/xt=urn:btih:([a-fA-F0-9]{40})/i)
  return m ? m[1].toLowerCase() : null
}

function isAlreadyQueued(torrent: { magnet?: string | null } | null | undefined): boolean {
  const hash = extractHash(torrent)
  if (!hash) return false
  return activeTorrents.value.some(t => t.hash.toLowerCase() === hash.toLowerCase())
}

// ── États boutons ─────────────────────────────────────────────
type BtnState = 'idle' | 'loading' | 'done' | 'unavailable'

function epState(ep: any): BtnState {
  if (ep.organized)                                          return 'done'
  if (isDownloaded(`ep-${ep.id}`))                        return 'done'
  if (isAlreadyQueued(ep.torrent))                           return 'done'
  const prog = torrentProgress(extractHash(ep.torrent))
  if (prog && prog.progress < 100)                           return 'loading'
  if (!ep.torrent || !ep.available)                          return 'unavailable'
  if (isDownloading(`ep-${ep.id}`))                        return 'loading'
  return 'idle'
}

function epBtnState(key: string, torrent: any): BtnState {
  if (isDownloaded(key) || isAlreadyQueued(torrent))       return 'done'
  if (isDownloading(key))                                  return 'loading'
  return 'idle'
}

function seasonBtnState(season: any): BtnState {
  if (season.organized_state === 'complete')                 return 'done'
  if (isDownloaded(`season-${season.id}`))                 return 'done'
  if (isAlreadyQueued(season.torrent))                       return 'done'
  if (isDownloading(`season-${season.id}`))                return 'loading'
  if (!season.torrent)                                       return 'unavailable'
  return 'idle'
}

function epBtnClass(ep: any): string {
  const state = epState(ep)
  if (state === 'done')        return 'border-green-500/30 text-green-500 bg-green-500/10 cursor-default'
  if (state === 'loading')     return 'border-accent/30 text-accent bg-accent-muted cursor-default'
  if (state === 'unavailable') return 'border-border text-muted opacity-40 cursor-not-allowed'
  return 'border-border text-muted hover:border-accent hover:text-accent cursor-pointer'
}

// ── Actions ───────────────────────────────────────────────────
function seasonAvailableCount(season: Season) {
  return season.episodes.filter((e: any) => e.available).length
}

function toggleSeason(id: number) {
  if (collapsedSeasons.value.has(id)) collapsedSeasons.value.delete(id)
  else collapsedSeasons.value.add(id)
}

async function download(key: string, torrent_url: string | null, magnet: string | null) {
  if (isDownloading(key) || isDownloaded(key)) return
  addDownloading(key)
  const result = await store.download(torrent_url, magnet)
  removeDownloading(key)
  if (result.success) {
    addDownloaded(key)
    toast('Téléchargement lancé ✓', 'success')
    fetchActiveDownloads()
  } else {
    toast(result.error ?? 'Erreur inconnue', 'error')
  }
}

function load() {
  store.fetchSerieDetail(Number(route.params.id))
}

function formatDate(d: string): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return m > 0 ? `${h}h ${m}min` : `${h}h`
  return `${m} min`
}

onMounted(() => {
  load()
  fetchActiveDownloads()
  pollTimer = setInterval(fetchActiveDownloads, 5000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>