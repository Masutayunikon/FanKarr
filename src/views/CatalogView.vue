<template>
  <div class="min-h-screen bg-zinc-950 text-zinc-100">

    <!-- Header -->
    <header class="sticky top-0 z-50 bg-zinc-950/90 backdrop-blur border-b border-white/5">
      <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <router-link to="/" class="text-2xl font-serif tracking-tight hover:opacity-80 transition">
          <span class="text-zinc-100">Fan</span><span class="text-orange-500">karr</span>
        </router-link>
        <div class="flex items-center gap-2">
          <!-- Icône logs -->
          <router-link to="/logs"
                       class="p-2 rounded-lg text-zinc-500 hover:text-zinc-100 hover:bg-white/5 transition"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </router-link>
          <router-link to="/downloads"
                       class="relative p-2 rounded-lg text-zinc-500 hover:text-zinc-100 hover:bg-white/5 transition"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <!-- Badge compteur -->
            <span v-if="activeDownloads > 0"
                  class="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-orange-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
              {{ activeDownloads }}
            </span>
          </router-link>
          <router-link
              to="/settings"
              class="p-2 rounded-lg text-zinc-500 hover:text-zinc-100 hover:bg-white/5 transition"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </router-link>
          <button
              class="p-2 rounded-lg text-zinc-500 hover:text-zinc-100 hover:bg-white/5 transition"
              @click="handleLogout"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Search + Filters -->
      <div class="max-w-7xl mx-auto px-6 pb-3 flex flex-wrap items-center gap-3">
        <div class="relative flex-1 min-w-48 max-w-sm">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" width="15" height="15" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
              v-model="search"
              type="text"
              placeholder="Rechercher…"
              class="w-full bg-white/5 border border-white/[0.08] rounded-lg pl-9 pr-4 py-2 text-sm placeholder-zinc-600 outline-none focus:border-orange-500/50 transition"
          />
        </div>
        <div class="flex items-center gap-1">
          <!-- Groupe 1 : état de la série -->
          <button
              v-for="f in filtersGroupe1"
              :key="f.value"
              class="px-3 py-1.5 rounded-lg text-xs font-medium border transition"
              :class="activeFilter === f.value
              ? 'bg-orange-500 border-orange-500 text-white'
              : 'bg-transparent border-white/[0.08] text-zinc-500 hover:text-zinc-100 hover:border-white/20'"
              @click="activeFilter = f.value"
          >{{ f.label }}</button>

          <!-- Séparateur -->
          <span class="w-px h-5 bg-white/10 mx-1" />

          <!-- Groupe 2 : état du téléchargement -->
          <button
              v-for="f in filtersGroupe2"
              :key="f.value"
              class="px-3 py-1.5 rounded-lg text-xs font-medium border transition"
              :class="activeFilter === f.value
              ? 'bg-blue-500 border-blue-500 text-white'
              : 'bg-transparent border-white/[0.08] text-zinc-500 hover:text-zinc-100 hover:border-white/20'"
              @click="activeFilter = f.value"
          >{{ f.label }}</button>
        </div>
        <span class="text-xs text-zinc-600 ml-auto">{{ filtered.length }} série{{ filtered.length > 1 ? 's' : '' }}</span>
      </div>
    </header>

    <!-- Main -->
    <main class="max-w-7xl mx-auto px-6 py-8">

      <!-- Loading -->
      <div v-if="store.loadingSeries" class="flex flex-col items-center justify-center gap-4 min-h-96 text-zinc-600">
        <div class="w-8 h-8 border-2 border-white/10 border-t-orange-500 rounded-full animate-spin" />
        <p class="text-sm">Chargement du catalogue…</p>
      </div>

      <!-- Error -->
      <div v-else-if="store.error" class="flex flex-col items-center justify-center gap-4 min-h-96 text-orange-400">
        <svg width="36" height="36" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
        </svg>
        <p class="text-sm">{{ store.error }}</p>
        <button class="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 transition" @click="store.fetchSeries()">
          Réessayer
        </button>
      </div>

      <!-- Empty -->
      <div v-else-if="filtered.length === 0" class="flex flex-col items-center justify-center gap-3 min-h-96 text-zinc-600">
        <p class="text-sm">Aucune série trouvée</p>
      </div>

      <!-- Grid -->
      <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-5">
        <router-link
            v-for="serie in filtered"
            :key="serie.id"
            :to="`/series/${serie.id}`"
            class="group flex flex-col gap-2 transition-transform duration-200 hover:-translate-y-1"
            :class="{ 'opacity-40': !serie.has_torrents }"
        >
          <!-- Poster -->
          <div class="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 border border-white/5">
            <img
                v-if="serie.poster_image"
                :src="serie.poster_image"
                :alt="serie.title"
                loading="lazy"
                class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-zinc-700">
              <svg width="28" height="28" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <rect x="2" y="2" width="20" height="20" rx="2"/>
                <path d="m9 9 6 6M15 9l-6 6"/>
              </svg>
            </div>




            <!-- Badge état téléchargement -->
            <div v-if="serie.download_state !== 'none'"
                 class="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold leading-none backdrop-blur-sm"
                 :class="serie.download_state === 'complete'    ? 'bg-green-500/90 text-white' :
                        serie.download_state === 'partial'     ? 'bg-orange-500/90 text-white' :
                        serie.download_state === 'downloading' ? 'bg-blue-500/90 text-white'   : ''">
              <!-- Icône -->
              <svg v-if="serie.download_state === 'complete'" width="9" height="9" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <svg v-else-if="serie.download_state === 'downloading'" width="9" height="9" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3" class="animate-pulse">
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <svg v-else width="9" height="9" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              {{ serie.download_state === 'complete' ? 'ORGANISÉ' : serie.download_state === 'downloading' ? 'EN COURS' : 'PARTIEL' }}
            </div>

            <!-- Overlay hover -->
            <div class="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <span class="text-xs text-white border border-white/40 px-3 py-1.5 rounded-md">Voir</span>
            </div>
          </div>

          <!-- Info -->
          <div>
            <p class="text-xs font-medium truncate leading-snug">{{ serie.title }}</p>
            <div class="flex items-center gap-1.5 mt-0.5">
              <span v-if="serie.year" class="text-[11px] text-zinc-600">{{ serie.year }}</span>
              <span
                  v-if="serie.status"
                  class="text-[10px] px-1.5 py-0.5 rounded"
                  :class="serie.status.toLowerCase() === 'continuing'
                  ? 'bg-green-500/10 text-green-400'
                  : 'bg-white/5 text-zinc-600'"
              >{{ serie.status }}</span>
            </div>
          </div>
        </router-link>
      </div>

    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { useSeriesStore } from '@/stores/series'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'

