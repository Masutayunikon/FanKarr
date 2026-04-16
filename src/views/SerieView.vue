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
          :torrents-integrale="data.torrents_integrale"
          :organized-by-episode="organizedByEpisode"
          :has-downloadable-torrents="hasNonIntegraleDownloadables"
          :downloading-all="downloadingAll"
          :active-torrents="activeTorrents"
          :downloading="downloading"
          :downloaded="downloaded"
          @open-manual-import="openManualImport"
          @unimport="(del) => unimportSerie(del)"
          @download-all="downloadAll"
          @download="(key, url, magnet) => download(key, url, magnet)"
      />

      <!-- Saisons -->
      <div class="px-4 md:px-8 pb-16 flex flex-col gap-4">
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
            @download="(key, url, magnet) => download(key, url, magnet)"
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSeriesStore } from '@/stores/series'
import { useToast } from '@/composables/useToast'
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
const unimportMenuOpen   = ref(false)
const downloadingAll     = ref(false)
const downloadingSeason  = ref<Record<number, boolean>>({})

interface ActiveTorrent { hash: string; progress: number; state: string }
const activeTorrents = ref<ActiveTorrent[]>([])
let pollTimer: ReturnType<typeof setInterval> | null = null

const data = computed(() => store.currentSerie)

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
    activeTorrents.value = list.map(t => ({ hash: t.hash, progress: t.progress ?? 0, state: t.state }))
  } catch {}
}

function openManualImport() { fetchOrganized(); manualImportOpen.value = true }

// ── Download ──────────────────────────────────────────────────
async function download(key: string, torrent_url: string | null, magnet: string | null) {
  if (isDownloading(key) || isDownloaded(key)) return
  addDownloading(key)
  const result = await store.download(torrent_url, magnet)
  removeDownloading(key)
  if (result.success) { addDownloaded(key); toast('Téléchargement lancé ✓', 'success'); fetchActiveDownloads() }
  else toast(result.error ?? 'Erreur inconnue', 'error')
}

function collectDownloadables() {
  if (!data.value) return []
  const result: { key: string; torrent_url: string | null; magnet: string | null }[] = []
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
      result.push({ key: `ep-${ep.id}`, torrent_url: ep.torrent.torrent_url, magnet: ep.torrent.magnet })
    }
  }
  return result
}

const hasDownloadableTorrents = computed(() => collectDownloadables().length > 0)

// "Tout télécharger" ne s'affiche que s'il y a des torrents saison/épisode à lancer
// (les intégrales ont déjà leurs propres boutons dédiés dans le hero)
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
    try { const r = await store.download(t.torrent_url, t.magnet); if (r.success) { addDownloaded(t.key); sent++ } } catch {}
  }
  downloadingAll.value = false
  if (sent > 0) { toast(`${sent} torrent(s) envoyé(s) ✓`, 'success'); fetchActiveDownloads() }
  else toast('Aucun nouveau torrent à télécharger', 'success')
}

async function downloadSeason(season: Season) {
  downloadingSeason.value[season.id] = true
  const torrents: { key: string; torrent_url: string | null; magnet: string | null }[] = []
  if (season.torrent && !isAlreadyQueued(season.torrent) && !isDownloaded(`season-${season.id}`) && season.organized_state !== 'complete') {
    torrents.push({ key: `season-${season.id}`, torrent_url: season.torrent.torrent_url, magnet: season.torrent.magnet })
  } else {
    for (const ep of (season as any).episodes ?? []) {
      if (!ep.torrent || !ep.available || ep.organized || isAlreadyQueued(ep.torrent) || isDownloaded(`ep-${ep.id}`)) continue
      torrents.push({ key: `ep-${ep.id}`, torrent_url: ep.torrent.torrent_url, magnet: ep.torrent.magnet })
    }
  }
  let sent = 0
  for (const t of torrents) {
    try { const r = await store.download(t.torrent_url, t.magnet); if (r.success) { addDownloaded(t.key); sent++ } } catch {}
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
  document.addEventListener('click', () => { unimportMenuOpen.value = false })
})
onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
  document.removeEventListener('click', () => { unimportMenuOpen.value = false })
})
</script>
