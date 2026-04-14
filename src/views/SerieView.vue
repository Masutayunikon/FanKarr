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

            <!-- Titre + boutons -->
            <div class="flex items-center gap-3 flex-wrap">
              <h1 class="text-2xl font-bold text-primary tracking-tight">{{ data.serie.title }}</h1>
              <button
                  @click="openManualImport"
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
                  <button @click="unimportSerie(false); unimportMenuOpen = false" class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted hover:bg-hover transition-colors">
                    Retirer de la bibliothèque
                  </button>
                  <button @click="unimportSerie(true); unimportMenuOpen = false" class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors">
                    Supprimer les fichiers
                  </button>
                </div>
              </div>
            </div>

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
              <!-- Bouton Tout télécharger si pas de torrent intégrale mais des torrents par épisode/saison -->
              <button
                  v-if="data.torrents_integrale.length === 0 && hasDownloadableTorrents"
                  @click="downloadAll"
                  :disabled="downloadingAll"
                  class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent-hover transition"
                  :class="downloadingAll ? 'opacity-50 cursor-not-allowed' : ''"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" :class="downloadingAll ? 'animate-spin' : ''">
                  <path v-if="!downloadingAll" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline v-if="!downloadingAll" points="7 10 12 15 17 10"/><line v-if="!downloadingAll" x1="12" y1="15" x2="12" y2="3"/>
                  <path v-else d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-6.36-2.64M3 12a9 9 0 0 1 9-9 9 9 0 0 1 6.36 2.64"/>
                </svg>
                {{ downloadingAll ? 'Envoi…' : 'Tout télécharger' }}
              </button>

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
                  <template v-if="seasonAvailableCount(season) > 0">
                    · {{ seasonAvailableCount(season) }}/{{ season.episodes.length }} dispo
                  </template>
                  <span
                      v-if="season.organized_state !== 'none'"
                      class="ml-1.5 px-1.5 py-0.5 rounded text-[10px]"
                      :class="season.organized_state === 'complete'
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-yellow-500/10 text-yellow-500'"
                  >
                    {{ season.organized_state === 'complete'
                      ? `✓ ${season.organized_count} importé${season.organized_count > 1 ? 's' : ''}`
                      : `${season.organized_count}/${seasonAvailableCount(season) || season.episodes.length} importés` }}
                  </span>
                </p>
              </div>
            </div>

            <!-- Boutons saison -->
            <div class="flex items-center gap-2">
              <!-- Tout télécharger (épisodes individuels sans pack saison) -->
              <button
                  v-if="!season.torrent && seasonHasDownloadable(season)"
                  @click="downloadSeason(season)"
                  :disabled="downloadingSeason[season.id]"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border bg-accent-muted text-accent border-accent/20 hover:bg-accent/20 transition"
              >
                <EpStateIcon :state="downloadingSeason[season.id] ? 'loading' : 'idle'" :size="12" />
                {{ downloadingSeason[season.id] ? 'Envoi…' : 'Tout télécharger' }}
              </button>

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
          </div>

          <!-- Progression saison -->
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

                <!-- Actions épisode importé -->
                <template v-if="ep.organized && organizedByEpisode[String(ep.id)]">
                  <!-- Badge rename disponible -->
                  <span
                      v-if="epNeedsRename(ep)"
                      class="shrink-0 text-[10px] px-1.5 py-0.5 rounded border bg-yellow-500/10 text-yellow-400 border-yellow-500/20 cursor-default"
                      :title="`Actuel : ${organizedByEpisode[String(ep.id)]?.dest_filename}\nAttendu : ${epExpectedName(ep)}`"
                  >
                    Rename
                  </span>

                  <!-- Menu actions -->
                  <div class="relative" @click.stop>
                    <button
                        @click="epMenuOpen = epMenuOpen === ep.id ? null : ep.id"
                        class="w-6 h-6 flex items-center justify-center rounded text-muted hover:text-primary transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                    </button>
                    <div
                        v-if="epMenuOpen === ep.id"
                        class="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl p-1 z-20 w-44 shadow-xl flex flex-col gap-0.5"
                    >
                      <button
                          v-if="epNeedsRename(ep)"
                          @click="renameEpisode(ep, season); epMenuOpen = null"
                          :disabled="epActionLoading[ep.id]"
                          class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-primary hover:bg-hover transition-colors"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        Renommer
                      </button>
                      <button
                          @click="unimportEpisode(ep, season, false); epMenuOpen = null"
                          :disabled="epActionLoading[ep.id]"
                          class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted hover:bg-hover transition-colors"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
                        Désimporter
                      </button>
                      <button
                          @click="unimportEpisode(ep, season, true); epMenuOpen = null"
                          :disabled="epActionLoading[ep.id]"
                          class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
                        Supprimer le fichier
                      </button>
                    </div>
                  </div>
                </template>

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

    <!-- Modal import manuel -->
    <ManualImportModal
        v-if="manualImportOpen && data"
        :serie-id="Number(route.params.id)"
        :serie-name="data.serie.title"
        :seasons="data.seasons"
        :organized="organizedByEpisode"
        :initial-path="mediaPath"
        @close="manualImportOpen = false"
        @imported="load(); fetchOrganized(); manualImportOpen = false"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, defineComponent, h } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ArrowLeft, Tv, ChevronUp, Download, Loader, Check, X } from 'lucide-vue-next'
