<template>
  <div class="px-4 md:px-10 pt-[26px] pb-12">
    <div class="max-w-[1400px] flex flex-col gap-4">

      <header data-tour="activity-header" class="flex items-center justify-between gap-x-4 gap-y-3 flex-wrap min-h-11">
        <div class="flex items-baseline gap-3.5 flex-wrap">
          <h1 class="page-title tracking-[0.01em]">Activité</h1>
          <span class="flex items-center gap-[7px] text-meta text-secondary">
            <span class="w-1.5 h-1.5 rounded-full" :class="polling ? 'bg-ok animate-pulse' : 'bg-muted'" />
            {{ polling ? 'Actualisation auto' : 'Actualisation en pause' }}<template v-if="lastUpdate"> · mise à jour {{ sinceUpdate }}</template>
          </span>
        </div>
        <div class="flex items-center gap-2.5">
          <button @click="importAll" :disabled="importingAll || toImportCount === 0" class="btn-primary pointer-fine:h-[38px]">
            <Loader v-if="importingAll" :size="15" class="animate-spin" />
            <Upload v-else :size="15" :stroke-width="2.25" />
            Tout importer<template v-if="toImportCount > 0"> · {{ toImportCount }}</template>
          </button>
          <button @click="fetchTorrents" :disabled="loading" class="btn-icon pointer-fine:h-[38px] pointer-fine:w-[38px]" title="Actualiser" aria-label="Actualiser">
            <RefreshCw :size="16" :class="{ 'animate-spin': loading }" />
          </button>
          <button @click="togglePolling" class="btn-icon pointer-fine:h-[38px] pointer-fine:w-[38px]" :title="polling ? 'Suspendre l\'actualisation' : 'Reprendre l\'actualisation'" :aria-label="polling ? 'Suspendre l\'actualisation' : 'Reprendre l\'actualisation'">
            <Pause v-if="polling" :size="16" />
            <Play v-else :size="16" />
          </button>
        </div>
      </header>

      <DownloadsToolbar
          v-model:search="search"
          v-model:active-tab="activeTab"
          v-model:seeding-only="seedingOnly"
          v-model:hide-imported="hideImported"
          :active-sort="activeSort"
          :sort-dir="sortDir"
          :columns="columns"
          :tabs="tabs"
          :column-options="columnOptions"
          :sort-options="sortOptions"
          @sort="setSort"
          @toggle-col="(key) => (columns as any)[key] = !(columns as any)[key]"
      />

      <div v-if="noClients" class="card flex flex-col items-center gap-3 py-16 text-center">
        <p class="font-display text-xl font-bold text-primary">Aucun client torrent configuré</p>
        <p class="text-body text-muted">Ajoutez un client pour suivre les téléchargements FanKarr.</p>
        <RouterLink to="/settings/download-client" class="btn-secondary btn-sm mt-1">Configurer un client</RouterLink>
      </div>

      <div v-else-if="loading && torrents.length === 0" class="flex items-center justify-center gap-2 py-16 text-muted text-body">
        <div class="w-4 h-4 border border-border border-t-accent rounded-full animate-spin" />
        Chargement…
      </div>

      <div v-else-if="visibleTorrents.length === 0" class="card flex flex-col items-center gap-2 py-16 text-center">
        <p class="font-display text-xl font-bold text-primary">{{ emptyState.title }}</p>
        <p class="text-body text-muted">{{ emptyState.hint }}</p>
      </div>

      <div v-else class="flex flex-col gap-2.5">
        <TorrentCard
            v-for="t in visibleTorrents"
            :key="t.hash"
            :torrent="t"
            :columns="columns"
            :poster="posterOf(t.serieId)"
            :auto-import="schedule?.autoImport ?? true"
            :auto-import-in="autoImportIn"
            :importing="!!importing[t.hash]"
            :deleting="!!deleting[t.hash]"
            :show-confirm-delete="confirmDelete === t.hash"
            @import="importTorrent"
            @delete="(torrent, withFiles) => deleteTorrent(torrent, withFiles)"
            @toggle-confirm="(hash) => { confirmDelete = hash }"
        />
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import { Loader, Pause, Play, RefreshCw, Upload } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
import { useSeriesStore } from '@/stores/series'
import { plural } from '@/utils/format'
import TorrentCard from '@/components/downloads/TorrentCard.vue'
import DownloadsToolbar, { type ActivityTab } from '@/components/downloads/DownloadsToolbar.vue'

const { add: toast } = useToast()
const seriesStore = useSeriesStore()

