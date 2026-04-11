<template>
  <div class="flex flex-col">

    <!-- Toolbar -->
    <div class="shrink-0 px-4 md:px-6 py-3 border-b border-border flex flex-col gap-2">

      <!-- Ligne 1 : recherche + filtres -->
      <div class="flex items-center gap-2">

        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" :size="14" />
          <input
              v-model="search"
              type="text"
              placeholder="Rechercher…"
              class="settings-input pl-9 w-full py-1.5 text-sm"
          />
        </div>

        <!-- Filtres : icône only sur mobile, texte sur desktop -->
        <div class="relative shrink-0" ref="filterRef">
          <button
              @click="filterOpen = !filterOpen"
              class="btn-secondary flex items-center gap-1.5 py-1.5 px-2.5 relative"
              :class="hasActiveFilter ? 'border-accent text-accent' : ''"
              title="Filtres"
          >
            <SlidersHorizontal :size="15" />
            <span class="hidden md:inline text-xs">Filtres</span>
            <ChevronDown class="hidden md:inline transition-transform" :size="12" :class="filterOpen ? 'rotate-180' : ''" />
            <span v-if="hasActiveFilter" class="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-accent" />
          </button>

          <div
              v-if="filterOpen"
              class="absolute top-full right-0 mt-1 bg-card border border-border rounded-xl p-3 z-20 w-52 flex flex-col gap-3 shadow-xl"
          >
            <div>
              <p class="text-xs text-muted mb-1.5">Disponibilité</p>
              <div class="flex flex-col gap-1">
                <button
                    v-for="f in filtersDisponibilite" :key="f.value"
                    @click="activeFilter = f.value"
                    class="flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors"
                    :class="activeFilter === f.value ? 'bg-active text-primary' : 'text-secondary hover:bg-hover'"
                >
                  {{ f.label }}
                  <span v-if="activeFilter === f.value" class="w-1.5 h-1.5 rounded-full bg-accent" />
                </button>
              </div>
            </div>
            <div class="border-t border-border pt-3">
              <p class="text-xs text-muted mb-1.5">État import</p>
              <div class="flex flex-col gap-1">
                <button
                    v-for="f in filtersImport" :key="f.value"
                    @click="activeFilter = f.value"
                    class="flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors"
                    :class="activeFilter === f.value ? 'bg-active text-primary' : 'text-secondary hover:bg-hover'"
                >
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full shrink-0" :style="{ background: f.color }" />
                    {{ f.label }}
                  </div>
                  <span v-if="activeFilter === f.value" class="w-1.5 h-1.5 rounded-full bg-accent" />
                </button>
              </div>
            </div>
            <button
                v-if="hasActiveFilter"
                @click="activeFilter = 'all'"
                class="text-xs text-muted hover:text-primary transition-colors text-left pt-1 border-t border-border"
            >
              Effacer les filtres
            </button>
          </div>
        </div>
      </div>

      <!-- Ligne 2 : tri + taille + count -->
      <div class="flex items-center gap-2 flex-wrap">
        <div class="flex items-center gap-1">
          <button
              v-for="s in sortOptions" :key="s.value"
              @click="activeSort = s.value"
              class="px-2.5 py-1 text-xs rounded-lg border transition-colors"
              :class="activeSort === s.value
              ? 'border-accent text-accent bg-accent-muted'
              : 'border-border text-muted hover:border-secondary'"
          >
            {{ s.label }}
          </button>
        </div>

        <div class="flex items-center gap-1 border-l border-border pl-2 ml-auto">
          <button
              v-for="(_, size) in posterSizes" :key="size"
              @click="posterSize = size"
              class="w-7 h-7 text-[10px] rounded-md border transition-colors flex items-center justify-center"
              :class="posterSize === size
              ? 'border-accent text-accent bg-accent-muted'
              : 'border-border text-muted hover:border-secondary'"
          >
            {{ size }}
          </button>
        </div>

        <span class="text-xs text-muted">{{ filtered.length }} série{{ filtered.length > 1 ? 's' : '' }}</span>
      </div>
    </div>

    <!-- Légende barres -->
    <div class="shrink-0 px-4 md:px-6 py-2 flex items-center gap-4 border-b border-border">
      <div v-for="l in legend" :key="l.label" class="flex items-center gap-1.5">
        <span class="w-3 h-1.5 rounded-full" :style="{ background: l.color }" />
        <span class="text-[11px] text-muted">{{ l.label }}</span>
      </div>
    </div>

    <!-- Grille -->
    <div class="px-4 md:px-6 py-6">

      <div v-if="store.loadingSeries" class="flex flex-col items-center justify-center gap-3 h-64 text-muted">
        <div class="w-6 h-6 border border-border border-t-accent rounded-full animate-spin" />
        <p class="text-sm">Chargement du catalogue…</p>
      </div>

      <div v-else-if="store.error" class="flex flex-col items-center justify-center gap-3 h-64">
        <p class="text-sm text-red-400">{{ store.error }}</p>
        <button class="btn-primary" @click="store.fetchSeries()">Réessayer</button>
      </div>

      <div v-else-if="filtered.length === 0" class="flex items-center justify-center h-64 text-muted text-sm">
        Aucune série trouvée
      </div>

      <div v-else class="grid gap-4" :style="{ gridTemplateColumns: `repeat(auto-fill, minmax(${posterSizes[posterSize]}, 1fr))` }">
        <RouterLink
            v-for="serie in filtered"
            :key="serie.id"
            :to="`/series/${serie.id}`"
            class="group flex flex-col gap-1.5 transition-transform duration-200 hover:-translate-y-0.5"
            :class="{ 'opacity-40': !serie.has_torrents && serie.download_state === 'none' }"
        >
          <div class="relative aspect-[2/3] rounded-lg overflow-hidden bg-card border border-border">
            <img
                v-if="serie.poster_image"
                :src="serie.poster_image"
                :alt="serie.title"
                loading="lazy"
                class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-muted">
              <Tv :size="28" />
            </div>

            <div class="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              <span class="text-xs text-white border border-white/30 px-3 py-1 rounded-md">Voir</span>
            </div>

            <div
                class="absolute bottom-0 left-0 right-0 h-1"
                :style="{ background: stateColor(serie.download_state) }"
            />
          </div>

          <div>
            <p class="text-xs font-medium truncate leading-snug text-primary">{{ serie.title }}</p>
            <div class="flex items-center gap-1.5 mt-0.5">
              <span v-if="serie.year" class="text-[11px] text-muted">{{ serie.year }}</span>
              <span
                  v-if="serie.status"
                  class="text-[10px] px-1.5 py-0.5 rounded"
                  :class="serie.status.toLowerCase() === 'continuing'
                  ? 'bg-green-500/10 text-green-400'
                  : 'bg-hover text-muted'"
              >
                {{ serie.status }}
              </span>
            </div>
          </div>
        </RouterLink>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, onActivated } from 'vue'