import { useSeriesStore } from '@/stores/series'
import { useToast } from '@/composables/useToast'
import ManualImportModal from '@/components/ManualImportModal.vue'
import type { Season } from '@/stores/series'

// ── Icône d'état du bouton ────────────────────────────────────
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

const collapsedSeasons   = ref<Set<number>>(new Set())
const downloading        = ref<string[]>([])
const downloaded         = ref<string[]>([])
const manualImportOpen   = ref(false)
const organizedByEpisode = ref<Record<string, any>>({})
const mediaPath          = ref('/')
const epMenuOpen         = ref<number | null>(null)
const epActionLoading    = ref<Record<number, boolean>>({})
const unimportMenuOpen   = ref(false)
const downloadingAll     = ref(false)
const downloadingSeason  = ref<Record<number, boolean>>({})

function isDownloading(key: string) { return downloading.value.includes(key) }
function isDownloaded(key: string)  { return downloaded.value.includes(key) }
function addDownloading(key: string) { if (!downloading.value.includes(key)) downloading.value.push(key) }
function removeDownloading(key: string) { downloading.value = downloading.value.filter(k => k !== key) }
function addDownloaded(key: string) { if (!downloaded.value.includes(key)) downloaded.value.push(key) }

interface ActiveTorrent { hash: string; progress: number; state: string }
const activeTorrents = ref<ActiveTorrent[]>([])
let pollTimer: ReturnType<typeof setInterval> | null = null

const data = computed(() => store.currentSerie)

async function fetchOrganized() {
  try {
    const res = await fetch(`/api/organized/${route.params.id}`, { credentials: 'include' })
    if (res.ok) organizedByEpisode.value = await res.json()
  } catch {}
}

async function fetchSettings() {
  try {
    const res = await fetch('/api/settings', { credentials: 'include' })
    if (res.ok) {
      const s = await res.json()
      mediaPath.value = s.mediaPath || '/'
    }
  } catch {}
}

function openManualImport() {
  fetchOrganized()
  manualImportOpen.value = true
}

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
  if (ep.organized)                                       return 'done'
  if (isDownloaded(`ep-${ep.id}`))                       return 'done'
  if (isAlreadyQueued(ep.torrent))                        return 'done'
  const prog = torrentProgress(extractHash(ep.torrent))
  if (prog && prog.progress < 100)                        return 'loading'
  if (!ep.torrent || !ep.available)                       return 'unavailable'
  if (isDownloading(`ep-${ep.id}`))                      return 'loading'
  return 'idle'
}

function epBtnState(key: string, torrent: any): BtnState {
  if (isDownloaded(key) || isAlreadyQueued(torrent))     return 'done'
  if (isDownloading(key))                                return 'loading'
  return 'idle'
}

