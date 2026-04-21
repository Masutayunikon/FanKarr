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
      <!-- Hero -->
      <SerieHero
          :serie="data.serie"
          :organized-by-episode="organizedByEpisode"
          @open-manual-import="openManualImport"
          @unimport="(del) => unimportSerie(del)"
      />

      <!-- Zone d'actions téléchargement -->
      <div
          v-if="data.torrents_integrale.length > 0 || hasNonIntegraleDownloadables"
          class="px-4 md:px-8 py-4 flex items-center justify-between gap-4 border-b border-border"
      >
        <h2 class="text-sm font-semibold text-primary shrink-0">Saisons</h2>
        <div class="flex flex-wrap gap-2 justify-end">
          <!-- Tout télécharger (saisons + épisodes individuels) -->
          <button
              v-if="hasNonIntegraleDownloadables"
              @click="downloadAll"
              :disabled="downloadingAll"
              class="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-muted hover:text-primary hover:border-secondary transition"
              :class="downloadingAll ? 'opacity-50 cursor-not-allowed' : ''"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" :class="downloadingAll ? 'animate-spin' : ''">
              <path v-if="!downloadingAll" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline v-if="!downloadingAll" points="7 10 12 15 17 10"/><line v-if="!downloadingAll" x1="12" y1="15" x2="12" y2="3"/>
              <path v-else d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-6.36-2.64M3 12a9 9 0 0 1 9-9 9 9 0 0 1 6.36 2.64"/>
            </svg>
            {{ downloadingAll ? 'Envoi…' : 'Tout télécharger' }}
          </button>

          <!-- Boutons intégrale -->
          <template v-for="(t, i) in data.torrents_integrale" :key="i">
            <div class="flex flex-col gap-1">
              <button
                  :title="t.raw"
                  class="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition"
                  :class="[
                    'bg-accent text-white hover:bg-accent-hover',
                    (isAlreadyQueued(t) || isDownloaded(`integrale-${i}`)) ? 'opacity-50 cursor-not-allowed' : ''
                  ]"
                  :disabled="isAlreadyQueued(t) || isDownloaded(`integrale-${i}`)"
                  @click="download(`integrale-${i}`, t.torrent_url, t.magnet)"
              >
                <component :is="integraleIcon(`integrale-${i}`, t)" />
                {{ isAlreadyQueued(t) ? 'Déjà ajouté' : isDownloaded(`integrale-${i}`) ? 'Envoyé ✓' : t.label }}
              </button>
              <!-- Progression -->
              <div v-if="isDownloaded(`integrale-${i}`) && integraleProgress(t) && integraleProgress(t)!.progress < 100" class="h-0.5 bg-border rounded-full overflow-hidden">
                <div class="h-full bg-accent rounded-full transition-all duration-500" :style="{ width: `${integraleProgress(t)!.progress}%` }" />
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- Saisons -->
      <div class="px-4 md:px-8 pb-16 flex flex-col gap-4 pt-4">
        <SerieSeasonCard
            v-for="season in data.seasons"
            :key="season.id"
            :season="season"
            :collapsed="collapsedSeasons.has(season.id)"
            :active-torrents="activeTorrents"
            :downloading="downloading"
            :downloaded="downloaded"
            :organized-by-episode="organizedByEpisode"
            :ep-action-loading="epActionLoading"
            :downloading-season="!!downloadingSeason[season.id]"
            :nfo-support="nfoSupport"
            @toggle="toggleSeason"
            @download="(key, url, magnet, fi, fp) => download(key, url, magnet, fi, fp)"
            @download-season="downloadSeason"
            @rename-episode="(ep, s) => renameEpisode(ep, s)"
            @unimport-episode="(ep, s, del) => unimportEpisode(ep, s, del)"
        />
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
import { ref, computed, onMounted, onUnmounted, h } from 'vue'
import { useRoute } from 'vue-router'
import { useSeriesStore } from '@/stores/series'
import { useToast } from '@/composables/useToast'
import { Download, Check } from 'lucide-vue-next'
import ManualImportModal from '@/components/ManualImportModal.vue'
import SerieHero from '@/components/serie/SerieHero.vue'
import SerieSeasonCard from '@/components/serie/SerieSeasonCard.vue'
import type { Season } from '@/stores/series'

const route  = useRoute()
const store  = useSeriesStore()
const { add: toast } = useToast()

const collapsedSeasons   = ref<Set<number>>(new Set())
const downloading        = ref<string[]>([])
const downloaded         = ref<string[]>([])
const manualImportOpen   = ref(false)
const organizedByEpisode = ref<Record<string, any>>({})
const mediaPath          = ref('/')
const nfoSupport         = ref(false)
const epActionLoading    = ref<Record<number, boolean>>({})
const downloadingAll     = ref(false)
const downloadingSeason  = ref<Record<number, boolean>>({})

export interface ActiveTorrent { hash: string; progress: number; state: string; files?: { index: number; progress: number }[] }
const activeTorrents = ref<ActiveTorrent[]>([])
let pollTimer: ReturnType<typeof setInterval> | null = null

const data = computed(() => store.currentSerie)