import { RouterLink } from 'vue-router'
import { Search, SlidersHorizontal, ChevronDown, Tv } from 'lucide-vue-next'
import { onClickOutside } from '@vueuse/core'
import { useSeriesStore } from '@/stores/series'
import { useDownloadsStore } from '@/stores/downloads'
import { useToast } from '@/composables/useToast'
import { usePosterSize } from '@/composables/usePosterSize'

defineOptions({ name: 'SeriesView' })

const store     = useSeriesStore()
const dlStore   = useDownloadsStore()
const { add: toast } = useToast()
const { current: posterSize, sizes: posterSizes } = usePosterSize()

const search       = ref('')
const activeFilter = ref('all')
const activeSort   = ref('alpha')
const filterOpen   = ref(false)
const filterRef    = ref<HTMLElement | null>(null)

onClickOutside(filterRef, () => { filterOpen.value = false })

const filtersDisponibilite = [
  { label: 'Toutes',       value: 'all' },
  { label: 'Disponibles',  value: 'available' },
  { label: 'Sans torrent', value: 'unavailable' },
]

const filtersImport = [
  { label: 'Importés',  value: 'complete',    color: '#22c55e' },
  { label: 'En cours',  value: 'downloading', color: '#3b82f6' },
  { label: 'Partiel',   value: 'partial',     color: '#9b59b6' },
]

