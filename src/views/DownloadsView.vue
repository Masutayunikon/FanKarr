<template>
  <div>
    <div class="px-8 py-8 max-w-4xl">

      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <h1 class="text-lg font-semibold text-primary">Activité</h1>
          <div class="flex items-center gap-1.5">
            <span
                class="w-1.5 h-1.5 rounded-full transition-colors"
                :class="polling ? 'bg-green-500 animate-pulse' : 'bg-border'"
            />
            <span class="text-xs text-muted">{{ polling ? 'En direct' : 'Pause' }}</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button @click="importAll" :disabled="importingAll" class="btn-primary">
            {{ importingAll ? '...' : 'Importer tout' }}
          </button>
          <button @click="fetchTorrents" :disabled="loading" class="btn-secondary">
            <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none"
                 :class="loading ? 'animate-spin' : ''">
              <path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-6.36-2.64M3 12a9 9 0 0 1 9-9 9 9 0 0 1 6.36 2.64"/>
              <polyline points="16 5 21 5 21 10"/>
            </svg>
          </button>
          <button @click="togglePolling" class="btn-secondary">
            {{ polling ? 'Pause' : 'Reprendre' }}
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-4 gap-3 mb-6">
        <div v-for="stat in stats" :key="stat.label" class="settings-card flex flex-col gap-1">
          <span class="text-xs text-muted">{{ stat.label }}</span>
          <span class="text-xl font-semibold text-primary">{{ stat.value }}</span>
        </div>
      </div>

      <!-- Toolbar : recherche + tri + colonnes -->
      <div class="flex items-center gap-2 mb-4">
        <div class="relative flex-1 max-w-xs">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" :size="14" />
          <input
              v-model="search"
              type="text"
              placeholder="Rechercher..."
              class="settings-input pl-9 w-full py-1.5 text-sm"
          />
        </div>

        <!-- Tri -->
        <div class="relative shrink-0" ref="sortRef">
          <button
              @click="sortOpen = !sortOpen"
              class="btn-secondary flex items-center gap-1.5 py-1.5 px-2.5"
              :class="activeSort !== 'none' ? 'border-accent text-accent' : ''"
          >
            <ArrowUpDown :size="14" />
            <span class="hidden md:inline text-xs">Trier</span>
            <span v-if="activeSort !== 'none'" class="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-accent" />
          </button>
          <div
              v-if="sortOpen"
              class="absolute top-full right-0 mt-1 bg-card border border-border rounded-xl p-2 z-20 w-48 flex flex-col gap-0.5 shadow-xl"
          >
            <button
                v-for="s in sortOptions" :key="s.value"
                @click="setSort(s.value)"
                class="flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors"
                :class="activeSort === s.value ? 'bg-active text-primary' : 'text-secondary hover:bg-hover'"
            >
              {{ s.label }}
              <span v-if="activeSort === s.value && sortDir === 'asc'">↑</span>
              <span v-else-if="activeSort === s.value && sortDir === 'desc'">↓</span>
            </button>
          </div>
        </div>

        <!-- Colonnes -->
        <div class="relative shrink-0" ref="colRef">
          <button
              @click="colOpen = !colOpen"
              class="btn-secondary flex items-center gap-1.5 py-1.5 px-2.5"
              :class="colOpen ? 'border-accent text-accent' : ''"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <span class="hidden md:inline text-xs">Colonnes</span>
          </button>
          <div
              v-if="colOpen"
              class="absolute top-full right-0 mt-1 bg-card border border-border rounded-xl p-2 z-20 w-52 flex flex-col gap-0.5 shadow-xl"
          >
            <p class="text-[10px] text-muted px-3 py-1">Colonnes affichées</p>
            <label
                v-for="col in columnOptions" :key="col.key"
                class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs cursor-pointer hover:bg-hover transition-colors"
            >
              <input type="checkbox" v-model="columns[col.key]" class="accent-accent" />
              {{ col.label }}
            </label>
          </div>
        </div>
      </div>

      <!-- Onglets + filtres -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex gap-1 bg-shell rounded-lg p-1 border border-border">
          <button
              @click="activeTab = 'active'"
              class="px-4 py-1.5 text-xs rounded-md transition-colors"
              :class="activeTab === 'active' ? 'bg-active text-primary' : 'text-muted hover:text-primary'"
          >
            En cours
            <span v-if="activeTorrents.length > 0" class="ml-1.5 text-[10px] text-accent">
              {{ activeTorrents.length }}
            </span>
          </button>
          <button
              @click="activeTab = 'done'"
              class="px-4 py-1.5 text-xs rounded-md transition-colors"
              :class="activeTab === 'done' ? 'bg-active text-primary' : 'text-muted hover:text-primary'"
          >
            Terminés
            <span v-if="doneTorrents.length > 0" class="ml-1.5 text-[10px] text-accent">
              {{ doneTorrents.length }}
            </span>
          </button>
        </div>

        <div v-if="activeTab === 'done'" class="flex items-center gap-3">
          <!-- Filtre seeds uniquement -->
          <label class="flex items-center gap-1.5 cursor-pointer">
            <span class="text-xs text-muted">Seeds uniquement</span>
            <button
                @click="seedingOnly = !seedingOnly"
                class="relative shrink-0 w-10 h-[22px] rounded-full transition-colors duration-200"
                :class="seedingOnly ? 'bg-green-500' : 'bg-border'"
            >
              <span
                  class="absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white transition-transform duration-200"
                  :class="seedingOnly ? 'translate-x-[18px]' : 'translate-x-0'"
              />
            </button>
          </label>
          <!-- Masquer importés -->
          <label class="flex items-center gap-1.5 cursor-pointer">
            <span class="text-xs text-muted">Masquer importés</span>
            <button
                @click="hideImported = !hideImported"
                class="relative shrink-0 w-10 h-[22px] rounded-full transition-colors duration-200"
                :class="hideImported ? 'bg-accent' : 'bg-border'"
            >
              <span
                  class="absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white transition-transform duration-200"
                  :class="hideImported ? 'translate-x-[18px]' : 'translate-x-0'"
              />
            </button>
          </label>
        </div>
      </div>

      <!-- Pas de clients -->
      <div v-if="noClients" class="settings-card flex flex-col items-center gap-3 py-16 text-center">
        <p class="text-sm text-muted">Aucun client torrent configuré</p>
        <RouterLink to="/settings/download-client" class="text-xs text-accent hover:underline">
          Configurer un client →
        </RouterLink>
      </div>

      <!-- Loading initial -->
      <div v-else-if="loading && torrents.length === 0" class="flex items-center justify-center gap-2 py-16 text-muted text-sm">
        <div class="w-4 h-4 border border-border border-t-accent rounded-full animate-spin" />
        Chargement...
      </div>

      <!-- Vide -->
      <div v-else-if="!loading && visibleTorrents.length === 0" class="settings-card flex flex-col items-center gap-2 py-16 text-center">
        <p class="text-sm text-muted">
          {{ activeTab === 'active' ? 'Aucun téléchargement en cours' : 'Aucun torrent terminé' }}
        </p>
        <p class="text-xs text-muted">
          {{ activeTab === 'active'
            ? 'Les torrents avec la catégorie « fankai » apparaîtront ici'
            : hideImported ? 'Tous les torrents terminés sont importés' : '' }}
        </p>
      </div>

      <!-- Liste torrents -->
      <div v-else class="flex flex-col gap-2">
        <div v-for="t in visibleTorrents" :key="t.hash" class="settings-card flex flex-col gap-3">

          <!-- Nom + état + progression -->
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <p class="text-sm text-primary font-medium truncate">{{ t.name }}</p>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-[10px] px-2 py-0.5 rounded border" :class="stateBadge(t.state).class">
                  {{ stateBadge(t.state).label }}
                </span>
                <span v-if="columns.client" class="text-xs text-muted">{{ t.client_name }}</span>
              </div>
            </div>
            <div class="text-right shrink-0">
              <p class="text-sm font-semibold text-primary">{{ clampedProgress(t) }}%</p>
              <p v-if="columns.size" class="text-xs text-muted mt-0.5">{{ formatSize(t.downloaded) }} / {{ formatSize(t.size) }}</p>
            </div>
          </div>

          <!-- Barre de progression -->
          <div class="h-1 bg-border rounded-full overflow-hidden">
            <div
                class="h-full rounded-full transition-all duration-500"
                :class="t.state === 'seeding' || t.state === 'unknown' ? 'bg-green-500' :
                      t.state === 'error'   ? 'bg-red-500'   :
                      t.state === 'paused'  ? 'bg-muted'     : 'bg-accent'"
                :style="{ width: `${clampedProgress(t)}%` }"
            />
          </div>

          <!-- Infos bas + actions -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3 text-xs text-muted">
              <!-- Downloading -->
              <span v-if="t.state === 'downloading'">↓ {{ formatSpeed(t.speed) }}</span>
              <span v-if="t.state === 'downloading' && t.eta > 0">ETA {{ formatEta(t.eta) }}</span>

              <!-- Seeding : ratio + upload -->
              <template v-if="t.state === 'seeding'">
                <span class="text-green-500">Complété</span>
                <span v-if="columns.ratio" class="text-xs font-mono"
                      :class="t.ratio >= 1 ? 'text-green-400' : t.ratio >= 0.5 ? 'text-yellow-500' : 'text-muted'">
                  R {{ t.ratio?.toFixed(2) ?? '0.00' }}
                </span>
                <span v-if="columns.uploaded" class="text-xs text-muted">
                  ↑ {{ formatSize(t.uploaded ?? 0) }}
                </span>
                <span v-if="columns.upspeed && t.upspeed > 0" class="text-xs text-muted">
                  {{ formatSpeed(t.upspeed) }}
                </span>
              </template>

              <span v-if="t.state === 'unknown'" class="text-yellow-500">État non remonté par le client</span>
            </div>

            <div v-if="t.state === 'seeding' || t.state === 'unknown'" class="flex items-center gap-2">
              <!-- Erreurs fichiers -->
              <div v-if="t.errorFiles?.length > 0" class="relative group/err">
                <span class="text-xs px-2 py-0.5 rounded border border-red-500/40 text-red-400 cursor-default">
                  {{ t.errorFiles.length }} erreur{{ t.errorFiles.length > 1 ? 's' : '' }}
                </span>
                <div class="absolute bottom-full right-0 mb-2 hidden group-hover/err:block z-10 w-80">
                  <div class="bg-card border border-red-500/30 rounded-lg p-3 text-xs shadow-xl">
                    <p class="text-red-400 mb-2 font-medium">Fichiers en erreur</p>
                    <div v-for="e in t.errorFiles" :key="e.file" class="mb-1.5 last:mb-0">
                      <p class="text-primary truncate">{{ e.file }}</p>
                      <p class="text-muted">{{ e.error }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Badge import -->
              <span
                  class="text-xs px-2 py-0.5 rounded border"
                  :class="t.organizeState === 'done'    ? 'border-green-500/40 text-green-500' :
                        t.organizeState === 'partial'  ? 'border-yellow-500/40 text-yellow-500' :
                                                         'border-border text-muted'"
              >
                {{ t.organizeState === 'done'   ? `Importé (${t.organizeProgress?.done}/${t.organizeProgress?.total})` :
                  t.organizeState === 'partial' ? `En cours (${t.organizeProgress?.done}/${t.organizeProgress?.total})` :
                      'Non importé' }}
              </span>

              <button
                  v-if="t.organizeState !== 'done'"
                  @click="importTorrent(t)"
                  :disabled="importing[t.hash]"
                  class="btn-secondary text-xs py-1"
              >
                {{ importing[t.hash] ? '...' : 'Importer' }}
              </button>
            </div>
          </div>

        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import { Search, ArrowUpDown } from 'lucide-vue-next'
import { onClickOutside } from '@vueuse/core'
import { useToast } from '@/composables/useToast'

const { add: toast } = useToast()

const torrents     = ref<any[]>([])
const loading      = ref(true)
const polling      = ref(true)
const noClients    = ref(false)
const importing    = ref<Record<string, boolean>>({})
const importingAll = ref(false)
const activeTab    = ref<'active' | 'done'>('active')
const hideImported = ref(false)
const seedingOnly  = ref(false)
const search       = ref('')
const sortOpen     = ref(false)
const colOpen      = ref(false)
const activeSort   = ref<'none' | 'name' | 'size' | 'progress' | 'state' | 'ratio'>('none')
const sortDir      = ref<'asc' | 'desc'>('asc')
const sortRef      = ref<HTMLElement | null>(null)
const colRef       = ref<HTMLElement | null>(null)

// Colonnes visibles
const columns = ref({
  client  : true,
  size    : true,
  ratio   : true,
  uploaded: true,
  upspeed : true,
})

const columnOptions = [
  { key: 'client',   label: 'Client' },
  { key: 'size',     label: 'Taille / Téléchargé' },
  { key: 'ratio',    label: 'Ratio' },
  { key: 'uploaded', label: 'Uploadé (total)' },
  { key: 'upspeed',  label: 'Vitesse upload' },
]

onClickOutside(sortRef, () => { sortOpen.value = false })
onClickOutside(colRef,  () => { colOpen.value  = false })

const sortOptions = [
  { label: 'Nom',        value: 'name'     },
  { label: 'Taille',     value: 'size'     },
  { label: 'Progression', value: 'progress' },
  { label: 'État',       value: 'state'    },
  { label: 'Ratio',      value: 'ratio'    },
]

function setSort(val: typeof activeSort.value) {
  if (activeSort.value === val) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    activeSort.value = val
    sortDir.value = 'asc'
  }
  sortOpen.value = false
}