// ── Helpers intégrale ─────────────────────────────────────────
function integraleIcon(key: string, torrent: any) {
  if (isDownloaded(key) || isAlreadyQueued(torrent)) return h(Check, { size: 13 })
  return h(Download, { size: 13 })
}
function integraleProgress(torrent: any) {
  const hash = extractHash(torrent)
  if (!hash) return null
  return activeTorrents.value.find(t => t.hash.toLowerCase() === hash.toLowerCase()) ?? null
}

// ── Helpers d'état ────────────────────────────────────────────
function isDownloading(key: string) { return downloading.value.includes(key) }
function isDownloaded(key: string)  { return downloaded.value.includes(key) }
function addDownloading(key: string) { if (!downloading.value.includes(key)) downloading.value.push(key) }
function removeDownloading(key: string) { downloading.value = downloading.value.filter(k => k !== key) }
function addDownloaded(key: string) { if (!downloaded.value.includes(key)) downloaded.value.push(key) }
function extractHash(torrent: any): string | null {
  if (!torrent?.magnet) return null
  const m = torrent.magnet.match(/xt=urn:btih:([a-fA-F0-9]{40})/i)
  return m ? m[1].toLowerCase() : null
}
function isAlreadyQueued(torrent: any): boolean {
  // Pour un fichier dans un pack (file_index défini), le hash seul ne suffit pas :
  // le pack peut être actif sans que CE fichier spécifique soit en téléchargement.
  if (torrent?.file_index != null) return false
  const hash = extractHash(torrent)
  if (!hash) return false
  return activeTorrents.value.some(t => t.hash.toLowerCase() === hash.toLowerCase())
}

// ── Fetch ─────────────────────────────────────────────────────
function load() { store.fetchSerieDetail(Number(route.params.id)) }

async function fetchOrganized() {
  try {
    const res = await fetch(`/api/organized/${route.params.id}`, { credentials: 'include' })
    if (res.ok) organizedByEpisode.value = await res.json()
  } catch {}
}

async function fetchSettings() {
  try {
    const res = await fetch('/api/settings', { credentials: 'include' })
    if (res.ok) { const s = await res.json(); mediaPath.value = s.mediaPath || '/'; nfoSupport.value = !!s.nfoSupport }
  } catch {}
}

async function fetchActiveDownloads() {
  try {
    const res = await fetch('/api/downloads', { credentials: 'include' })
    if (!res.ok) return
    const list: any[] = await res.json()
    activeTorrents.value = list.map(t => ({ hash: t.hash, progress: t.progress ?? 0, state: t.state, files: t.files }))
  } catch {}
}

function openManualImport() { fetchOrganized(); manualImportOpen.value = true }

// ── Download ──────────────────────────────────────────────────
async function download(key: string, torrent_url: string | null, magnet: string | null, file_index?: number | null, file_path?: string | null) {
  if (isDownloading(key) || isDownloaded(key)) return
  addDownloading(key)
  const result = await store.download(torrent_url, magnet, file_index, file_path)
  removeDownloading(key)
  if (result.success) { addDownloaded(key); toast('Téléchargement lancé ✓', 'success'); fetchActiveDownloads() }
  else toast(result.error ?? 'Erreur inconnue', 'error')
}

function collectDownloadables() {
  if (!data.value) return []
  const result: { key: string; torrent_url: string | null; magnet: string | null; file_index?: number | null; file_path?: string | null }[] = []
  const covered = new Set<number>()
  data.value.torrents_integrale.forEach((t: any, i: number) => {
    if (!isAlreadyQueued(t) && !isDownloaded(`integrale-${i}`)) {
      result.push({ key: `integrale-${i}`, torrent_url: t.torrent_url, magnet: t.magnet })
      for (const season of data.value!.seasons) for (const ep of season.episodes) covered.add(ep.id)
    }
  })
  for (const season of data.value.seasons) {
    if (!season.torrent || isAlreadyQueued(season.torrent) || isDownloaded(`season-${season.id}`) || season.organized_state === 'complete') continue
    result.push({ key: `season-${season.id}`, torrent_url: season.torrent.torrent_url, magnet: season.torrent.magnet })
    for (const ep of season.episodes) covered.add(ep.id)
  }
  for (const season of data.value.seasons) {
    for (const ep of season.episodes) {
      if (!ep.torrent || !ep.available || ep.organized || isAlreadyQueued(ep.torrent) || isDownloaded(`ep-${ep.id}`) || covered.has(ep.id)) continue
      result.push({ key: `ep-${ep.id}`, torrent_url: ep.torrent.torrent_url, magnet: ep.torrent.magnet, file_index: ep.torrent.file_index ?? null, file_path: ep.torrent.file_path ?? null })
    }
  }
  return result
}