const sortOptions = [
  { label: 'A→Z',      value: 'alpha' },
  { label: 'Z→A',      value: 'alpha-desc' },
  { label: 'Récents',  value: 'recent' },
  { label: 'Importés', value: 'imported' },
]

const legend = [
  { label: 'Importé',      color: '#22c55e' },
  { label: 'En cours',     color: '#3b82f6' },
  { label: 'Partiel',      color: '#9b59b6' },
  { label: 'Non importé',  color: 'var(--border)' },
]

const hasActiveFilter = computed(() => activeFilter.value !== 'all')

const filtered = computed(() => {
  let list = [...store.series]

  if (activeFilter.value === 'available')   list = list.filter(s => s.has_torrents)
  if (activeFilter.value === 'unavailable') list = list.filter(s => !s.has_torrents)
  if (activeFilter.value === 'complete')    list = list.filter(s => s.download_state === 'complete')
  if (activeFilter.value === 'downloading') list = list.filter(s => ['downloading', 'partial'].includes(s.download_state))
  if (activeFilter.value === 'partial')     list = list.filter(s => s.download_state === 'partial')

  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter(s => s.title.toLowerCase().includes(q))
  }

  switch (activeSort.value) {
    case 'alpha':      list.sort((a, b) => a.title.localeCompare(b.title, 'fr')); break
    case 'alpha-desc': list.sort((a, b) => b.title.localeCompare(a.title, 'fr')); break
    case 'recent':     list.sort((a, b) => (b.year ?? 0) - (a.year ?? 0)); break
    case 'imported': {
      const order: Record<string, number> = { complete: 0, partial: 1, downloading: 2, none: 3 }
      list.sort((a, b) => (order[a.download_state] ?? 3) - (order[b.download_state] ?? 3))
      break
    }
  }

  return list
})

function stateColor(state: string): string {
  return ({
    complete   : '#22c55e',
    downloading: '#3b82f6',
    partial    : '#9b59b6',
    none       : 'transparent',
  } as Record<string, string>)[state] ?? 'transparent'
}

// ── Polling downloads + notifs import ────────────────────────
let dlInterval: ReturnType<typeof setInterval> | null = null
const seenNotifs = new Set<string>()

async function fetchOrganizeNotifs() {
  try {
    const res = await fetch('/api/organize/recent', { credentials: 'include' })
    if (!res.ok) return
    const notifs: any[] = await res.json()
    let hasNew = false
    for (const n of notifs) {
      const key = `${n.hash}-${n.at}`
      if (seenNotifs.has(key)) continue
      seenNotifs.add(key)
      hasNew = true
      if (n.done > 0) {
        const msg = n.errors > 0
            ? `${n.name} — ${n.done} fichier(s) importé(s), ${n.errors} erreur(s)`
            : `${n.name} — ${n.done} fichier(s) importé(s) ✓`
        toast(msg, n.errors > 0 ? 'error' : 'success')
      }
    }
    if (hasNew) await store.fetchSeries()
  } catch {}
}

onMounted(async () => {
  if (store.series.length === 0) await store.fetchSeries()
  dlStore.refresh()
  fetchOrganizeNotifs()
  dlInterval = setInterval(() => {
    dlStore.refresh()
    fetchOrganizeNotifs()
  }, 10000)
})

onActivated(async () => {
  store.fetchSeries()
  dlStore.refresh()
})

onUnmounted(() => {
  if (dlInterval) clearInterval(dlInterval)
})
</script>