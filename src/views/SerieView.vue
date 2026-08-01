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
      <!-- Hero — poster, titre, métadonnées, synopsis -->
      <SerieHero :serie="data.serie" />

      <!-- Barre d'actions admin -->
      <div v-if="auth.isAdmin" class="px-4 md:px-8 py-3 flex items-center justify-between gap-3 border-b border-border flex-wrap">

        <!-- Gauche : gestion bibliothèque -->
        <div class="flex items-center gap-2">
          <!-- Import manuel -->
          <button
              @click="openManualImport"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-accent-muted text-accent border border-accent/20 hover:bg-accent/20 transition"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Import manuel
          </button>

          <!-- Supprimer série -->
          <button
              v-if="Object.keys(organizedByEpisode).length > 0"
              @click="openUnimportSerieModal"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
            </svg>
            Supprimer
          </button>
        </div>

        <!-- Droite : téléchargements -->
        <div class="flex flex-wrap items-center gap-2">
          <!-- Bouton RSS sync -->
          <div class="relative" @click.stop>
            <button
                @click="rssSync ? disableRssSync() : (rssMenuOpen = !rssMenuOpen)"
                :title="rssSync ? 'Surveillance activée — cliquer pour désactiver' : 'Surveiller les nouveaux épisodes'"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition"
                :class="rssSync
                  ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'
                  : 'bg-shell text-muted border-border hover:text-primary hover:bg-hover'"
            >
              <!-- Icône antenne RSS -->
              <svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none">
                <path d="M4 11a9 9 0 0 1 9 9"/>
                <path d="M4 4a16 16 0 0 1 16 16"/>
                <circle cx="5" cy="19" r="1" fill="currentColor" stroke="none"/>
              </svg>
              {{ rssSync ? (rssSyncMultiOnly ? 'Surveillé · MULTI' : 'Surveillé') : 'Surveiller' }}
              <span v-if="!rssSync" class="opacity-70">▾</span>
            </button>

            <!-- Dropdown choix de langue pour la surveillance -->
            <div v-if="rssMenuOpen && !rssSync"
                 class="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl p-1 z-20 w-64 shadow-xl flex flex-col gap-0.5">
              <button
                  class="flex flex-col items-start gap-0.5 px-3 py-2 rounded-lg text-xs text-primary hover:bg-hover transition-colors text-left"
                  @click="chooseRssMode(false)"
              >
                <span class="font-medium">Toutes les releases</span>
                <span class="text-muted">VOSTFR et MULTI, dès leur sortie</span>
              </button>
              <button
                  class="flex flex-col items-start gap-0.5 px-3 py-2 rounded-lg text-xs text-primary hover:bg-hover transition-colors text-left"
                  @click="chooseRssMode(true)"
              >
                <span class="font-medium">MULTI (VF) uniquement 🇫🇷</span>
                <span class="text-muted">Attendre la version avec doublage français</span>
              </button>
            </div>

            <!-- Popup rattrapage : épisodes déjà disponibles -->
            <div v-if="rssCatchupModal" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" @click.self="rssCatchupModal = false">
              <div class="bg-card border border-border rounded-xl w-full max-w-sm p-6 flex flex-col gap-5">
                <div>
                  <p class="text-sm font-semibold text-primary">
                    {{ rssCatchupCount }} épisode{{ rssCatchupCount > 1 ? 's' : '' }} déjà disponible{{ rssCatchupCount > 1 ? 's' : '' }}{{ rssPendingMulti ? ' en MULTI' : '' }}
                  </p>
                  <p class="text-xs text-muted mt-1">
                    Veux-tu les télécharger maintenant, en plus des prochaines sorties{{ rssPendingMulti ? ' MULTI' : '' }} ?
                  </p>
                </div>
                <div class="flex items-center justify-end gap-2">
                  <button
                      class="px-3 py-1.5 text-xs font-medium rounded-lg bg-shell text-muted border border-border hover:text-primary hover:bg-hover transition"
                      @click="enableRssSync(rssPendingMulti, false); rssCatchupModal = false"
                  >
                    Non, juste les nouveautés
                  </button>
                  <button
                      class="px-3 py-1.5 text-xs font-medium rounded-lg bg-accent text-white hover:bg-accent-hover transition"
                      @click="enableRssSync(rssPendingMulti, true); rssCatchupModal = false"
                  >
                    Oui, télécharger
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Bouton unique "Tout télécharger" — dropdown si plusieurs intégrales -->
          <div v-if="hasSomethingToDownload" class="relative" @click.stop>
            <button
                :disabled="downloadingAll"
                class="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-accent text-white hover:bg-accent-hover transition"
                :class="downloadingAll ? 'opacity-50 cursor-not-allowed' : ''"
                @click="data.torrents_integrale.length > 1 ? (downloadMenuOpen = !downloadMenuOpen) : downloadAll()"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" :class="downloadingAll ? 'animate-spin' : ''">
                <path v-if="!downloadingAll" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline v-if="!downloadingAll" points="7 10 12 15 17 10"/><line v-if="!downloadingAll" x1="12" y1="15" x2="12" y2="3"/>
                <path v-else d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-6.36-2.64M3 12a9 9 0 0 1 9-9 9 9 0 0 1 6.36 2.64"/>
              </svg>
              {{ downloadingAll ? 'Envoi…' : 'Tout télécharger' }}
              <span v-if="data.torrents_integrale.length > 1" class="opacity-70">▾</span>
            </button>

            <!-- Dropdown choix d'intégrale -->
            <div v-if="downloadMenuOpen && data.torrents_integrale.length > 1"
                 class="absolute right-0 bottom-full mb-1 bg-card border border-border rounded-xl p-1 z-20 w-56 shadow-xl flex flex-col gap-0.5">
              <button
                  v-for="(t, i) in data.torrents_integrale"
                  :key="i"
                  :disabled="isAlreadyQueued(t) && !hasUncoveredByIntegrale(i)"
                  class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-primary hover:bg-hover transition-colors text-left"
                  :class="(isDownloaded(`integrale-${i}`) && !hasUncoveredByIntegrale(i)) ? 'opacity-40 cursor-not-allowed' : ''"
                  @click="downloadAll(i); downloadMenuOpen = false"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                {{ integraleGroupLabels()[i] }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Barre utilisateur (mode demande) -->
      <div v-if="!auth.isAdmin" class="px-4 md:px-8 py-3 flex items-center justify-between gap-3 border-b border-border flex-wrap">
        <div v-if="myRequest" class="flex items-center gap-3">
          <span class="text-xs px-2 py-1 rounded border" :class="requestStatusClass(myRequest.status)">
            {{ requestStatusLabel(myRequest.status) }}
          </span>
          <span v-if="myRequest.status === 'rejected' && myRequest.rejectionMessage" class="text-xs text-muted">
            {{ myRequest.rejectionMessage }}
          </span>
        </div>
        <div v-else class="text-xs text-muted">Cliquez sur une saison ou un épisode pour faire une demande</div>
        <button
            v-if="!myRequest || myRequest.status === 'rejected' || myRequest.status === 'completed'"
            @click="openRequestModal()"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-accent text-white hover:bg-accent-hover transition"
        >
          Demander la série
        </button>
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
            :request-mode="!auth.isAdmin"
            :requested-seasons="requestedSeasonNumbers"
            :requested-episodes="requestedEpisodeIds"
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

      <!-- Modal demande (utilisateurs) -->
      <Teleport to="body">
        <div v-if="requestModal" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" @click.self="requestModal = false">
          <div class="bg-card border border-border rounded-xl w-full max-w-sm p-6 flex flex-col gap-5">
            <div>
              <p class="text-sm font-semibold text-primary">Demander une série</p>
              <p class="text-xs text-muted mt-1 truncate">{{ data?.serie?.title }}</p>
            </div>
            <div class="flex flex-col gap-2">
              <p class="text-xs text-muted font-medium">Saisons demandées</p>
              <label
                  v-for="season in data?.seasons"
                  :key="season.id"
                  class="flex items-center gap-3 cursor-pointer select-none"
              >
                <input
                    type="checkbox"
                    :value="season.season_number"
                    v-model="requestSeasons"
                    class="w-4 h-4 rounded border-border accent-accent"
                />
                <span class="text-sm text-primary">
                  {{ season.season_number === 0 ? 'Spéciaux' : `Saison ${season.season_number}` }}
                  <span v-if="season.title && season.title !== `Saison ${season.season_number}`" class="text-muted font-normal">— {{ season.title }}</span>
                </span>
              </label>
            </div>
            <div class="flex items-center justify-end gap-2">
              <button @click="requestModal = false" class="btn-secondary text-xs">Annuler</button>
              <button @click="submitRequest" :disabled="requestSeasons.length === 0" class="btn-primary text-xs disabled:opacity-50">
                Envoyer la demande
              </button>
            </div>
          </div>
        </div>
      </Teleport>
    </template>

    <!-- Modal désimport série -->
    <Teleport to="body">
      <div v-if="unimportSerieModal" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" @click.self="unimportSerieModal = false">
        <div class="bg-card border border-border rounded-xl w-full max-w-sm p-6 flex flex-col gap-5">
          <div>
            <p class="text-sm font-semibold text-primary">Supprimer la série</p>
            <p class="text-xs text-muted mt-1 truncate">{{ data?.serie?.title }}</p>
          </div>
          <label class="flex items-center gap-3 cursor-pointer select-none">
            <input type="checkbox" v-model="deleteSerieFiles" class="w-4 h-4 rounded border-border accent-accent" />
            <span class="text-xs text-muted">Supprimer également les fichiers physiques du disque</span>
          </label>
          <div class="flex items-center justify-end gap-2">
            <button @click="unimportSerieModal = false" class="btn-secondary text-xs">Annuler</button>
            <button @click="confirmUnimportSerie" class="px-4 py-2 rounded-lg border border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors text-xs font-medium">
              {{ deleteSerieFiles ? 'Supprimer les fichiers' : 'Supprimer' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal import manuel -->
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
import ManualImportModal from '@/components/ManualImportModal.vue'
import SerieHero from '@/components/serie/SerieHero.vue'
import SerieSeasonCard from '@/components/serie/SerieSeasonCard.vue'
import type { Season } from '@/stores/series'

const route  = useRoute()
const store  = useSeriesStore()
const auth   = useAuthStore()
const { add: toast } = useToast()

// ── Mode demande (utilisateurs non-admin) ─────────────────────
const myRequest      = ref<any>(null)   // demande existante de l'utilisateur pour cette série
const requestModal   = ref(false)
const requestSeasons = ref<number[]>([]) // saisons cochées dans le modal

const requestedSeasonNumbers = computed<number[]>(() => {
  if (!myRequest.value) return []
  const r = myRequest.value.requesters?.find((r: any) => r.userId === auth.userId)
  if (!r) return []
  // seasons=[] ET episodes=[] → toutes les saisons demandées
  // seasons=[] mais episodes=[…] → seulement des épisodes ciblés, pas toute une saison
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
  // Pré-cocher soit la saison cliquée, soit toutes les saisons disponibles
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
      toast('Épisode demandé ✓', 'success')
    } else {
      const d = await res.json()
      toast(d.error ?? 'Erreur', 'error')
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
      toast('Demande envoyée ✓', 'success')
    } else {
      const d = await res.json()
      toast(d.error ?? 'Erreur', 'error')
    }
  } catch { toast('Impossible de contacter le serveur', 'error') }
}

function requestStatusLabel(status: string) {
  return { pending: 'En attente', approved: 'Approuvée', rejected: 'Refusée', completed: 'Disponible' }[status] ?? status
}
function requestStatusClass(status: string) {
  return {
    pending  : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    approved : 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    rejected : 'bg-red-500/10 text-red-400 border-red-500/20',
    completed: 'bg-green-500/10 text-green-400 border-green-500/20',
  }[status] ?? ''
}

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
const downloadingAll     = ref(false)
const downloadingSeason  = ref<Record<number, boolean>>({})
const rssSync            = ref(false)
const rssSyncMultiOnly   = ref(false)
const rssMenuOpen        = ref(false)
const rssCatchupModal    = ref(false)
const rssCatchupCount    = ref(0)
const rssPendingMulti    = ref(false)

export interface ActiveTorrent { hash: string; progress: number; state: string; files?: { index: number; progress: number }[]; save_path?: string; name?: string }
const activeTorrents = ref<ActiveTorrent[]>([])
let pollTimer: ReturnType<typeof setInterval> | null = null

// Suivi des états précédents pour détecter les transitions (download → seeding)
const _prevTorrentStates  = new Map<string, string>()   // hash → state
const _prevFileProgresses = new Map<string, number>()   // hash:index → progress
const _recentlyOrganized  = new Set<string>()           // hash:fileIndex ou hash seul

const data = computed(() => store.currentSerie)

// ── Helpers intégrale ─────────────────────────────────────────
function integraleGroupLabels(): string[] {
  const torrents = data.value?.torrents_integrale ?? []
  const names = torrents.map((t: any) => t.torrent_name ?? null)
  const allPresent = names.every((n: any) => n !== null && String(n).trim() !== '')
  const allUnique  = allPresent && new Set(names).size === names.length
  if (allUnique) return names as string[]
  // Fallback : titre Nyaa brut
  return torrents.map((t: any, i: number) => {
    const raw = t.raw ?? ''
    if (raw) return raw.length > 65 ? raw.slice(0, 65) + '…' : raw
    return `Intégrale ${i + 1}`
  })
}

// Épisodes couverts par une intégrale donnée (hash commun)
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

// Vrai s'il reste des épisodes/saisons non couverts par cette intégrale
function hasUncoveredByIntegrale(integraleIndex: number): boolean {
  if (!data.value) return false
  const covered = integraleEpisodeCoverage(integraleIndex)
  for (const season of data.value.seasons)
    for (const ep of season.episodes)
      if (ep.available && !ep.organized && !covered.has(ep.id)) return true
  return false
}

// ── Helpers d'état ────────────────────────────────────────────
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

async function fetchRssSync() {
  try {
    const res = await fetch(`/api/rss-sync/${route.params.id}`, { credentials: 'include' })
    if (res.ok) { const d = await res.json(); rssSync.value = !!d.synced; rssSyncMultiOnly.value = !!d.multiOnly }
  } catch {}
}

async function disableRssSync() {
  const serieId = Number(route.params.id)
  try {
    const res = await fetch(`/api/rss-sync/${serieId}`, { method: 'DELETE', credentials: 'include' })
    if (res.ok) { rssSync.value = false; rssSyncMultiOnly.value = false; toast('Surveillance désactivée', 'success') }
  } catch { toast('Erreur lors de la mise à jour de la surveillance', 'error') }
}

// Détection langue d'un épisode (miroir de SerieSeasonCard / server rss-sync)
function langOfEp(ep: any): 'MULTI' | 'VOSTFR' | null {
  const sources: string[] = [
    ep.formatted_name ?? '',
    ...((ep.torrents ?? []) as any[]).map((t: any) => `${t.torrent_name ?? ''} ${t.raw ?? ''}`),
  ]
  for (const s of sources) {
    if (!s) continue
    if (/\bMULTI\b/i.test(s)) return 'MULTI'
    if (/\bVOSTFR\b/i.test(s)) return 'VOSTFR'
  }
  return null
}

// Épisodes déjà disponibles (non importés) correspondant au mode choisi
function availableExistingCount(multiOnly: boolean): number {
  if (!data.value) return 0
  let n = 0
  for (const season of data.value.seasons ?? [])
    for (const ep of season.episodes ?? [])
      if (ep.available && !ep.organized && (!multiOnly || langOfEp(ep) === 'MULTI')) n++
  return n
}

// Choix du mode dans le menu Surveiller → popup de rattrapage si du contenu existe déjà
function chooseRssMode(multiOnly: boolean) {
  rssMenuOpen.value = false
  const count = availableExistingCount(multiOnly)
  if (count > 0) {
    rssPendingMulti.value = multiOnly
    rssCatchupCount.value = count
    rssCatchupModal.value = true
  } else {
    enableRssSync(multiOnly, false)
  }
}

async function enableRssSync(multiOnly: boolean, includeExisting: boolean) {
  const serieId   = Number(route.params.id)
  const serieName = data.value?.serie?.title ?? String(serieId)
  try {
    const res = await fetch(`/api/rss-sync/${serieId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ serieName, multiOnly, includeExisting }),
    })
    if (res.ok) {
      rssSync.value = true
      rssSyncMultiOnly.value = multiOnly
      if (includeExisting) {
        toast(multiOnly
          ? `Surveillance activée — téléchargement des ${rssCatchupCount.value} épisode(s) MULTI disponibles lancé ✓`
          : `Surveillance activée — téléchargement des ${rssCatchupCount.value} épisode(s) disponibles lancé ✓`, 'success')
      } else {
        toast(multiOnly
          ? 'Surveillance activée — seules les releases MULTI (VF) seront téléchargées ✓'
          : 'Surveillance activée — les nouveaux épisodes seront téléchargés automatiquement ✓', 'success')
      }
    }
  } catch { toast('Erreur lors de la mise à jour de la surveillance', 'error') }
}

async function fetchActiveDownloads() {
  try {
    const res = await fetch('/api/downloads', { credentials: 'include' })
    if (!res.ok) return
    const list: any[] = await res.json()

    const isFirstPoll = _prevTorrentStates.size === 0

    for (const t of list) {
      const prevState = _prevTorrentStates.get(t.hash)

      // Détecter fichier individuel terminé (progression par fichier)
      if (t.files) {
        for (const f of t.files) {
          const key     = `${t.hash}:${f.index}`
          const prevProg = _prevFileProgresses.get(key)
          _prevFileProgresses.set(key, f.progress)
          if (!isFirstPoll && prevProg !== undefined && prevProg < 1 && f.progress >= 1 && !_recentlyOrganized.has(key)) {
            _recentlyOrganized.add(key)
            triggerOrganize(t)
          }
        }
      }

      // Détecter torrent entier passé en seeding (épisodes standalone sans per-file data)
      if (!isFirstPoll && t.state === 'seeding' && prevState !== undefined && prevState !== 'seeding' && !_recentlyOrganized.has(t.hash)) {
        _recentlyOrganized.add(t.hash)
        triggerOrganize(t)
      }

      _prevTorrentStates.set(t.hash, t.state)
    }

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
        toast(`${result.done} épisode(s) importé(s) automatiquement ✓`, 'success')
        await fetchOrganized()
        load()
      }
    }
  } catch {}
}

function openManualImport() { fetchOrganized(); manualImportOpen.value = true }

// ── Download ──────────────────────────────────────────────────
async function download(key: string, torrent_url: string | null, magnet: string | null, file_index?: number | null, file_path?: string | null, infohash?: string | null) {
  if (isDownloading(key) || isDownloaded(key)) return
  addDownloading(key)
  const result = await store.download(torrent_url, magnet, file_index, file_path, infohash)
  removeDownloading(key)
  if (result.success) { addDownloaded(key); toast('Téléchargement lancé ✓', 'success'); fetchActiveDownloads() }
  else toast(result.error ?? 'Erreur inconnue', 'error')
}

type DlItem = { key: string; torrent_url: string | null; magnet: string | null; file_index?: number | null; file_path?: string | null; infohash?: string | null }

// Construit la liste de tout ce qui doit être téléchargé.
// integraleIndex : si défini, utilise uniquement cette intégrale (+ épisodes non couverts).
//                 si omis, utilise toutes les intégrales disponibles.
function collectDownloadables(integraleIndex?: number): DlItem[] {
  if (!data.value) return []
  const result: DlItem[] = []
  const covered = new Set<number>()

  // ── 1. Intégrale(s) ───────────────────────────────────────────
  const integrales: { t: any; i: number }[] = integraleIndex !== undefined
    ? [{ t: data.value.torrents_integrale[integraleIndex], i: integraleIndex }]
    : data.value.torrents_integrale.map((t: any, i: number) => ({ t, i }))

  for (const { t, i } of integrales) {
    if (!t) continue
    if (!isAlreadyQueued(t) && !isDownloaded(`integrale-${i}`))
      result.push({ key: `integrale-${i}`, torrent_url: t.torrent_url, magnet: t.magnet })
    // Marquer les épisodes couverts par CETTE intégrale uniquement
    const hash = t.infohash?.toLowerCase() ?? extractHash(t)
    if (hash)
      for (const season of data.value!.seasons)
        for (const ep of season.episodes)
          if (ep.torrents?.some((et: any) => (et.infohash ?? extractHash(et)) === hash))
            covered.add(ep.id)
  }

  // ── 2. Packs saison non couverts ──────────────────────────────
  for (const season of data.value.seasons) {
    if (!season.torrents?.length || season.organized_state === 'complete') continue
    // Skiper si tous les épisodes disponibles sont déjà couverts par l'intégrale
    const hasUncovered = season.episodes.some((ep: any) => ep.available && !ep.organized && !covered.has(ep.id))
    if (!hasUncovered) continue
    let addedAny = false
    season.torrents.forEach((t: any, i: number) => {
      const key = i === 0 ? `season-${season.id}` : `season-${season.id}-${i}`
      if (!isAlreadyQueued(t) && !isDownloaded(key)) { result.push({ key, torrent_url: t.torrent_url, magnet: t.magnet }); addedAny = true }
    })
    if (addedAny) for (const ep of season.episodes) covered.add(ep.id)
  }

  // ── 3. Épisodes individuels non couverts ─────────────────────
  for (const season of data.value.seasons)
    for (const ep of season.episodes) {
      if (!ep.torrent || !ep.available || ep.organized || isAlreadyQueued(ep.torrent) || isDownloaded(`ep-${ep.id}`) || covered.has(ep.id)) continue
      result.push({ key: `ep-${ep.id}`, torrent_url: ep.torrent.torrent_url, magnet: ep.torrent.magnet, file_index: ep.torrent.file_index ?? null, file_path: ep.torrent.file_path ?? null, infohash: ep.torrent.infohash ?? null })
    }

  return result
}

// Le bouton "Tout télécharger" s'affiche s'il y a quoi que ce soit à lancer
const hasSomethingToDownload = computed(() => {
  if (!data.value) return false
  if (data.value.torrents_integrale.some((t: any, i: number) => !isAlreadyQueued(t) && !isDownloaded(`integrale-${i}`))) return true
  for (const season of data.value.seasons) {
    if (season.torrents?.length && season.organized_state !== 'complete' &&
        season.torrents.some((t: any, i: number) => !isAlreadyQueued(t) && !isDownloaded(i === 0 ? `season-${season.id}` : `season-${season.id}-${i}`))) return true
    for (const ep of season.episodes)
      if (ep.torrent && ep.available && !ep.organized && !isAlreadyQueued(ep.torrent) && !isDownloaded(`ep-${ep.id}`)) return true
  }
  return false
})

async function downloadAll(integraleIndex?: number) {
  downloadingAll.value = true
  const torrents = collectDownloadables(integraleIndex)
  let sent = 0
  for (const t of torrents) {
    try { const r = await store.download(t.torrent_url, t.magnet, t.file_index, t.file_path, t.infohash); if (r.success) { addDownloaded(t.key); sent++ } } catch {}
  }
  downloadingAll.value = false
  if (sent > 0) { toast(`${sent} torrent(s) envoyé(s) ✓`, 'success'); fetchActiveDownloads() }
  else toast('Aucun nouveau torrent à télécharger', 'success')
}

async function downloadSeason(season: Season, packHash?: string) {
  downloadingSeason.value[season.id] = true
  const torrents: { key: string; torrent_url: string | null; magnet: string | null; file_index?: number | null; file_path?: string | null }[] = []
  const seasonAny = season as any
  if (seasonAny.torrents && seasonAny.torrents.length > 0 && seasonAny.organized_state !== 'complete') {
    seasonAny.torrents.forEach((t: any, i: number) => {
      const key = i === 0 ? `season-${season.id}` : `season-${season.id}-${i}`
      if (!isAlreadyQueued(t) && !isDownloaded(key)) {
        torrents.push({ key, torrent_url: t.torrent_url, magnet: t.magnet })
      }
    })
  } else {
    for (const ep of seasonAny.episodes ?? []) {
      // Si un hash de pack est précisé (choix depuis dropdown), utiliser le torrent correspondant
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
  if (sent > 0) { toast(`${sent} torrent(s) envoyé(s) ✓`, 'success'); fetchActiveDownloads() }
  else toast('Aucun nouveau torrent à télécharger pour cette saison', 'success')
}

// ── Actions ───────────────────────────────────────────────────
function toggleSeason(id: number) {
  if (collapsedSeasons.value.has(id)) collapsedSeasons.value.delete(id)
  else collapsedSeasons.value.add(id)
}

function openUnimportSerieModal() { deleteSerieFiles.value = false; unimportSerieModal.value = true }
async function confirmUnimportSerie() { unimportSerieModal.value = false; await unimportSerie(deleteSerieFiles.value) }

async function unimportSeason(season: any, deleteFile: boolean) {
  try {
    const res = await fetch(`/api/organized/${route.params.id}/seasons/${season.id}?deleteFile=${deleteFile}`, { method: 'DELETE', credentials: 'include' })
    if (!res.ok) { const d = await res.json(); toast(d.error ?? 'Erreur désimport saison', 'error'); return }
    const d = await res.json()
    toast(`${d.removed} épisode(s) désimporté(s) ✓`, 'success')
    for (const ep of season.episodes ?? []) clearEpDownloaded(ep)
    removeDownloaded(`season-${season.id}`)
    await fetchOrganized(); load()
  } catch { toast('Impossible de contacter le serveur', 'error') }
}

async function unimportSerie(deleteFile: boolean) {
  try {
    const res = await fetch(`/api/organized/${route.params.id}?deleteFile=${deleteFile}`, { method: 'DELETE', credentials: 'include' })
    if (!res.ok) { const d = await res.json(); toast(d.error ?? 'Erreur désimport', 'error'); return }
    const d = await res.json()
    toast(`${d.removed} épisode(s) désimporté(s) ✓`, 'success')
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
    clearEpDownloaded(ep)
    await fetchOrganized(); load()
  } catch { toast('Impossible de contacter le serveur', 'error') }
  finally { epActionLoading.value[ep.id] = false }
}

const closeMenus = () => { downloadMenuOpen.value = false; rssMenuOpen.value = false }

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
