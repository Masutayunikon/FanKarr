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

      <!-- Onglets + filtre -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex gap-1 bg-shell rounded-lg p-1 border border-border">
          <button
              @click="activeTab = 'active'"
              class="px-4 py-1.5 text-xs rounded-md transition-colors"
              :class="activeTab === 'active'
              ? 'bg-active text-primary'
              : 'text-muted hover:text-primary'"
          >
            En cours
            <span v-if="activeTorrents.length > 0" class="ml-1.5 text-[10px] text-accent">
              {{ activeTorrents.length }}
            </span>
          </button>
          <button
              @click="activeTab = 'done'"
              class="px-4 py-1.5 text-xs rounded-md transition-colors"
              :class="activeTab === 'done'
              ? 'bg-active text-primary'
              : 'text-muted hover:text-primary'"
          >
            Terminés
            <span v-if="doneTorrents.length > 0" class="ml-1.5 text-[10px] text-accent">
              {{ doneTorrents.length }}
            </span>
          </button>
        </div>

        <div v-if="activeTab === 'done'" class="flex items-center gap-2">
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
                <span class="text-xs text-muted">{{ t.client_name }}</span>
              </div>
            </div>
            <div class="text-right shrink-0">
              <p class="text-sm font-semibold text-primary">{{ t.progress }}%</p>
              <p class="text-xs text-muted mt-0.5">{{ formatSize(t.downloaded) }} / {{ formatSize(t.size) }}</p>
            </div>
          </div>

          <!-- Barre de progression -->
          <div class="h-1 bg-border rounded-full overflow-hidden">
            <div
                class="h-full rounded-full transition-all duration-500"
                :class="t.state === 'seeding' ? 'bg-green-500' :
                      t.state === 'error'   ? 'bg-red-500'   :
                      t.state === 'paused'  ? 'bg-muted'     : 'bg-accent'"
                :style="{ width: `${t.progress}%` }"
            />
          </div>

          <!-- Infos bas + actions -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3 text-xs text-muted">
              <span v-if="t.state === 'downloading'">↓ {{ formatSpeed(t.speed) }}</span>
              <span v-if="t.state === 'downloading' && t.eta > 0">ETA {{ formatEta(t.eta) }}</span>
              <span v-if="t.state === 'seeding'" class="text-green-500">Complété</span>
            </div>

            <div v-if="t.state === 'seeding'" class="flex items-center gap-2">

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

let pollInterval: ReturnType<typeof setInterval> | null = null

const activeTorrents = computed(() =>
    torrents.value.filter(t => ['downloading', 'paused', 'checking', 'error', 'unknown'].includes(t.state))
)

const doneTorrents = computed(() =>
    torrents.value.filter(t => t.state === 'seeding')
)

const visibleTorrents = computed(() => {
  if (activeTab.value === 'active') return activeTorrents.value
  if (hideImported.value) return doneTorrents.value.filter(t => t.organizeState !== 'done')
  return doneTorrents.value
})

const stats = computed(() => [
  { label: 'En cours',  value: torrents.value.filter(t => t.state === 'downloading').length },
  { label: 'Complétés', value: torrents.value.filter(t => t.state === 'seeding').length },
  { label: 'En pause',  value: torrents.value.filter(t => t.state === 'paused').length },
  { label: 'Erreurs',   value: torrents.value.filter(t => t.state === 'error').length },
])

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
  pollInterval = setInterval(fetchTorrents, 3000)
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
    unknown    : { label: 'Inconnu',        class: 'border-border text-muted' },
  }
  return map[state] ?? map.unknown
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
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