const torrents        = ref<any[]>([])
const loading         = ref(true)
const polling         = ref(true)
const noClients       = ref(false)
const importing       = ref<Record<string, boolean>>({})
const importingAll    = ref(false)
const confirmDelete   = ref<string | null>(null)
const deleting        = ref<Record<string, boolean>>({})
const activeTab       = ref<string>('all')
const hideImported    = ref(false)
const seedingOnly     = ref(false)
const search          = ref('')
const activeSort      = ref<'none' | 'name' | 'size' | 'progress' | 'state' | 'ratio'>('none')
const sortDir         = ref<'asc' | 'desc'>('asc')
const lastUpdate      = ref<number | null>(null)
const now             = ref(Date.now())
const schedule        = ref<{ autoImport: boolean; nextRunAt: string | null } | null>(null)

const columns = ref({ client: true, size: true, ratio: true, uploaded: true, upspeed: true })
const columnOptions = [
  { key: 'client',   label: 'Client' },
  { key: 'size',     label: 'Taille / téléchargé' },
  { key: 'ratio',    label: 'Ratio' },
  { key: 'uploaded', label: 'Envoyé (total)' },
  { key: 'upspeed',  label: "Vitesse d'envoi" },
]
const sortOptions = [
  { label: 'Nom',         value: 'name'     },
  { label: 'Taille',      value: 'size'     },
  { label: 'Progression', value: 'progress' },
  { label: 'État',        value: 'state'    },
  { label: 'Ratio',       value: 'ratio'    },
]

let pollInterval: ReturnType<typeof setInterval> | null = null
let clockInterval: ReturnType<typeof setInterval> | null = null

// ── Onglets ──
const isActive   = (t: any) => ['downloading', 'paused', 'checking', 'error'].includes(t.state)
const isDone     = (t: any) => t.state === 'seeding' || t.state === 'unknown'
const isToImport = (t: any) => isDone(t) && t.organizeState !== 'done'
const hasErrors  = (t: any) => t.state === 'error' || (t.errorFiles?.length ?? 0) > 0

const tabPredicates: Record<string, (t: any) => boolean> = {
  'all'      : () => true,
  'active'   : isActive,
  'done'     : isDone,
  'to-import': isToImport,
  'errors'   : hasErrors,
}

const tabs = computed<ActivityTab[]>(() => [
  { value: 'all',       label: 'Tout',       count: torrents.value.length },
  { value: 'active',    label: 'En cours',   count: torrents.value.filter(isActive).length, tone: 'accent' },
  { value: 'done',      label: 'Terminés',   count: torrents.value.filter(isDone).length },
  { value: 'to-import', label: 'À importer', count: torrents.value.filter(isToImport).length },
  { value: 'errors',    label: 'Erreurs',    count: torrents.value.filter(hasErrors).length, tone: 'err' },
])

const toImportCount = computed(() => torrents.value.filter(isToImport).length)

const visibleTorrents = computed(() => {
  let list = torrents.value.filter(tabPredicates[activeTab.value] ?? tabPredicates.all!)
  if (seedingOnly.value)  list = list.filter(t => !isDone(t) || t.state === 'seeding')
  if (hideImported.value) list = list.filter(t => !isDone(t) || t.organizeState !== 'done')
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter(t => t.name.toLowerCase().includes(q) || (t.serieName ?? '').toLowerCase().includes(q))
  }
  if (activeSort.value !== 'none') {
    const dir = sortDir.value === 'asc' ? 1 : -1
    list = [...list].sort((a, b) => {
      switch (activeSort.value) {
        case 'name'    : return a.name.localeCompare(b.name, 'fr') * dir
        case 'size'    : return (a.size - b.size) * dir
        case 'progress': return (a.progress - b.progress) * dir
        case 'state'   : return a.state.localeCompare(b.state) * dir
        case 'ratio'   : return ((a.ratio ?? 0) - (b.ratio ?? 0)) * dir
        default        : return 0
      }
    })
  } else {
    const rank = (t: any) => isActive(t) ? 0 : isToImport(t) ? 1 : 2
    list = [...list].sort((a, b) => rank(a) - rank(b))
  }
  return list
})