function seasonBtnState(season: any): BtnState {
  if (season.organized_state === 'complete')              return 'done'
  if (isDownloaded(`season-${season.id}`))               return 'done'
  if (isAlreadyQueued(season.torrent))                    return 'done'
  if (isDownloading(`season-${season.id}`))              return 'loading'
  if (!season.torrent)                                    return 'unavailable'
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

async function unimportSerie(deleteFile: boolean) {
  try {
    const res = await fetch(`/api/organized/${route.params.id}?deleteFile=${deleteFile}`, {
      method: 'DELETE', credentials: 'include',
    })
    if (!res.ok) { const d = await res.json(); toast(d.error ?? 'Erreur désimport', 'error'); return }
    const data = await res.json()
    toast(`${data.removed} épisode(s) désimporté(s) ✓`, 'success')
    await fetchOrganized()
    load()
  } catch {
    toast('Impossible de contacter le serveur', 'error')
  }
}

// ── Tout télécharger ─────────────────────────────────────────

// Vérifie si la série a des torrents par épisode téléchargeables (sans intégrale)
const hasDownloadableTorrents = computed(() => {
  if (!data.value) return false
  return data.value.seasons.some((season: any) => seasonHasDownloadable(season))
})

function seasonHasDownloadable(season: any): boolean {
  return season.episodes.some((ep: any) =>
      ep.torrent && ep.available && !ep.organized && !isAlreadyQueued(ep.torrent)
  )
}

async function downloadAll() {
  if (!data.value) return
  downloadingAll.value = true
  let sent = 0
  for (const season of data.value.seasons) {
    for (const ep of season.episodes) {
      if (!ep.torrent || !ep.available || ep.organized || isAlreadyQueued(ep.torrent)) continue
      try {
        const result = await store.download(ep.torrent.torrent_url, ep.torrent.magnet)
        if (result.success) { addDownloaded(`ep-${ep.id}`); sent++ }
      } catch {}
    }
  }
  downloadingAll.value = false
  if (sent > 0) { toast(`${sent} torrent(s) envoyé(s) ✓`, 'success'); fetchActiveDownloads() }
  else toast('Aucun nouveau torrent à télécharger', 'success')
}

async function downloadSeason(season: any) {
  downloadingSeason.value[season.id] = true
  let sent = 0
  for (const ep of season.episodes) {
    if (!ep.torrent || !ep.available || ep.organized || isAlreadyQueued(ep.torrent)) continue
    try {
      const result = await store.download(ep.torrent.torrent_url, ep.torrent.magnet)
      if (result.success) { addDownloaded(`ep-${ep.id}`); sent++ }
    } catch {}
  }
  downloadingSeason.value[season.id] = false
  if (sent > 0) { toast(`${sent} torrent(s) envoyé(s) ✓`, 'success'); fetchActiveDownloads() }
  else toast('Aucun nouveau torrent à télécharger pour cette saison', 'success')
}

// ── Rename / Désimport épisode ────────────────────────────────

// Calcule le nom attendu selon les settings actuels
function epExpectedName(ep: any): string {
  const entry = organizedByEpisode.value[String(ep.id)]
  if (!entry) return ''
  const srcExt = entry.dest_filename ? '.' + entry.dest_filename.split('.').pop() : '.mkv'
  // On ne connaît pas nfoSupport ici — on utilise ce qui est dispo
  // Si nfo_filename existe dans ep, c'est le nom attendu en mode nfo
  // On compare avec le nom actuel pour détecter si un rename est possible
  if (ep.nfo_filename) {
    const nfoName = ep.nfo_filename.replace(/\.[^.]+$/, '') + srcExt
    return nfoName
  }
  if (ep.formatted_name?.trim()) {
    return ep.formatted_name.replace(/[<>:"/\\|?*]/g, '').trim() + srcExt
  }
  return entry.dest_filename
}

function epNeedsRename(ep: any): boolean {
  const entry = organizedByEpisode.value[String(ep.id)]
  if (!entry) return false
  const expected = epExpectedName(ep)
  return !!expected && expected !== entry.dest_filename
}

async function renameEpisode(ep: any, season: any) {
  epActionLoading.value[ep.id] = true
  try {
    // Trouver le hash du torrent pour cet épisode
    const torrentHash = ep.paths?.[0]?.infohash ?? null
    const res = await fetch('/api/rename-episode', {
      method     : 'POST',
      headers    : { 'Content-Type': 'application/json' },
      credentials: 'include',
      body       : JSON.stringify({ serie_id: Number(route.params.id), episode_id: ep.id, torrent_hash: torrentHash }),
    })
    const data = await res.json()
    if (!res.ok) { toast(data.error ?? 'Erreur rename', 'error'); return }
    if (data.renamed) {
      toast(`Renommé : ${data.new_name}`, 'success')
      await fetchOrganized()
    } else {
      toast(data.message ?? 'Nom déjà correct', 'success')
    }
  } catch {
    toast('Impossible de contacter le serveur', 'error')
  } finally {
    epActionLoading.value[ep.id] = false
  }
}

async function unimportEpisode(ep: any, season: any, deleteFile: boolean) {
  epActionLoading.value[ep.id] = true
  try {
    const res = await fetch(`/api/organized/${route.params.id}/${ep.id}?deleteFile=${deleteFile}`, {
      method     : 'DELETE',
      credentials: 'include',
    })
    if (!res.ok) { const d = await res.json(); toast(d.error ?? 'Erreur désimport', 'error'); return }
    toast(deleteFile ? 'Fichier supprimé ✓' : 'Désimporté ✓', 'success')
    await fetchOrganized()
    load()
  } catch {
    toast('Impossible de contacter le serveur', 'error')
  } finally {
    epActionLoading.value[ep.id] = false
  }
}

onMounted(() => {
  load()
  fetchSettings()
  fetchActiveDownloads()
  pollTimer = setInterval(fetchActiveDownloads, 5000)
  // Fermer le menu épisode au clic extérieur
  document.addEventListener('click', () => { epMenuOpen.value = null; unimportMenuOpen.value = false })
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
  document.removeEventListener('click', () => { epMenuOpen.value = null })
})
</script>