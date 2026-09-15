<template>
  <div>

    <div v-if="store.loadingDetail" class="flex flex-col items-center justify-center gap-3 h-64 text-muted">
      <div class="w-6 h-6 border border-border border-t-accent rounded-full animate-spin" />
      <p class="text-body">Chargement…</p>
    </div>

    <div v-else-if="store.error" class="flex flex-col items-center justify-center gap-3 h-64">
      <p class="text-body text-err">{{ store.error }}</p>
      <button class="btn-primary" @click="load">Réessayer</button>
    </div>

    <template v-else-if="data">
      <SerieHero
          :serie="data.serie"
          :season-count="seasonCount"
          :episode-count="episodeCount"
          :organized-count="organizedCount"
          :organized-label="auth.isAdmin ? 'importé' : 'disponible'"
          :watched="auth.isAdmin && rssSync"
      >
        <template #actions>
          <template v-if="auth.isAdmin">
            <div v-if="hasSomethingToDownload" class="relative max-sm:flex-1 max-sm:min-w-0" @click.stop>
              <button
                  :disabled="downloadingAll"
                  class="btn-primary max-sm:w-full"
                  @click="data.torrents_integrale.length > 1 ? (downloadMenuOpen = !downloadMenuOpen) : downloadAll()"
              >
                <Loader v-if="downloadingAll" :size="16" class="animate-spin" />
                <Download v-else :size="16" :stroke-width="2.25" />
                {{ downloadingAll ? 'Envoi…' : 'Tout télécharger' }}
                <ChevronDown v-if="data.torrents_integrale.length > 1" :size="13" :stroke-width="2.5" />
              </button>

              <div v-if="downloadMenuOpen && data.torrents_integrale.length > 1" class="menu absolute left-0 top-full mt-1.5 w-80 max-w-[90vw] z-20" role="menu">
                <button
                    v-for="(t, i) in data.torrents_integrale"
                    :key="i"
                    role="menuitem"
                    :disabled="isAlreadyQueued(t) && !hasUncoveredByIntegrale(i)"
                    class="menu-item"
                    :class="(isDownloaded(`integrale-${i}`) && !hasUncoveredByIntegrale(i)) ? 'opacity-40 cursor-not-allowed' : ''"
                    :title="t.raw ?? ''"
                    @click="downloadAll(i); downloadMenuOpen = false"
                >
                  <Download :size="14" class="shrink-0" />
                  <span class="truncate">{{ integraleGroupLabels()[i] }}</span>
                </button>
              </div>
            </div>

            <button @click="openManualImport" class="btn-secondary font-medium max-sm:w-11 max-sm:px-0 max-sm:shrink-0" title="Import manuel" aria-label="Import manuel">
              <Upload :size="15" :stroke-width="2" /> <span class="max-sm:hidden">Import manuel</span>
            </button>

            <div class="relative" @click.stop>
              <button @click="moreMenuOpen = !moreMenuOpen" class="btn-icon" aria-label="Plus d'actions" aria-haspopup="menu" :aria-expanded="moreMenuOpen">
                <Ellipsis :size="16" />
              </button>
              <div v-if="moreMenuOpen" class="menu absolute right-0 sm:right-auto sm:left-0 top-full mt-1.5 w-64 z-20" role="menu">
                <button role="menuitem" class="menu-item" @click="toggleRssSync(); moreMenuOpen = false">
                  <Rss :size="14" class="shrink-0" />
                  {{ rssSync ? 'Ne plus surveiller' : 'Surveiller les nouveaux épisodes' }}
                </button>
                <button
                    v-if="Object.keys(organizedByEpisode).length > 0"
                    role="menuitem"
                    class="menu-item text-err hover:text-err"
                    @click="openUnimportSerieModal(); moreMenuOpen = false"
                >
                  <Trash2 :size="14" class="shrink-0" /> Retirer de la médiathèque…
                </button>
              </div>
            </div>
          </template>

          <template v-else>
            <button v-if="canRequestMore" @click="openRequestModal()" class="btn-primary max-sm:flex-1 max-sm:min-w-0">
              <Clock3 :size="16" :stroke-width="2.25" />
              {{ myRequest ? 'Demander les saisons manquantes' : 'Demander la série' }}
            </button>
            <span v-if="myRequest" class="min-h-10 py-2 px-4 rounded-full border border-accent/30 text-accent text-[13px] font-semibold flex items-center gap-[9px]">
              <Clock3 :size="15" :stroke-width="2" />
              {{ myRequest.status === 'approved' ? 'Demande approuvée · bientôt là' : 'Demande en attente' }}<template v-if="myScopeLabel"> · {{ myScopeLabel }}</template>
            </span>
            <span v-else-if="allOrganized" class="h-10 px-1 flex items-center gap-2 text-body font-semibold text-ok">
              <Check :size="16" :stroke-width="2.5" /> Toute la série est disponible
            </span>
          </template>
        </template>
      </SerieHero>

      <div class="px-4 md:px-10 pt-5 pb-16 flex flex-col gap-4">

        <!-- Série absente du scraper -->
        <div v-if="auth.isAdmin && !data.scraper_synced" class="rounded-card border border-accent/30 bg-accent/5 px-5 py-4 flex items-start gap-3.5">
          <TriangleAlert :size="18" :stroke-width="1.75" class="text-accent shrink-0 mt-0.5" />
          <div class="flex flex-col gap-1">
            <p class="card-title text-accent">Torrents pas encore disponibles</p>
            <p class="text-meta text-secondary">
              Cette série n'est pas encore dans les données du catalogue. L'import manuel et le renommage restent possibles ; les torrents apparaîtront après la prochaine synchronisation.
            </p>
          </div>
        </div>

        <!-- Dossier série à renommer -->
        <div v-if="auth.isAdmin && staleFolders.length > 0" class="rounded-card border border-accent/30 bg-accent/5 px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div class="flex items-start gap-3.5 min-w-0">
            <Folder :size="18" :stroke-width="1.75" class="text-accent shrink-0 mt-0.5" />
            <div class="flex flex-col gap-1 min-w-0">
              <p class="card-title">Le nom du dossier ne correspond plus au titre</p>
              <p class="text-meta text-secondary break-all">
                Actuel : {{ staleFolders.map(f => basename(f.path)).join(', ') }} · Attendu : <span class="text-primary">{{ folderTarget }}</span>
              </p>
            </div>
          </div>
          <button @click="renameFolder" :disabled="renamingFolder" class="btn-secondary btn-sm shrink-0">
            {{ renamingFolder ? 'Renommage…' : 'Renommer le dossier' }}
          </button>
        </div>

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
            :request-mode="!auth.isAdmin"
            :requested-seasons="requestedSeasonNumbers"
            :requested-episodes="requestedEpisodeIds"
            :request-status="myRequest?.status"
            @toggle="toggleSeason"
            @download="(key, url, magnet, fi, fp, ih) => download(key, url, magnet, fi, fp, ih)"
            @download-season="(s, h) => downloadSeason(s, h)"
            @rename-episode="(ep, s) => renameEpisode(ep, s)"
            @unimport-episode="(ep, s, del) => unimportEpisode(ep, s, del)"
            @unimport-season="(s, del) => unimportSeason(s, del)"
            @request-season="handleRequestSeason"
            @request-episode="handleRequestEpisode"
        />
      </div>

      <Teleport to="body">
        <div v-if="requestModal" class="modal-backdrop" @click.self="requestModal = false">
          <div class="modal max-w-sm" role="dialog" aria-modal="true" aria-labelledby="request-title">
            <div class="flex flex-col gap-1">
              <h2 id="request-title" class="card-title">Demander une série</h2>
              <p class="text-meta text-muted truncate">{{ data?.serie?.title }}</p>
            </div>
            <div class="flex flex-col gap-1">
              <p class="tag-label mb-1.5">Saisons demandées</p>
              <label
                  v-for="season in data?.seasons"
                  :key="season.id"
                  class="flex items-center gap-3 min-h-9 cursor-pointer select-none"
              >
                <input
                    type="checkbox"
                    :value="season.season_number"
                    v-model="requestSeasons"
                    class="w-4 h-4 rounded"
                />
                <span class="text-body text-primary">
                  {{ season.season_number === 0 ? 'Spéciaux' : `Saison ${season.season_number}` }}
                  <span v-if="season.title && season.title !== `Saison ${season.season_number}`" class="text-muted">· {{ season.title }}</span>
                </span>
              </label>
            </div>
            <div class="flex items-center justify-end gap-2.5">
              <button @click="requestModal = false" class="btn-ghost">Annuler</button>
              <button @click="submitRequest" :disabled="requestSeasons.length === 0" class="btn-primary">
                Envoyer la demande
              </button>
            </div>
          </div>
        </div>
      </Teleport>
    </template>

    <Teleport to="body">
      <div v-if="unimportSerieModal" class="modal-backdrop" @click.self="unimportSerieModal = false">
        <div class="modal max-w-sm" role="dialog" aria-modal="true" aria-labelledby="unimport-serie-title">
          <div class="flex flex-col gap-1">
            <h2 id="unimport-serie-title" class="card-title">Retirer de la médiathèque</h2>
            <p class="text-meta text-muted truncate">{{ data?.serie?.title }}</p>
          </div>
          <label class="flex items-center gap-3 cursor-pointer select-none">
            <input type="checkbox" v-model="deleteSerieFiles" class="w-4 h-4 rounded" />
            <span class="text-body text-secondary">Supprimer aussi les fichiers du disque</span>
          </label>
          <div class="flex items-center justify-end gap-2.5">
            <button @click="unimportSerieModal = false" class="btn-ghost">Annuler</button>
            <button @click="confirmUnimportSerie" class="btn-danger">
              {{ deleteSerieFiles ? 'Retirer et supprimer les fichiers' : 'Retirer' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <ManualImportModal
        v-if="manualImportOpen && data"
        :serie-id="Number(route.params.id)"
        :serie-name="data.serie.title"
        :seasons="data.seasons"
        :organized="organizedByEpisode"
        :initial-path="mediaPath"
        @close="manualImportOpen = false"
        @imported="load(); fetchOrganized()"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSeriesStore } from '@/stores/series'
import { useAuthStore }   from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { Check, ChevronDown, Clock3, Download, Ellipsis, Folder, Loader, Rss, Trash2, TriangleAlert, Upload } from 'lucide-vue-next'
import { seasonsLabel } from '@/utils/requests'
import { plural } from '@/utils/format'
import ManualImportModal from '@/components/ManualImportModal.vue'
import SerieHero from '@/components/serie/SerieHero.vue'
import SerieSeasonCard from '@/components/serie/SerieSeasonCard.vue'
import type { Season } from '@/stores/series'

const route  = useRoute()
const store  = useSeriesStore()
const auth   = useAuthStore()
const { add: toast } = useToast()

// ── Demandes (invités) ──
const myRequest      = ref<any>(null)   // demande existante de l'utilisateur pour cette série
const requestModal   = ref(false)
const requestSeasons = ref<number[]>([])

const requestedSeasonNumbers = computed<number[]>(() => {
  if (!myRequest.value) return []
  const r = myRequest.value.requesters?.find((r: any) => r.userId === auth.userId)
  if (!r) return []
  // Ni saison ni épisode précisés = série entière
  if (r.seasons.length === 0 && (r.episodes ?? []).length === 0) {
    return data.value?.seasons?.map((s: any) => s.season_number) ?? []
  }
  return r.seasons
})

const requestedEpisodeIds = computed<number[]>(() => {
  if (!myRequest.value) return []
  const r = myRequest.value.requesters?.find((r: any) => r.userId === auth.userId)
  if (!r) return []
  return r.episodes ?? []
})

async function fetchMyRequest() {
  try {
    const res = await fetch('/api/requests', { credentials: 'include' })
    if (res.ok) {
      const list = await res.json()
      myRequest.value = list.find((r: any) =>
        r.serieId === Number(route.params.id) &&
        r.status !== 'rejected' && r.status !== 'completed'
      ) ?? null
    }
  } catch {}
}

function openRequestModal(preselectedSeason?: number) {
  if (preselectedSeason !== undefined) {
    requestSeasons.value = [preselectedSeason]
  } else {
    requestSeasons.value = data.value?.seasons?.map((s: any) => s.season_number) ?? []
  }
  requestModal.value = true
}

function handleRequestSeason(seasonNumber: number) {
  openRequestModal(seasonNumber)
}

async function handleRequestEpisode(_seasonNumber: number, episodeId: number, torrent?: any) {
  if (!data.value) return
  try {
    const body: Record<string, any> = {
      serieId  : Number(route.params.id),
      serieName: data.value.serie.title,
      seasons  : [],
      episodes : [episodeId],
    }
    if (torrent) {
      body.torrentOverride = {
        torrent_url: torrent.torrent_url ?? null,
        magnet     : torrent.magnet      ?? null,
        infohash   : torrent.infohash    ?? null,
        file_index : torrent.file_index  ?? null,
        file_path  : torrent.file_path   ?? null,
      }
    }
    const res = await fetch('/api/requests', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    })
    if (res.ok) {
      myRequest.value = await res.json()
      toast('Épisode demandé', 'success')
    } else {
      const d = await res.json()
      toast(d.error ?? "Impossible d'envoyer la demande", 'error')
    }
  } catch { toast('Impossible de contacter le serveur', 'error') }
}

