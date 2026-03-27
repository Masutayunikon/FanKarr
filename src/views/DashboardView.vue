<template>
  <div class="px-8 py-8 max-w-4xl">

    <!-- Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <div class="settings-card flex flex-col gap-1">
        <span class="text-xs text-muted">Catalogue</span>
        <span class="text-2xl font-semibold text-primary">{{ stats.catalogue }}</span>
        <span class="text-xs text-muted">séries disponibles</span>
      </div>
      <div class="settings-card flex flex-col gap-1">
        <span class="text-xs text-muted">Importées</span>
        <span class="text-2xl font-semibold text-green-500">{{ stats.imported }}</span>
        <span class="text-xs text-muted">
          {{ stats.catalogue > 0 ? Math.round(stats.imported / stats.catalogue * 100) : 0 }}% du catalogue
        </span>
      </div>
      <div class="settings-card flex flex-col gap-1">
        <span class="text-xs text-muted">En cours</span>
        <span class="text-2xl font-semibold text-accent">{{ stats.downloading }}</span>
        <span class="text-xs text-muted">téléchargements</span>
      </div>
      <div class="settings-card flex flex-col gap-1">
        <span class="text-xs text-muted">Erreurs</span>
        <span class="text-2xl font-semibold" :class="stats.errors > 0 ? 'text-red-400' : 'text-muted'">
          {{ stats.errors }}
        </span>
        <span class="text-xs text-muted">{{ stats.errors === 0 ? 'aucune erreur' : 'à corriger' }}</span>
      </div>
    </div>

    <div class="grid md:grid-cols-2 gap-4">

      <!-- Téléchargements actifs -->
      <div class="settings-card flex flex-col gap-3">
        <h2 class="text-sm font-medium text-secondary">Téléchargements actifs</h2>

        <div v-if="loadingTorrents" class="flex items-center gap-2 text-muted text-xs py-4">
          <div class="w-3 h-3 border border-border border-t-accent rounded-full animate-spin" />
          Chargement...
        </div>

        <div v-else-if="activeTorrents.length === 0" class="text-xs text-muted py-4">
          Aucun téléchargement en cours
        </div>

        <div v-else class="flex flex-col gap-3">
          <div v-for="t in activeTorrents" :key="t.hash" class="flex flex-col gap-1.5">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs text-primary truncate">{{ t.name }}</span>
              <span class="text-xs text-muted shrink-0">{{ t.progress }}%</span>
            </div>
            <div class="h-0.5 bg-border rounded-full overflow-hidden">
              <div
                  class="h-full rounded-full transition-all duration-500"
                  :class="t.state === 'seeding' ? 'bg-green-500' : 'bg-accent'"
                  :style="{ width: `${t.progress}%` }"
              />
            </div>
            <div class="flex items-center justify-between">
              <span class="text-[11px] text-muted">{{ formatSize(t.downloaded) }} / {{ formatSize(t.size) }}</span>
              <span v-if="t.state === 'downloading' && t.eta > 0" class="text-[11px] text-muted">
                {{ formatEta(t.eta) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Derniers imports -->
      <div class="settings-card flex flex-col gap-3">
        <h2 class="text-sm font-medium text-secondary">Derniers imports</h2>

        <div v-if="loadingNotifs" class="flex items-center gap-2 text-muted text-xs py-4">
          <div class="w-3 h-3 border border-border border-t-accent rounded-full animate-spin" />
          Chargement...
        </div>

        <div v-else-if="recentNotifs.length === 0" class="text-xs text-muted py-4">
          Aucun import récent
        </div>

        <div v-else class="flex flex-col divide-y divide-border/50">
          <div v-for="n in recentNotifs" :key="n.hash + n.at" class="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
            <div
                class="w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                :class="n.errors > 0 ? 'bg-red-500/10' : 'bg-green-500/10'"
            >
              <svg v-if="n.errors === 0" width="10" height="10" viewBox="0 0 12 12" stroke="#22c55e" stroke-width="2.5" fill="none">
                <polyline points="2 6 5 9 10 3"/>
              </svg>
              <svg v-else width="10" height="10" viewBox="0 0 12 12" stroke="#f87171" stroke-width="2.5" fill="none">
                <line x1="3" y1="3" x2="9" y2="9"/><line x1="9" y1="3" x2="3" y2="9"/>
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-xs text-primary truncate">{{ n.name }}</p>
              <p class="text-[11px] text-muted mt-0.5">
                {{ n.done }} fichier{{ n.done > 1 ? 's' : '' }} importé{{ n.done > 1 ? 's' : '' }}
                <span v-if="n.errors > 0" class="text-red-400"> · {{ n.errors }} erreur{{ n.errors > 1 ? 's' : '' }}</span>
              </p>
            </div>
            <span class="text-[11px] text-muted shrink-0">{{ formatRelative(n.at) }}</span>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const loadingTorrents = ref(true)
const loadingNotifs   = ref(true)

const stats = ref({ catalogue: 0, imported: 0, downloading: 0, errors: 0 })
const activeTorrents  = ref<any[]>([])
const recentNotifs    = ref<any[]>([])

let interval: ReturnType<typeof setInterval> | null = null

async function fetchAll() {
  await Promise.all([fetchStats(), fetchTorrents(), fetchNotifs()])
}

async function fetchStats() {
  try {
    const [statusRes, seriesRes, downloadsRes] = await Promise.all([
      fetch('/api/torrents/status', { credentials: 'include' }),
      fetch('/api/series',          { credentials: 'include' }),
      fetch('/api/downloads',       { credentials: 'include' }),
    ])

    if (statusRes.ok) {
      const s = await statusRes.json()
      stats.value.catalogue = s.count ?? 0
    }

    if (seriesRes.ok) {
      const s = await seriesRes.json()
      const list = Array.isArray(s) ? s : (s.series ?? [])
      stats.value.imported = list.filter((s: any) => s.download_state === 'complete').length
    }

    if (downloadsRes.ok) {
      const torrents = await downloadsRes.json()
      stats.value.downloading = torrents.filter((t: any) => t.state === 'downloading').length
      stats.value.errors      = torrents.filter((t: any) => t.state === 'error').length
    }
  } catch {}
}

async function fetchTorrents() {
  // Premier chargement seulement → affiche le spinner
  const isFirst = loadingTorrents.value
  try {
    const res = await fetch('/api/downloads', { credentials: 'include' })
    if (res.ok) {
      const list = await res.json()
      activeTorrents.value = list
          .filter((t: any) => ['downloading', 'paused', 'checking', 'error'].includes(t.state))
          .slice(0, 5)
    }
  } catch {
  } finally {
    if (isFirst) loadingTorrents.value = false
  }
}

async function fetchNotifs() {
  loadingNotifs.value = true
  try {
    const res = await fetch('/api/organize/recent', { credentials: 'include' })
    if (res.ok) recentNotifs.value = (await res.json()).slice(0, 6)
  } catch {
  } finally {
    loadingNotifs.value = false
  }
}

function formatSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

function formatEta(seconds: number): string {
  if (seconds < 0 || seconds > 86400 * 7) return '∞'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`
  return `${s}s`
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 1)  return "à l'instant"
  if (m < 60) return `il y a ${m}min`
  if (h < 24) return `il y a ${h}h`
  return `il y a ${d}j`
}

onMounted(() => {
  fetchAll()
  interval = setInterval(fetchTorrents, 10000)
})

onUnmounted(() => {
  if (interval) clearInterval(interval)
})
</script>