let pollInterval: ReturnType<typeof setInterval> | null = null

const activeTorrents = computed(() =>
    torrents.value.filter(t => ['downloading', 'paused', 'checking', 'error'].includes(t.state))
)

const doneTorrents = computed(() =>
    torrents.value.filter(t => t.state === 'seeding' || t.state === 'unknown')
)

const visibleTorrents = computed(() => {
  let list = activeTab.value === 'active'
      ? activeTorrents.value
      : doneTorrents.value

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

function clampedProgress(t: any): number {
  return Math.min(100, Math.max(0, t.progress ?? 0))
}

async function fetchTorrents() {
  try {
    const res = await fetch('/api/downloads', { credentials: 'include' })
    if (res.status === 503) { noClients.value = true; return }
    if (!res.ok) return
    torrents.value  = await res.json()
    noClients.value = false
  } catch {
  } finally {
    loading.value = false
  }
}

function startPolling() {
  fetchTorrents()
  pollInterval = setInterval(fetchTorrents, 60_000)
}

function stopPolling() {
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null }
}

function togglePolling() {
  polling.value = !polling.value
  polling.value ? startPolling() : stopPolling()
}

onMounted(startPolling)
onUnmounted(stopPolling)

async function importTorrent(torrent: any) {
  importing.value[torrent.hash] = true
  try {
    const res = await fetch('/api/organize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ hash: torrent.hash, save_path: torrent.save_path, name: torrent.name }),
    })
    if (res.ok) {
      toast(`${torrent.name} importé ✓`, 'success')
      await fetchTorrents()
    } else {
      const { error } = await res.json()
      toast(error ?? "Erreur lors de l'import", 'error')
    }
  } catch {
    toast('Impossible de contacter le serveur', 'error')
  } finally {
    importing.value[torrent.hash] = false
  }
}