async function submitRequest() {
  if (!data.value) return
  try {
    const res = await fetch('/api/requests', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        serieId  : Number(route.params.id),
        serieName: data.value.serie.title,
        seasons  : requestSeasons.value,
      }),
    })
    if (res.ok) {
      myRequest.value  = await res.json()
      requestModal.value = false
      toast('Demande envoyée', 'success')
    } else {
      const d = await res.json()
      toast(d.error ?? "Impossible d'envoyer la demande", 'error')
    }
  } catch { toast('Impossible de contacter le serveur', 'error') }
}

// Portée de ma demande en cours : « saisons 3 et 4 », « 2 épisodes »
const myScopeLabel = computed(() => {
  const r = myRequest.value?.requesters?.find((r: any) => r.userId === auth.userId)
  if (!r) return ''
  if ((r.episodes ?? []).length > 0) return plural(r.episodes.length, 'épisode')
  return seasonsLabel(r.seasons).toLowerCase()
})

const collapsedSeasons   = ref<Set<number>>(new Set())
const downloading        = ref<string[]>([])
const downloaded         = ref<string[]>([])
const manualImportOpen   = ref(false)
const organizedByEpisode = ref<Record<string, any>>({})
const mediaPath          = ref('/')
const nfoSupport         = ref(false)
const epActionLoading    = ref<Record<number, boolean>>({})
const unimportSerieModal = ref(false)
const deleteSerieFiles   = ref(false)
const downloadMenuOpen   = ref(false)
const moreMenuOpen       = ref(false)
const downloadingAll     = ref(false)
const downloadingSeason  = ref<Record<number, boolean>>({})
const rssSync            = ref(false)
const folderStatus       = ref<{ expected: string; current: { path: string; entries: number; exists: boolean }[] } | null>(null)
const renamingFolder     = ref(false)

