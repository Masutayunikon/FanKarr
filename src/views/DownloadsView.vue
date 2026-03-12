<template>
  <div class="max-w-4xl mx-auto px-8 py-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div class="flex items-center gap-4">
        <button @click="$router.push('/')"
                class="text-[#5a7a94] text-xs tracking-widest hover:text-[#e8513a] transition-colors cursor-pointer">
          ← CATALOGUE
        </button>
        <h1 class="text-xl font-black text-white font-sans">Téléchargements</h1>
      </div>
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 text-[10px] text-[#5a7a94] tracking-widest">
          <div class="w-1.5 h-1.5 rounded-full" :class="polling ? 'bg-green-500 animate-pulse' : 'bg-[#1e2d3d]'"/>
          {{ polling ? 'EN DIRECT' : 'PAUSE' }}
        </div>
        <button @click="togglePolling"
                class="border border-[#1e2d3d] text-[#5a7a94] px-4 py-1.5 text-xs tracking-widest hover:border-[#e8513a] hover:text-[#e8513a] transition-colors cursor-pointer">
          {{ polling ? 'PAUSE' : 'REPRENDRE' }}
        </button>
      </div>
    </div>

    <!-- Résumé -->
    <div class="grid grid-cols-4 gap-3 mb-6">
      <div v-for="stat in stats" :key="stat.label" class="bg-[#0d1219] border border-[#1e2d3d] p-4">
        <div class="text-[10px] text-[#5a7a94] tracking-widest mb-1">{{ stat.label }}</div>
        <div class="text-lg font-bold text-white">{{ stat.value }}</div>
      </div>
    </div>

    <!-- Onglets -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex gap-0 border border-[#1e2d3d]">
        <button
            @click="activeTab = 'active'"
            class="px-5 py-2 text-xs tracking-widest transition-colors cursor-pointer"
            :class="activeTab === 'active'
            ? 'bg-[#e8513a] text-white border-[#e8513a]'
            : 'text-[#5a7a94] hover:text-white'">
          EN COURS
          <span v-if="activeTorrents.length > 0"
                class="ml-1.5 bg-white/20 text-[9px] px-1.5 py-0.5 rounded-full">
            {{ activeTorrents.length }}
          </span>
        </button>
        <button
            @click="activeTab = 'done'"
            class="px-5 py-2 text-xs tracking-widest transition-colors cursor-pointer border-l border-[#1e2d3d]"
            :class="activeTab === 'done'
            ? 'bg-[#e8513a] text-white'
            : 'text-[#5a7a94] hover:text-white'">
          TERMINÉS
          <span v-if="doneTorrents.length > 0"
                class="ml-1.5 bg-white/20 text-[9px] px-1.5 py-0.5 rounded-full">
            {{ doneTorrents.length }}
          </span>
        </button>
      </div>

      <!-- Toggle masquer organisés (onglet TERMINÉS uniquement) -->
      <div v-if="activeTab === 'done'" class="flex items-center gap-2">
        <button @click="hideOrganized = !hideOrganized"
                class="relative shrink-0 w-8 h-4 rounded-full transition-colors cursor-pointer"
                :class="hideOrganized ? 'bg-[#e8513a]' : 'bg-[#1e2d3d]'">
          <span class="absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform duration-200"
                :class="hideOrganized ? 'translate-x-4' : 'translate-x-0'" />
        </button>
        <span class="text-[10px] text-[#5a7a94] tracking-widest">MASQUER ORGANISÉS</span>
      </div>
    </div>

    <!-- Pas de clients -->
    <div v-if="noClients" class="flex flex-col items-center justify-center gap-3 min-h-64 text-[#5a7a94]">
      <p class="text-sm">Aucun client torrent configuré</p>
      <router-link to="/settings"
                   class="text-[10px] tracking-widest text-[#e8513a] hover:opacity-75 transition-opacity">
        CONFIGURER →
      </router-link>
    </div>

    <!-- Loading -->
    <div v-else-if="loading && torrents.length === 0" class="flex items-center justify-center gap-3 min-h-64 text-[#5a7a94]">
      <div class="w-5 h-5 border-2 border-white/10 border-t-[#e8513a] rounded-full animate-spin"/>
      <span class="text-sm">Chargement...</span>
    </div>

    <!-- Vide -->
    <div v-else-if="!loading && visibleTorrents.length === 0" class="flex flex-col items-center justify-center gap-3 min-h-64 text-[#5a7a94]">
      <p class="text-sm">
        {{ activeTab === 'active' ? 'Aucun téléchargement en cours' : 'Aucun torrent terminé' }}
      </p>
      <p class="text-[11px]">
        {{ activeTab === 'active'
          ? 'Les torrents avec la catégorie « fankai » apparaîtront ici'
          : hideOrganized ? 'Tous les torrents terminés sont organisés' : '' }}
      </p>
    </div>

    <!-- Liste torrents -->
    <div v-else class="flex flex-col gap-2">
      <div v-for="t in visibleTorrents" :key="t.hash"
           class="bg-[#0d1219] border border-[#1e2d3d] p-4">

        <!-- Ligne principale -->
        <div class="flex items-start justify-between gap-4 mb-3">
          <div class="flex-1 min-w-0">
            <p class="text-sm text-white font-medium truncate">{{ t.name }}</p>
            <div class="flex items-center gap-3 mt-1">
              <span class="text-[10px] tracking-widest px-2 py-0.5 border"
                    :class="stateBadge(t.state).class">
                {{ stateBadge(t.state).label }}
              </span>
              <span class="text-[10px] text-[#5a7a94]">{{ t.client_name }}</span>
            </div>
          </div>

          <div class="text-right shrink-0">
            <p class="text-sm font-bold text-white">{{ t.progress }}%</p>
            <p class="text-[10px] text-[#5a7a94] mt-0.5">
              {{ formatSize(t.downloaded) }} / {{ formatSize(t.size) }}
            </p>
          </div>
        </div>

        <!-- Barre de progression -->
        <div class="h-1 bg-[#1e2d3d] rounded-full overflow-hidden mb-2">
          <div class="h-full rounded-full transition-all duration-500"
               :class="t.state === 'seeding' ? 'bg-green-500' :
                      t.state === 'error'   ? 'bg-red-500'   :
                      t.state === 'paused'  ? 'bg-[#5a7a94]' : 'bg-[#e8513a]'"
               :style="{ width: `${t.progress}%` }"/>
        </div>

        <!-- Infos bas -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4 text-[10px] text-[#5a7a94]">
            <span v-if="t.state === 'downloading'">↓ {{ formatSpeed(t.speed) }}</span>
            <span v-if="t.state === 'downloading' && t.eta > 0">ETA {{ formatEta(t.eta) }}</span>
            <span v-if="t.state === 'seeding'" class="text-green-500">✓ Complété</span>
          </div>

          <!-- Badge organisation (seulement pour les terminés) -->
          <div v-if="t.state === 'seeding'" class="flex items-center gap-2">
            <div v-if="t.errorFiles?.length > 0" class="relative group/err">
              <span class="text-[9px] tracking-widest px-2 py-0.5 border border-red-500/40 text-red-400 cursor-default">
                {{ t.errorFiles.length }} ERREUR{{ t.errorFiles.length > 1 ? 'S' : '' }}
              </span>
              <div class="absolute bottom-full right-0 mb-2 hidden group-hover/err:block z-10 w-80">
                <div class="bg-[#0d1219] border border-red-500/30 p-3 text-[10px] shadow-xl">
                  <div class="text-red-400 tracking-widest mb-2">FICHIERS EN ERREUR</div>
                  <div v-for="e in t.errorFiles" :key="e.file" class="mb-1.5 last:mb-0">
                    <p class="text-white truncate">{{ e.file }}</p>
                    <p class="text-[#5a7a94]">{{ e.error }}</p>
                  </div>
                </div>
              </div>
            </div>

            <span class="text-[9px] tracking-widest px-2 py-0.5 border"
                  :class="t.organizeState === 'done'    ? 'border-green-500/40 text-green-500' :
                        t.organizeState === 'partial'  ? 'border-yellow-500/40 text-yellow-500' :
                                                         'border-[#1e2d3d] text-[#5a7a94]'">
              {{ t.organizeState === 'done'    ? `ORGANISÉ (${t.organizeProgress?.done}/${t.organizeProgress?.total})` :
                t.organizeState === 'partial' ? `EN COURS (${t.organizeProgress?.done}/${t.organizeProgress?.total})` :
                    'NON ORGANISÉ' }}
            </span>

            <button v-if="t.organizeState !== 'done'"
                    @click="organize(t)"
                    :disabled="organizing[t.hash]"
                    class="text-[9px] tracking-widest px-3 py-1 border transition-colors cursor-pointer border-[#1e2d3d] text-[#5a7a94] hover:border-[#e8513a] hover:text-[#e8513a] disabled:opacity-50">
              {{ organizing[t.hash] ? '...' : 'ORGANISER' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useToast } from '@/composables/useToast'

const { add: toast } = useToast()

const torrents      = ref<any[]>([])
const loading       = ref(true)
const polling       = ref(true)
const noClients     = ref(false)
const organizing    = ref<Record<string, boolean>>({})
const activeTab     = ref<'active' | 'done'>('active')
const hideOrganized = ref(false)

let pollInterval: ReturnType<typeof setInterval> | null = null

// ── Filtres onglets ────────────────────────────────────────────
const activeTorrents = computed(() =>
    torrents.value.filter(t => ['downloading', 'paused', 'checking', 'error', 'unknown'].includes(t.state))
)

const doneTorrents = computed(() =>
    torrents.value.filter(t => t.state === 'seeding')
)

const visibleTorrents = computed(() => {
  if (activeTab.value === 'active') return activeTorrents.value
  if (hideOrganized.value) return doneTorrents.value.filter(t => t.organizeState !== 'done')
  return doneTorrents.value
})

// ── Stats ──────────────────────────────────────────────────────
const stats = computed(() => [
  { label: 'EN COURS',  value: torrents.value.filter(t => t.state === 'downloading').length },
  { label: 'COMPLÉTÉS', value: torrents.value.filter(t => t.state === 'seeding').length },
  { label: 'EN PAUSE',  value: torrents.value.filter(t => t.state === 'paused').length },
  { label: 'ERREURS',   value: torrents.value.filter(t => t.state === 'error').length },
])

// ── Fetch ──────────────────────────────────────────────────────
async function fetchTorrents() {
  try {
    const res = await fetch('/api/downloads', { credentials: 'include' })
    if (res.status === 503) { noClients.value = true; return }
    if (!res.ok) return
    torrents.value  = await res.json()
    noClients.value = false
  } catch {
    // silencieux en polling
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
  if (polling.value) startPolling()
  else stopPolling()
}

onMounted(startPolling)
onUnmounted(stopPolling)

// ── Organiser ──────────────────────────────────────────────────
async function organize(torrent: any) {
  organizing.value[torrent.hash] = true
  try {
    const res = await fetch('/api/organize', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ hash: torrent.hash, save_path: torrent.save_path, name: torrent.name })
    })
    if (res.ok) {
      toast(`${torrent.name} organisé ✓`, 'success')
    } else {
      const { error } = await res.json()
      toast(error ?? 'Erreur lors de l\'organisation', 'error')
    }
  } catch {
    toast('Impossible de contacter le serveur', 'error')
  } finally {
    organizing.value[torrent.hash] = false
  }
}

// ── Helpers affichage ──────────────────────────────────────────
function stateBadge(state: string) {
  const map: Record<string, { label: string; class: string }> = {
    downloading: { label: 'TÉLÉCHARGEMENT', class: 'border-[#e8513a]/40 text-[#e8513a]' },
    seeding    : { label: 'COMPLÉTÉ',       class: 'border-green-500/40 text-green-500' },
    paused     : { label: 'EN PAUSE',       class: 'border-[#5a7a94]/40 text-[#5a7a94]' },
    checking   : { label: 'VÉRIFICATION',   class: 'border-yellow-500/40 text-yellow-500' },
    error      : { label: 'ERREUR',         class: 'border-red-500/40 text-red-500' },
    unknown    : { label: 'INCONNU',        class: 'border-[#1e2d3d] text-[#5a7a94]' },
  }
  return map[state] ?? map.unknown
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

function formatSpeed(bps: number): string {
  return `${formatSize(bps)}/s`
}

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