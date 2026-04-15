<template>
  <div>
    <div class="px-8 py-8 max-w-4xl">

      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <h1 class="text-lg font-semibold text-primary">Activité</h1>
          <div class="flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full transition-colors" :class="polling ? 'bg-green-500 animate-pulse' : 'bg-border'" />
            <span class="text-xs text-muted">{{ polling ? 'En direct' : 'Pause' }}</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button @click="importAll" :disabled="importingAll" class="btn-primary">{{ importingAll ? '...' : 'Importer tout' }}</button>
          <button @click="fetchTorrents" :disabled="loading" class="btn-secondary">
            <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" :class="loading ? 'animate-spin' : ''">
              <path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-6.36-2.64M3 12a9 9 0 0 1 9-9 9 9 0 0 1 6.36 2.64"/>
              <polyline points="16 5 21 5 21 10"/>
            </svg>
          </button>
          <button @click="togglePolling" class="btn-secondary">{{ polling ? 'Pause' : 'Reprendre' }}</button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-4 gap-3 mb-6">
        <div v-for="stat in stats" :key="stat.label" class="settings-card flex flex-col gap-1">
          <span class="text-xs text-muted">{{ stat.label }}</span>
          <span class="text-xl font-semibold text-primary">{{ stat.value }}</span>
        </div>
      </div>

      <!-- Toolbar + Tabs -->
      <DownloadsToolbar
          v-model:search="search"
          v-model:active-tab="activeTab"
          v-model:seeding-only="seedingOnly"
          v-model:hide-imported="hideImported"
          :active-sort="activeSort"
          :sort-dir="sortDir"
          :columns="columns"
          :active-count="activeTorrents.length"
          :done-count="doneTorrents.length"
          :column-options="columnOptions"
          :sort-options="sortOptions"
          @sort="setSort"
          @toggle-col="(key) => (columns as any)[key] = !(columns as any)[key]"
      />

      <!-- Pas de clients -->
      <div v-if="noClients" class="settings-card flex flex-col items-center gap-3 py-16 text-center">
        <p class="text-sm text-muted">Aucun client torrent configuré</p>
        <RouterLink to="/settings/download-client" class="text-xs text-accent hover:underline">Configurer un client →</RouterLink>
      </div>

      <!-- Loading -->
      <div v-else-if="loading && torrents.length === 0" class="flex items-center justify-center gap-2 py-16 text-muted text-sm">
        <div class="w-4 h-4 border border-border border-t-accent rounded-full animate-spin" />
        Chargement...
      </div>

      <!-- Vide -->
      <div v-else-if="!loading && visibleTorrents.length === 0" class="settings-card flex flex-col items-center gap-2 py-16 text-center">
        <p class="text-sm text-muted">{{ activeTab === 'active' ? 'Aucun téléchargement en cours' : 'Aucun torrent terminé' }}</p>
        <p class="text-xs text-muted">{{ activeTab === 'active' ? 'Les torrents avec la catégorie « fankai » apparaîtront ici' : hideImported ? 'Tous les torrents terminés sont importés' : '' }}</p>
      </div>

      <!-- Liste torrents -->
      <div v-else class="flex flex-col gap-2">
        <TorrentCard
            v-for="t in visibleTorrents"
            :key="t.hash"
            :torrent="t"
            :tab="activeTab"
            :columns="columns"
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
import { useToast } from '@/composables/useToast'
import TorrentCard from '@/components/downloads/TorrentCard.vue'
import DownloadsToolbar from '@/components/downloads/DownloadsToolbar.vue'

const { add: toast } = useToast()

const torrents        = ref<any[]>([])
const loading         = ref(true)
const polling         = ref(true)
const noClients       = ref(false)
const importing       = ref<Record<string, boolean>>({})
const importingAll    = ref(false)
const confirmDelete   = ref<string | null>(null)
const deleting        = ref<Record<string, boolean>>({})
const activeTab       = ref<'active' | 'done'>('active')
const hideImported    = ref(false)
const seedingOnly     = ref(false)
const search          = ref('')
const activeSort      = ref<'none' | 'name' | 'size' | 'progress' | 'state' | 'ratio'>('none')
const sortDir         = ref<'asc' | 'desc'>('asc')