// S'affiche uniquement s'il y a des torrents saison/épisode à lancer
// (les intégrales ont leurs propres boutons dédiés dans la zone d'actions)
const hasNonIntegraleDownloadables = computed(() => {
  if (!data.value) return false
  const covered = new Set<number>()
  data.value.torrents_integrale.forEach((t: any, i: number) => {
    if (!isAlreadyQueued(t) && !isDownloaded(`integrale-${i}`))
      for (const season of data.value!.seasons) for (const ep of season.episodes) covered.add(ep.id)
  })
  for (const season of data.value.seasons) {
    if (season.torrent && !isAlreadyQueued(season.torrent) && !isDownloaded(`season-${season.id}`) && season.organized_state !== 'complete') return true
    for (const ep of season.episodes) {
      if (ep.torrent && ep.available && !ep.organized && !isAlreadyQueued(ep.torrent) && !isDownloaded(`ep-${ep.id}`) && !covered.has(ep.id)) return true
    }
  }
  return false
})

async function downloadAll() {
  downloadingAll.value = true
  const torrents = collectDownloadables()
  let sent = 0
  for (const t of torrents) {
    try { const r = await store.download(t.torrent_url, t.magnet, t.file_index, t.file_path); if (r.success) { addDownloaded(t.key); sent++ } } catch {}
  }
  downloadingAll.value = false
  if (sent > 0) { toast(`${sent} torrent(s) envoyé(s) ✓`, 'success'); fetchActiveDownloads() }
  else toast('Aucun nouveau torrent à télécharger', 'success')
}

async function downloadSeason(season: Season) {
  downloadingSeason.value[season.id] = true
  const torrents: { key: string; torrent_url: string | null; magnet: string | null; file_index?: number | null; file_path?: string | null }[] = []
  if (season.torrent && !isAlreadyQueued(season.torrent) && !isDownloaded(`season-${season.id}`) && season.organized_state !== 'complete') {
    torrents.push({ key: `season-${season.id}`, torrent_url: season.torrent.torrent_url, magnet: season.torrent.magnet })
  } else {
    for (const ep of (season as any).episodes ?? []) {
      if (!ep.torrent || !ep.available || ep.organized || isAlreadyQueued(ep.torrent) || isDownloaded(`ep-${ep.id}`)) continue
      torrents.push({ key: `ep-${ep.id}`, torrent_url: ep.torrent.torrent_url, magnet: ep.torrent.magnet, file_index: ep.torrent.file_index ?? null, file_path: ep.torrent.file_path ?? null })
    }
  }
  let sent = 0
  for (const t of torrents) {
    try { const r = await store.download(t.torrent_url, t.magnet, t.file_index, t.file_path); if (r.success) { addDownloaded(t.key); sent++ } } catch {}
  }
  downloadingSeason.value[season.id] = false
  if (sent > 0) { toast(`${sent} torrent(s) envoyé(s) ✓`, 'success'); fetchActiveDownloads() }
  else toast('Aucun nouveau torrent à télécharger pour cette saison', 'success')
}

// ── Actions ───────────────────────────────────────────────────
function toggleSeason(id: number) {
  if (collapsedSeasons.value.has(id)) collapsedSeasons.value.delete(id)
  else collapsedSeasons.value.add(id)
}

async function unimportSerie(deleteFile: boolean) {
  try {
    const res = await fetch(`/api/organized/${route.params.id}?deleteFile=${deleteFile}`, { method: 'DELETE', credentials: 'include' })
    if (!res.ok) { const d = await res.json(); toast(d.error ?? 'Erreur désimport', 'error'); return }
    const d = await res.json()
    toast(`${d.removed} épisode(s) désimporté(s) ✓`, 'success')
    await fetchOrganized(); load()
  } catch { toast('Impossible de contacter le serveur', 'error') }
}

async function renameEpisode(ep: any, _season: any) {
  epActionLoading.value[ep.id] = true
  try {
    const torrentHash = ep.paths?.[0]?.infohash ?? null
    const res = await fetch('/api/rename-episode', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ serie_id: Number(route.params.id), episode_id: ep.id, torrent_hash: torrentHash }),
    })
    const d = await res.json()
    if (!res.ok) { toast(d.error ?? 'Erreur rename', 'error'); return }
    if (d.renamed) { toast(`Renommé : ${d.new_name}`, 'success'); await fetchOrganized() }
    else toast(d.message ?? 'Nom déjà correct', 'success')
  } catch { toast('Impossible de contacter le serveur', 'error') }
  finally { epActionLoading.value[ep.id] = false }
}

async function unimportEpisode(ep: any, _season: any, deleteFile: boolean) {
  epActionLoading.value[ep.id] = true
  try {
    const res = await fetch(`/api/organized/${route.params.id}/${ep.id}?deleteFile=${deleteFile}`, { method: 'DELETE', credentials: 'include' })
    if (!res.ok) { const d = await res.json(); toast(d.error ?? 'Erreur désimport', 'error'); return }
    toast(deleteFile ? 'Fichier supprimé ✓' : 'Désimporté ✓', 'success')
    await fetchOrganized(); load()
  } catch { toast('Impossible de contacter le serveur', 'error') }
  finally { epActionLoading.value[ep.id] = false }
}

onMounted(() => {
  load(); fetchSettings(); fetchOrganized(); fetchActiveDownloads()
  pollTimer = setInterval(fetchActiveDownloads, 5000)
})
onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>