async function importAll() {
  const toImport = doneTorrents.value.filter(t => t.organizeState !== 'done')
  if (toImport.length === 0) { toast('Tous les torrents sont déjà importés', 'success'); return }

  importingAll.value = true
  let done = 0, errors = 0

  for (const t of toImport) {
    try {
      const res = await fetch('/api/organize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ hash: t.hash, save_path: t.save_path, name: t.name }),
      })
      res.ok ? done++ : errors++
    } catch { errors++ }
  }

  importingAll.value = false
  await fetchTorrents()
  errors === 0
      ? toast(`${done} torrent(s) importé(s) ✓`, 'success')
      : toast(`${done} OK, ${errors} erreur(s)`, 'error')
}

function stateBadge(state: string) {
  const map: Record<string, { label: string; class: string }> = {
    downloading: { label: 'Téléchargement', class: 'border-accent/40 text-accent' },
    seeding    : { label: 'Complété',       class: 'border-green-500/40 text-green-500' },
    paused     : { label: 'En pause',       class: 'border-border text-muted' },
    checking   : { label: 'Vérification',   class: 'border-yellow-500/40 text-yellow-500' },
    error      : { label: 'Erreur',         class: 'border-red-500/40 text-red-400' },
    unknown    : { label: 'État inconnu',   class: 'border-yellow-500/40 text-yellow-500' },
  }
  return map[state] ?? map.unknown
}

function formatSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

function formatSpeed(bps: number): string { return `${formatSize(bps)}/s` }

function formatEta(seconds: number): string {
  if (seconds < 0 || seconds > 86400 * 7) return '∞'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h${m.toString().padStart(2, '0')}m`
  if (m > 0) return `${m}m${s.toString().padStart(2, '0')}s`
  return `${s}s`
}
</script>