const basename      = (p: string) => p.split(/[\\/]/).pop() ?? p
const staleFolders  = computed(() => folderStatus.value?.current.filter(f => f.exists && f.path !== folderStatus.value?.expected) ?? [])
const folderTarget  = computed(() => folderStatus.value ? basename(folderStatus.value.expected) : '')

export interface ActiveTorrent { hash: string; progress: number; state: string; files?: { index: number; progress: number }[]; save_path?: string; name?: string }
const activeTorrents = ref<ActiveTorrent[]>([])
let pollTimer: ReturnType<typeof setInterval> | null = null

// État au poll précédent, pour repérer les téléchargements terminés
const _prevTorrentStates  = new Map<string, string>()
const _prevFileProgresses = new Map<string, number>()
const _recentlyOrganized  = new Set<string>()           // hash:fileIndex ou hash seul

const data = computed(() => store.currentSerie)

const seasonCount    = computed(() => data.value?.seasons.filter(s => s.season_number > 0).length ?? 0)
const episodeCount   = computed(() => data.value?.seasons.reduce((n, s) => n + s.episodes.length, 0) ?? 0)
const organizedCount = computed(() => data.value?.seasons.reduce((n, s) => n + s.episodes.filter(e => e.organized).length, 0) ?? 0)
const allOrganized   = computed(() => episodeCount.value > 0 && organizedCount.value >= episodeCount.value)