const columns = ref({ client: true, size: true, ratio: true, uploaded: true, upspeed: true })
const columnOptions = [
  { key: 'client',   label: 'Client' },
  { key: 'size',     label: 'Taille / Téléchargé' },
  { key: 'ratio',    label: 'Ratio' },
  { key: 'uploaded', label: 'Uploadé (total)' },
  { key: 'upspeed',  label: 'Vitesse upload' },
]
const sortOptions = [
  { label: 'Nom',         value: 'name'     },
  { label: 'Taille',      value: 'size'     },
  { label: 'Progression', value: 'progress' },
  { label: 'État',        value: 'state'    },
  { label: 'Ratio',       value: 'ratio'    },
]

let pollInterval: ReturnType<typeof setInterval> | null = null

const activeTorrents = computed(() =>
    torrents.value.filter(t => ['downloading', 'paused', 'checking', 'error'].includes(t.state))
)
const doneTorrents = computed(() =>
    torrents.value.filter(t => t.state === 'seeding' || t.state === 'unknown')
)
const visibleTorrents = computed(() => {
  let list = activeTab.value === 'active' ? activeTorrents.value : doneTorrents.value
  if (activeTab.value === 'done') {
    if (seedingOnly.value)  list = list.filter(t => t.state === 'seeding')
    if (hideImported.value) list = list.filter(t => t.organizeState !== 'done')
  }
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter(t => t.name.toLowerCase().includes(q))
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
  }
  return list
})
const stats = computed(() => [
  { label: 'En cours',  value: torrents.value.filter(t => t.state === 'downloading').length },
  { label: 'Complétés', value: torrents.value.filter(t => t.state === 'seeding').length },
  { label: 'En pause',  value: torrents.value.filter(t => t.state === 'paused').length },
  { label: 'Erreurs',   value: torrents.value.filter(t => t.state === 'error').length },
])

function setSort(val: string) {
  if (activeSort.value === val) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else { activeSort.value = val as typeof activeSort.value; sortDir.value = 'asc' }
}

async function fetchTorrents() {
  try {
    const res = await fetch('/api/downloads', { credentials: 'include' })
    if (res.status === 503) { noClients.value = true; return }
    if (!res.ok) return
    torrents.value  = await res.json()
    noClients.value = false
  } catch {} finally { loading.value = false }
}

function startPolling() { fetchTorrents(); pollInterval = setInterval(fetchTorrents, 60_000) }
function stopPolling()  { if (pollInterval) { clearInterval(pollInterval); pollInterval = null } }
function togglePolling() { polling.value = !polling.value; polling.value ? startPolling() : stopPolling() }

async function importTorrent(torrent: any) {
  importing.value[torrent.hash] = true
  try {
    const res = await fetch('/api/organize', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ hash: torrent.hash, save_path: torrent.save_path, name: torrent.name }),
    })
    if (res.ok) { toast(`${torrent.name} importé ✓`, 'success'); await fetchTorrents() }
    else { const { error } = await res.json(); toast(error ?? "Erreur lors de l'import", 'error') }
  } catch { toast('Impossible de contacter le serveur', 'error') }
  finally { importing.value[torrent.hash] = false }
}

async function importAll() {
  const toImport = doneTorrents.value.filter(t => t.organizeState !== 'done')
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
  errors === 0 ? toast(`${done} torrent(s) importé(s) ✓`, 'success') : toast(`${done} OK, ${errors} erreur(s)`, 'error')
}

async function deleteTorrent(torrent: any, withFiles: boolean) {
  deleting.value[torrent.hash] = true
  try {
    const res = await fetch(`/api/torrent/${torrent.hash}?deleteFiles=${withFiles}`, { method: 'DELETE', credentials: 'include' })
    if (res.ok) { toast(`"${torrent.name}" supprimé ✓`, 'success'); confirmDelete.value = null; await fetchTorrents() }
    else toast('Erreur lors de la suppression', 'error')
  } catch { toast('Impossible de contacter le serveur', 'error') }
  finally { deleting.value[torrent.hash] = false }
}

onMounted(startPolling)
onUnmounted(stopPolling)
</script>
