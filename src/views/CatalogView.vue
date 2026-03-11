<template>
  <div class="min-h-screen bg-zinc-950 text-zinc-100">

    <!-- Header -->
    <header class="sticky top-0 z-50 bg-zinc-950/90 backdrop-blur border-b border-white/5">
      <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <span class="text-2xl font-serif tracking-tight">
          <span class="text-zinc-100">Fan</span><span class="text-orange-500">karr</span>
        </span>
        <div class="flex items-center gap-2">
          <!-- Icône downloads avec badge -->
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
        <div class="flex gap-1">
          <button
              v-for="f in filters"
              :key="f.value"
              class="px-3 py-1.5 rounded-lg text-xs font-medium border transition"
              :class="activeFilter === f.value
              ? 'bg-orange-500 border-orange-500 text-white'
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

            <!-- Badge torrents dispo -->
            <div v-if="serie.has_torrents" class="absolute top-2 right-2 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
              {{ serie.torrent_count }}
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
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

const filters = [
  { label: 'Toutes', value: 'all' },
  { label: 'Disponibles', value: 'available' },
  { label: 'Sans torrent', value: 'unavailable' },
]

const filtered = computed(() => {
  let list = store.series
  if (activeFilter.value === 'available') list = list.filter(s => s.has_torrents)
  if (activeFilter.value === 'unavailable') list = list.filter(s => !s.has_torrents)
  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter(s => s.title.toLowerCase().includes(q))
  }
  return list
})

async function handleLogout() {
  await auth.logout()
  await router.push('/auth')
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

onMounted(() => {
  if (store.series.length === 0) store.fetchSeries()
  fetchActiveDownloads()
  fetchOrganizeNotifs()
  dlInterval = setInterval(() => {
    fetchActiveDownloads()
    fetchOrganizeNotifs()
  }, 10000)
})

onUnmounted(() => {
  if (dlInterval) clearInterval(dlInterval)
})
</script>