const canRequestMore = computed(() => {
  if (!data.value || allOrganized.value) return false
  if (!myRequest.value) return true
  return data.value.seasons.some(s => s.organized_state !== 'complete' && !requestedSeasonNumbers.value.includes(s.season_number))
})

// ── Intégrales ──
function integraleGroupLabels(): string[] {
  const torrents = data.value?.torrents_integrale ?? []
  const names = torrents.map((t: any) => t.torrent_name ?? null)
  const allPresent = names.every((n: any) => n !== null && String(n).trim() !== '')
  const allUnique  = allPresent && new Set(names).size === names.length
  if (allUnique) return names as string[]
  return torrents.map((t: any, i: number) => {
    const raw = t.raw ?? ''
    if (raw) return raw.length > 65 ? raw.slice(0, 65) + '…' : raw
    return `Intégrale ${i + 1}`
  })
}

// Épisodes déjà importés : évite de retélécharger une autre version (x264/x265)
const organizedEpisodeIds = computed(() => {
  const ids = new Set<number>()
  for (const season of data.value?.seasons ?? [])
    for (const ep of season.episodes)
      if (ep.organized) ids.add(ep.id)
  return ids
})

function integraleEpisodeCoverage(integraleIndex: number): Set<number> {
  const covered = new Set<number>()
  const t = data.value?.torrents_integrale[integraleIndex]
  if (!t || !data.value) return covered
  const hash = t.infohash?.toLowerCase() ?? extractHash(t)
  if (!hash) return covered
  for (const season of data.value.seasons)
    for (const ep of season.episodes)
      if (ep.torrents?.some((et: any) => (et.infohash ?? extractHash(et)) === hash))
        covered.add(ep.id)
  return covered
}