const emptyState = computed(() => ({
  'active'   : { title: 'Aucun téléchargement en cours', hint: 'Les torrents envoyés par FanKarr apparaîtront ici.' },
  'done'     : { title: 'Aucun torrent terminé', hint: hideImported.value ? 'Tous les torrents terminés sont importés.' : '' },
  'to-import': { title: 'Rien à importer', hint: 'Tous les torrents terminés sont dans la médiathèque.' },
  'errors'   : { title: 'Aucune erreur', hint: "Ni le client ni l'import ne signalent de problème." },
} as Record<string, { title: string; hint: string }>)[activeTab.value] ?? { title: 'Aucun torrent', hint: search.value ? 'Aucun torrent ne correspond au filtre.' : 'Les torrents envoyés par FanKarr apparaîtront ici.' })

// ── Présentation ──
const seriesById = computed(() => new Map(seriesStore.series.map(s => [s.id, s])))
const posterOf   = (id: number | undefined) => (id != null ? seriesById.value.get(id)?.poster_image : null) ?? null

const sinceUpdate = computed(() => {
  const s = Math.max(0, Math.round((now.value - (lastUpdate.value ?? now.value)) / 1000))
  return s < 60 ? `il y a ${s} s` : `il y a ${Math.floor(s / 60)} min`
})

const autoImportIn = computed(() => {
  if (!schedule.value?.autoImport || !schedule.value.nextRunAt) return ''
  const min = Math.ceil((new Date(schedule.value.nextRunAt).getTime() - now.value) / 60_000)
  return min <= 0 ? 'imminent' : `dans ${min} min`
})

function setSort(val: string) {
  if (activeSort.value === val) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else { activeSort.value = val as typeof activeSort.value; sortDir.value = 'asc' }
}

// ── Chargement ──
async function fetchTorrents() {
  loading.value = true
  try {
    const res = await fetch('/api/downloads', { credentials: 'include' })
    if (res.status === 503) { noClients.value = true; return }
    if (!res.ok) return
    torrents.value   = await res.json()
    noClients.value  = false
    lastUpdate.value = Date.now()
  } catch {} finally { loading.value = false }
  fetchSchedule()
}

async function fetchSchedule() {
  try {
    const res = await fetch('/api/organize/schedule', { credentials: 'include' })
    if (res.ok) schedule.value = await res.json()
  } catch {}
}

function startPolling() { fetchTorrents(); pollInterval = setInterval(fetchTorrents, 60_000) }
function stopPolling()  { if (pollInterval) { clearInterval(pollInterval); pollInterval = null } }
function togglePolling() { polling.value = !polling.value; polling.value ? startPolling() : stopPolling() }

// ── Actions ──
async function importTorrent(torrent: any) {
  importing.value[torrent.hash] = true
  try {
    const res = await fetch('/api/organize', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ hash: torrent.hash, save_path: torrent.save_path, name: torrent.name }),
    })
    if (res.ok) { toast(`« ${torrent.name} » importé`, 'success'); await fetchTorrents() }
    else { const { error } = await res.json(); toast(error ?? `Impossible d'importer « ${torrent.name} »`, 'error') }
  } catch { toast('Impossible de contacter le serveur', 'error') }
  finally { importing.value[torrent.hash] = false }
}

async function importAll() {
  const toImport = torrents.value.filter(isToImport)
  if (toImport.length === 0) { toast('Tous les torrents sont déjà importés', 'success'); return }
  importingAll.value = true
  let done = 0, errors = 0
  for (const t of toImport) {
    try {
      const res = await fetch('/api/organize', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ hash: t.hash, save_path: t.save_path, name: t.name }),
      })
      res.ok ? done++ : errors++
    } catch { errors++ }
  }
  importingAll.value = false
  await fetchTorrents()
  errors === 0
    ? toast(plural(done, 'torrent importé', 'torrents importés'), 'success')
    : toast(`${plural(done, 'torrent importé', 'torrents importés')}, ${plural(errors, 'erreur')}`, 'error')
}

async function deleteTorrent(torrent: any, withFiles: boolean) {
  deleting.value[torrent.hash] = true
  try {
    const res = await fetch(`/api/torrent/${torrent.hash}?deleteFiles=${withFiles}`, { method: 'DELETE', credentials: 'include' })
    if (res.ok) { toast(`« ${torrent.name} » supprimé`, 'success'); confirmDelete.value = null; await fetchTorrents() }
    else toast('Impossible de supprimer le torrent', 'error')
  } catch { toast('Impossible de contacter le serveur', 'error') }
  finally { deleting.value[torrent.hash] = false }
}

onMounted(() => {
  if (seriesStore.series.length === 0) seriesStore.fetchSeries()
  startPolling()
  clockInterval = setInterval(() => { now.value = Date.now() }, 1000)
})
onUnmounted(() => {
  stopPolling()
  if (clockInterval) clearInterval(clockInterval)
})
</script>