const store = useSeriesStore()
const auth = useAuthStore()
const router = useRouter()
const { add: toast } = useToast()

const search = ref('')
const activeFilter = ref('all')
const activeDownloads = ref(0)

const filtersGroupe1 = [
  { label: 'Toutes',        value: 'all' },
  { label: 'Disponibles',   value: 'available' },
  { label: 'Sans torrent',  value: 'unavailable' },
]

const filtersGroupe2 = [
  { label: 'DL complet',    value: 'complete' },
  { label: 'DL partiel',    value: 'downloading' },
]

const filtered = computed(() => {
  let list = store.series
  if (activeFilter.value === 'available')    list = list.filter(s => s.has_torrents)
  if (activeFilter.value === 'unavailable')  list = list.filter(s => !s.has_torrents)
  if (activeFilter.value === 'complete')     list = list.filter(s => s.download_state === 'complete')
  if (activeFilter.value === 'downloading')  list = list.filter(s => s.download_state === 'downloading' || s.download_state === 'partial')
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter(s => s.title.toLowerCase().includes(q))
  }
  return list
})

async function handleLogout() {
  await auth.logout()
  router.push('/auth')
}

// ── Polling downloads actifs + notifications organisation ──────
let dlInterval: ReturnType<typeof setInterval> | null = null
const seenNotifs = new Set<string>()

async function fetchActiveDownloads() {
  try {
    const res = await fetch('/api/downloads', { credentials: 'include' })
    if (!res.ok) return
    const torrents = await res.json()
    activeDownloads.value = torrents.filter((t: any) => t.state === 'downloading').length
  } catch {}
}

async function fetchOrganizeNotifs() {
  try {
    const res = await fetch('/api/organize/recent', { credentials: 'include' })
    if (!res.ok) return
    const notifs: any[] = await res.json()
    for (const n of notifs) {
      const key = `${n.hash}-${n.at}`
      if (seenNotifs.has(key)) continue
      seenNotifs.add(key)
      if (n.done > 0) {
        const msg = n.errors > 0
            ? `${n.name} — ${n.done} fichier(s) organisé(s), ${n.errors} erreur(s)`
            : `${n.name} — ${n.done} fichier(s) organisé(s) ✓`
        toast(msg, n.errors > 0 ? 'error' : 'success')
      }
    }
  } catch {}
}

// ── Cache images ───────────────────────────────────────────────
const imageCache = new Set<string>()

function precacheImages(series: any[]) {
  for (const s of series) {
    if (s.poster_image && !imageCache.has(s.poster_image)) {
      imageCache.add(s.poster_image)
      const img = new Image()
      img.src = s.poster_image
    }
  }
}

onMounted(async () => {
  if (store.series.length === 0) {
    await store.fetchSeries()
    precacheImages(store.series)
  }
  fetchActiveDownloads()
  fetchOrganizeNotifs()
  dlInterval = setInterval(() => {
    fetchActiveDownloads()
    fetchOrganizeNotifs()
  }, 10000)
})

// Refresh au retour sur le catalogue (après update ou scan)
onActivated(async () => {
  await store.fetchSeries()
  precacheImages(store.series)
  fetchActiveDownloads()
})

onUnmounted(() => {
  if (dlInterval) clearInterval(dlInterval)
})
</script>