function hasUncoveredByIntegrale(integraleIndex: number): boolean {
  if (!data.value) return false
  const covered = integraleEpisodeCoverage(integraleIndex)
  for (const season of data.value.seasons)
    for (const ep of season.episodes)
      if (ep.available && !ep.organized && !covered.has(ep.id)) return true
  return false
}

// ── État local ──
function isDownloading(key: string) { return downloading.value.includes(key) }
function isDownloaded(key: string)  { return downloaded.value.includes(key) }
function addDownloading(key: string) { if (!downloading.value.includes(key)) downloading.value.push(key) }
function removeDownloading(key: string) { downloading.value = downloading.value.filter(k => k !== key) }
function addDownloaded(key: string)    { if (!downloaded.value.includes(key)) downloaded.value.push(key) }
function removeDownloaded(key: string) { downloaded.value = downloaded.value.filter(k => k !== key) }
function clearEpDownloaded(ep: any) {
  removeDownloaded(`ep-${ep.id}`)
  const count = ep.torrents?.length ?? 0
  for (let i = 0; i < count; i++) removeDownloaded(`ep-${ep.id}-${i}`)
}
function extractHash(torrent: any): string | null {
  if (torrent?.infohash) return torrent.infohash.toLowerCase()
  if (!torrent?.magnet) return null
  const m = torrent.magnet.match(/xt=urn:btih:([a-fA-F0-9]{40})/i)
  return m ? m[1].toLowerCase() : null
}
function isAlreadyQueued(torrent: any): boolean {
  // Fichier d'un pack : le hash ne dit pas si ce fichier précis est en cours
  if (torrent?.file_index != null) return false
  const hash = extractHash(torrent)
  if (!hash) return false
  return activeTorrents.value.some(t => t.hash.toLowerCase() === hash.toLowerCase())
}

// ── Chargement ──
function load() { store.fetchSerieDetail(Number(route.params.id)) }

async function fetchOrganized() {
  try {
    const res = await fetch(`/api/organized/${route.params.id}`, { credentials: 'include' })
    if (res.ok) organizedByEpisode.value = await res.json()
  } catch {}
  fetchFolderStatus()
}

async function fetchFolderStatus() {
  try {
    const res = await fetch(`/api/organized/${route.params.id}/folder`, { credentials: 'include' })
    folderStatus.value = res.ok ? await res.json() : null
  } catch {}
}

async function renameFolder() {
  if (!confirm(`Renommer le dossier en « ${folderTarget.value} » ? Les fichiers déjà présents à destination ne seront pas écrasés.`)) return
  renamingFolder.value = true
  try {
    const res = await fetch(`/api/organized/${route.params.id}/folder`, { method: 'POST', credentials: 'include' })
    const d = await res.json()
    if (!res.ok) { toast(d.error ?? 'Impossible de renommer le dossier', 'error'); return }
    toast(`Dossier renommé (${plural(d.moved, 'fichier déplacé', 'fichiers déplacés')})`, 'success')
    await fetchOrganized()
  } catch { toast('Impossible de contacter le serveur', 'error') }
  finally { renamingFolder.value = false }
}

async function fetchSettings() {
  try {
    const res = await fetch('/api/settings', { credentials: 'include' })
    if (res.ok) { const s = await res.json(); mediaPath.value = s.mediaPath || '/'; nfoSupport.value = !!s.nfoSupport }
  } catch {}
}

async function fetchRssSync() {
  try {
    const res = await fetch(`/api/rss-sync/${route.params.id}`, { credentials: 'include' })
    if (res.ok) { const d = await res.json(); rssSync.value = !!d.synced }
  } catch {}
}

async function toggleRssSync() {
  const serieId   = Number(route.params.id)
  const serieName = data.value?.serie?.title ?? String(serieId)
  try {
    if (rssSync.value) {
      const res = await fetch(`/api/rss-sync/${serieId}`, { method: 'DELETE', credentials: 'include' })
      if (res.ok) { rssSync.value = false; toast('Surveillance désactivée', 'success') }
    } else {
      const res = await fetch(`/api/rss-sync/${serieId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ serieName }),
      })
      if (res.ok) { rssSync.value = true; toast('Surveillance activée : les nouveaux épisodes seront téléchargés automatiquement', 'success') }
    }
  } catch { toast('Impossible de mettre à jour la surveillance', 'error') }
}

async function fetchActiveDownloads() {
  try {
    const res = await fetch('/api/downloads', { credentials: 'include' })
    if (!res.ok) return
    const list: any[] = await res.json()

    const isFirstPoll = _prevTorrentStates.size === 0
    // Un seul import par torrent, même si plusieurs de ses fichiers viennent de se terminer
    const toOrganize  = new Map<string, any>()

    for (const t of list) {
      const prevState = _prevTorrentStates.get(t.hash)

      // Fichier terminé (client avec progression par fichier)
      if (t.files) {
        for (const f of t.files) {
          const key     = `${t.hash}:${f.index}`
          const prevProg = _prevFileProgresses.get(key)
          _prevFileProgresses.set(key, f.progress)
          if (!isFirstPoll && prevProg !== undefined && prevProg < 1 && f.progress >= 1 && !_recentlyOrganized.has(key)) {
            _recentlyOrganized.add(key)
            toOrganize.set(t.hash, t)
          }
        }
      }

      // Torrent entier terminé (client sans progression par fichier)
      if (!isFirstPoll && t.state === 'seeding' && prevState !== undefined && prevState !== 'seeding' && !_recentlyOrganized.has(t.hash)) {
        _recentlyOrganized.add(t.hash)
        toOrganize.set(t.hash, t)
      }

      _prevTorrentStates.set(t.hash, t.state)
    }

    for (const t of toOrganize.values()) triggerOrganize(t)

    activeTorrents.value = list.map(t => ({
      hash     : t.hash,
      progress : t.progress ?? 0,
      state    : t.state,
      files    : t.files,
      save_path: t.save_path,
      name     : t.name,
    }))
  } catch {}
}

async function triggerOrganize(torrent: any) {
  if (!torrent?.hash || !torrent?.name || !torrent?.save_path) return
  try {
    const res = await fetch('/api/organize', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ hash: torrent.hash, name: torrent.name, save_path: torrent.save_path }),
    })
    if (res.ok) {
      const result = await res.json()
      if (result.done > 0) {
        toast(`${plural(result.done, 'épisode importé', 'épisodes importés')} automatiquement`, 'success')
        await fetchOrganized()
        load()
      }
    }
  } catch {}
}

function openManualImport() { fetchOrganized(); manualImportOpen.value = true }

// ── Téléchargement ──
async function download(key: string, torrent_url: string | null, magnet: string | null, file_index?: number | null, file_path?: string | null, infohash?: string | null) {
  if (isDownloading(key) || isDownloaded(key)) return
  addDownloading(key)
  const result = await store.download(torrent_url, magnet, file_index, file_path, infohash)
  removeDownloading(key)
  if (result.success) { addDownloaded(key); toast('Téléchargement lancé', 'success'); fetchActiveDownloads() }
  else toast(result.error ?? 'Impossible de lancer le téléchargement', 'error')
}

type DlItem = { key: string; torrent_url: string | null; magnet: string | null; file_index?: number | null; file_path?: string | null; infohash?: string | null }

// Reste à envoyer : une intégrale (ou toutes), puis packs et épisodes non couverts
function collectDownloadables(integraleIndex?: number): DlItem[] {
  if (!data.value) return []
  const result: DlItem[] = []
  const covered = new Set<number>()

  data.value.torrents_integrale.forEach((t: any, i: number) => {
    if (isAlreadyQueued(t) || isDownloaded(`integrale-${i}`))
      for (const id of integraleEpisodeCoverage(i)) covered.add(id)
  })

  const integrales: { t: any; i: number }[] = integraleIndex !== undefined
    ? [{ t: data.value.torrents_integrale[integraleIndex], i: integraleIndex }]
    : data.value.torrents_integrale.map((t: any, i: number) => ({ t, i }))

  for (const { t, i } of integrales) {
    if (!t) continue

    const hash = t.infohash?.toLowerCase() ?? extractHash(t)
    const coveredByThis = new Set<number>()
    if (hash)
      for (const season of data.value!.seasons)
        for (const ep of season.episodes)
          if (ep.torrents?.some((et: any) => (et.infohash ?? extractHash(et)) === hash))
            coveredByThis.add(ep.id)

    const bringsSomething = coveredByThis.size === 0
      || [...coveredByThis].some(id => !covered.has(id) && !organizedEpisodeIds.value.has(id))

    if (bringsSomething && !isAlreadyQueued(t) && !isDownloaded(`integrale-${i}`))
      result.push({ key: `integrale-${i}`, torrent_url: t.torrent_url, magnet: t.magnet })

    for (const id of coveredByThis) covered.add(id)
  }

  for (const season of data.value.seasons) {
    if (!season.torrents?.length || season.organized_state === 'complete') continue
    const hasUncovered = season.episodes.some((ep: any) => ep.available && !ep.organized && !covered.has(ep.id))
    if (!hasUncovered) continue
    const packKey = (i: number) => (i === 0 ? `season-${season.id}` : `season-${season.id}-${i}`)
    const alreadyHandled = season.torrents.some((t: any, i: number) => isAlreadyQueued(t) || isDownloaded(packKey(i)))
    const t = season.torrents[0]
    if (!alreadyHandled && t) result.push({ key: packKey(0), torrent_url: t.torrent_url, magnet: t.magnet })
    for (const ep of season.episodes) covered.add(ep.id)
  }

  for (const season of data.value.seasons)
    for (const ep of season.episodes) {
      if (!ep.torrent || !ep.available || ep.organized || isAlreadyQueued(ep.torrent) || isDownloaded(`ep-${ep.id}`) || covered.has(ep.id)) continue
      result.push({ key: `ep-${ep.id}`, torrent_url: ep.torrent.torrent_url, magnet: ep.torrent.magnet, file_index: ep.torrent.file_index ?? null, file_path: ep.torrent.file_path ?? null, infohash: ep.torrent.infohash ?? null })
    }

  return result
}

// Même calcul que downloadAll : jamais de bouton sans effet
const hasSomethingToDownload = computed(() => collectDownloadables().length > 0)

async function downloadAll(integraleIndex?: number) {
  downloadingAll.value = true
  const torrents = collectDownloadables(integraleIndex)
  let sent = 0
  for (const t of torrents) {
    try { const r = await store.download(t.torrent_url, t.magnet, t.file_index, t.file_path, t.infohash); if (r.success) { addDownloaded(t.key); sent++ } } catch {}
  }
  downloadingAll.value = false
  if (sent > 0) { toast(`${plural(sent, 'torrent envoyé', 'torrents envoyés')} au client`, 'success'); fetchActiveDownloads() }
  else toast('Aucun nouveau torrent à télécharger', 'success')
}

async function downloadSeason(season: Season, packHash?: string) {
  downloadingSeason.value[season.id] = true
  const torrents: DlItem[] = []
  const seasonAny = season as any
  if (seasonAny.torrents && seasonAny.torrents.length > 0 && seasonAny.organized_state !== 'complete') {
    const packKey = (i: number) => (i === 0 ? `season-${season.id}` : `season-${season.id}-${i}`)
    const alreadyHandled = seasonAny.torrents.some((t: any, i: number) => isAlreadyQueued(t) || isDownloaded(packKey(i)))
    if (!alreadyHandled) {
      const chosen = packHash
        ? seasonAny.torrents.findIndex((t: any) => (t.infohash ?? extractHash(t)) === packHash)
        : 0
      const i = chosen >= 0 ? chosen : 0
      const t = seasonAny.torrents[i]
      torrents.push({ key: packKey(i), torrent_url: t.torrent_url, magnet: t.magnet })
    }
  } else {
    for (const ep of seasonAny.episodes ?? []) {
      const epTorrent = packHash
        ? (ep.torrents?.find((t: any) => (t.infohash ?? extractHash(t)) === packHash) ?? ep.torrent)
        : ep.torrent
      if (!epTorrent || !ep.available || ep.organized || isAlreadyQueued(epTorrent) || isDownloaded(`ep-${ep.id}`)) continue
      torrents.push({ key: `ep-${ep.id}`, torrent_url: epTorrent.torrent_url, magnet: epTorrent.magnet, file_index: epTorrent.file_index ?? null, file_path: epTorrent.file_path ?? null, infohash: epTorrent.infohash ?? null })
    }
  }
  let sent = 0
  for (const t of torrents) {
    try { const r = await store.download(t.torrent_url, t.magnet, t.file_index, t.file_path, t.infohash); if (r.success) { addDownloaded(t.key); sent++ } } catch {}
  }
  downloadingSeason.value[season.id] = false
  if (sent > 0) { toast(`${plural(sent, 'torrent envoyé', 'torrents envoyés')} au client`, 'success'); fetchActiveDownloads() }
  else toast('Aucun nouveau torrent à télécharger pour cette saison', 'success')
}

// ── Actions ──
function toggleSeason(id: number) {
  if (collapsedSeasons.value.has(id)) collapsedSeasons.value.delete(id)
  else collapsedSeasons.value.add(id)
}

function openUnimportSerieModal() { deleteSerieFiles.value = false; unimportSerieModal.value = true }
async function confirmUnimportSerie() { unimportSerieModal.value = false; await unimportSerie(deleteSerieFiles.value) }

async function unimportSeason(season: any, deleteFile: boolean) {
  try {
    const res = await fetch(`/api/organized/${route.params.id}/seasons/${season.id}?deleteFile=${deleteFile}`, { method: 'DELETE', credentials: 'include' })
    if (!res.ok) { const d = await res.json(); toast(d.error ?? 'Impossible de retirer la saison', 'error'); return }
    toast(deleteFile ? 'Saison retirée et fichiers supprimés' : 'Saison retirée de la médiathèque', 'success')
    for (const ep of season.episodes ?? []) clearEpDownloaded(ep)
    removeDownloaded(`season-${season.id}`)
    await fetchOrganized(); load()
  } catch { toast('Impossible de contacter le serveur', 'error') }
}

async function unimportSerie(deleteFile: boolean) {
  try {
    const res = await fetch(`/api/organized/${route.params.id}?deleteFile=${deleteFile}`, { method: 'DELETE', credentials: 'include' })
    if (!res.ok) { const d = await res.json(); toast(d.error ?? 'Impossible de retirer la série', 'error'); return }
    toast(deleteFile ? 'Série retirée et fichiers supprimés' : 'Série retirée de la médiathèque', 'success')
    downloaded.value = []
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
    if (!res.ok) { toast(d.error ?? "Impossible de renommer l'épisode", 'error'); return }
    if (d.renamed) { toast(`Renommé : ${d.new_name}`, 'success'); await fetchOrganized() }
    else toast(d.message ?? 'Nom déjà correct', 'success')
  } catch { toast('Impossible de contacter le serveur', 'error') }
  finally { epActionLoading.value[ep.id] = false }
}

async function unimportEpisode(ep: any, _season: any, deleteFile: boolean) {
  epActionLoading.value[ep.id] = true
  try {
    const res = await fetch(`/api/organized/${route.params.id}/${ep.id}?deleteFile=${deleteFile}`, { method: 'DELETE', credentials: 'include' })
    if (!res.ok) { const d = await res.json(); toast(d.error ?? (deleteFile ? 'Impossible de supprimer le fichier' : "Impossible de retirer l'épisode"), 'error'); return }
    toast(deleteFile ? 'Fichier supprimé' : 'Épisode retiré', 'success')
    clearEpDownloaded(ep)
    await fetchOrganized(); load()
  } catch { toast('Impossible de contacter le serveur', 'error') }
  finally { epActionLoading.value[ep.id] = false }
}

const closeMenus = () => { downloadMenuOpen.value = false; moreMenuOpen.value = false }

onMounted(() => {
  load()
  if (auth.isAdmin) {
    fetchSettings(); fetchOrganized(); fetchActiveDownloads(); fetchRssSync()
    pollTimer = setInterval(fetchActiveDownloads, 5000)
  } else {
    fetchMyRequest()
  }
  document.addEventListener('click', closeMenus)
})
onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
  document.removeEventListener('click', closeMenus)
})
</script>
