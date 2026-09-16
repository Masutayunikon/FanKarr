<template>
  <div class="px-4 md:px-10 pt-[26px] pb-12">
    <div class="flex flex-col gap-[18px]">

      <SeriesToolbar
          v-model:search="search"
          v-model:active-filter="activeFilter"
          v-model:active-sort="activeSort"
          v-model:poster-size="posterSize"
          v-model:selecting="selecting"
          :poster-sizes="posterSizes"
          :count="filtered.length"
          :filters="filters"
          :more-filters="moreFilters"
          :sort-options="sortOptions"
          :selectable="auth.isAdmin"
      />

      <div data-tour="series-grid" class="pt-1.5">

        <div v-if="store.loadingSeries && store.series.length === 0" class="flex flex-col items-center justify-center gap-3 h-64 text-muted">
          <div class="w-6 h-6 border border-border border-t-accent rounded-full animate-spin" />
          <p class="text-body">Chargement de la médiathèque…</p>
        </div>

        <div v-else-if="store.error && store.series.length === 0" class="flex flex-col items-center justify-center gap-3 h-64">
          <p class="text-body text-err">{{ store.error }}</p>
          <button class="btn-primary" @click="store.fetchSeries()">Réessayer</button>
        </div>

        <div v-else-if="filtered.length === 0" class="flex flex-col items-center justify-center gap-3 h-64 text-center">
          <p class="font-display text-xl font-bold text-primary">Aucune série trouvée</p>
          <p class="text-body text-muted">Essayez une autre recherche ou un autre filtre.</p>
          <button v-if="search || activeFilter !== 'all'" @click="search = ''; activeFilter = 'all'" class="btn-ghost btn-sm">Tout afficher</button>
        </div>

        <div
            v-else
            class="grid grid-cols-2 gap-x-3.5 gap-y-5 sm:grid-cols-[repeat(auto-fill,minmax(var(--poster-min),1fr))] sm:gap-x-5 sm:gap-y-[26px]"
            :style="{ '--poster-min': posterSizes[posterSize] }"
        >
          <template v-for="item in gridItems" :key="item.key">

            <!-- Tuile lettre (tri alphabétique) -->
            <div
                v-if="item.type === 'letter'"
                class="@container aspect-[2/3] rounded-poster border border-border-light bg-linear-to-b from-card to-main max-sm:hidden flex flex-col justify-between px-[11%] pt-[11%] pb-[10%] overflow-hidden select-none"
                aria-hidden="true"
            >
              <span class="font-display text-[80cqw] leading-[0.9] font-extrabold text-accent">{{ item.letter }}</span>
              <span class="text-[clamp(11px,9cqw,12.5px)] text-secondary">{{ plural(item.count, 'série') }}</span>
            </div>

            <component
                v-else
                :is="selecting ? 'button' : RouterLink"
                v-bind="selecting ? { type: 'button', 'aria-pressed': selected.has(item.serie.id) } : { to: `/series/${item.serie.id}` }"
                :data-tour="item.first ? 'series-poster' : undefined"
                class="group flex flex-col gap-[9px] min-w-0 text-left"
                :class="{ 'cursor-pointer select-none': selecting }"
                @click="selecting && toggleSelected(item.serie.id)"
            >
              <div
                  class="relative aspect-[2/3] rounded-poster overflow-hidden bg-card shadow-[0_0_0_1px_rgb(239_233_221/0.06)] transition-transform duration-200 group-hover:-translate-y-0.5"
                  :class="{ 'ring-2 ring-accent': selected.has(item.serie.id) }"
              >
                <img
                    v-if="item.serie.poster_image"
                    :src="item.serie.poster_image"
                    :alt="item.serie.title"
                    loading="lazy"
                    class="w-full h-full object-cover"
                    :class="{ 'grayscale brightness-[0.45]': item.state.dim && auth.isAdmin, 'brightness-[0.55] saturate-[0.7]': item.state.dim && !auth.isAdmin }"
                />
                <div v-else class="w-full h-full flex items-center justify-center text-muted">
                  <Tv :size="28" />
                </div>

                <!-- Haut gauche : sélection ou importée -->
                <span
                    v-if="selecting"
                    class="absolute left-2 top-2 w-6 h-6 rounded-full border flex items-center justify-center"
                    :class="selected.has(item.serie.id) ? 'bg-accent border-accent text-on-accent' : 'bg-sidebar/80 border-primary/50'"
                >
                  <Check v-if="selected.has(item.serie.id)" :size="14" :stroke-width="3" />
                </span>
                <span v-else-if="item.state.imported" title="Importée" class="absolute left-2 top-2 w-6 h-6 rounded-full bg-sidebar/80 text-ok flex items-center justify-center">
                  <Check :size="13" :stroke-width="3" />
                </span>

                <span v-if="item.state.watched" title="Surveillée : nouveaux épisodes téléchargés automatiquement" class="absolute right-2 top-2 w-6 h-6 rounded-full bg-sidebar/80 text-accent flex items-center justify-center">
                  <Rss :size="12" :stroke-width="2.5" />
                </span>
                <span v-else-if="item.state.requested" class="absolute right-2 top-2 h-6 px-[9px] rounded-full bg-sidebar/84 text-accent text-[11.5px] font-bold flex items-center gap-1.5">
                  <Clock3 :size="12" :stroke-width="2.25" /> Demandée
                </span>

                <!-- Bas : téléchargement en cours -->
                <div
                    v-if="item.state.progress !== null"
                    class="absolute inset-x-0 bottom-0 px-2.5 pt-[30px] pb-2.5 bg-linear-to-b from-sidebar/0 to-sidebar/92 to-65% flex flex-col gap-1.5"
                >
                  <div class="flex justify-between text-[11.5px] font-bold text-primary">
                    <span>Téléchargement</span><span v-if="item.state.progress >= 0">{{ item.state.progress }}&nbsp;%</span>
                  </div>
                  <div class="h-[3px] rounded-[2px] bg-primary/20 overflow-hidden">
                    <div class="h-full rounded-[2px] bg-accent transition-[width] duration-500" :style="{ width: `${Math.max(0, item.state.progress)}%` }" />
                  </div>
                </div>

                <!-- Bas : état écrit -->
                <span
                    v-else-if="item.state.chip"
                    class="absolute left-2 bottom-2 h-6 px-[9px] rounded-full bg-sidebar/84 text-[11.5px] font-bold flex items-center gap-1.5 whitespace-nowrap max-w-[calc(100%-16px)]"
                    :class="chipTone[item.state.chip.tone]"
                    :title="item.state.chip.title"
                >
                  <TriangleAlert v-if="item.state.chip.icon === 'error'" :size="12" :stroke-width="2.25" class="shrink-0" />
                  <Folder v-else-if="item.state.chip.icon === 'folder'" :size="12" :stroke-width="2.25" class="shrink-0" />
                  <Clock3 v-else-if="item.state.chip.icon === 'soon'" :size="12" :stroke-width="2.25" class="shrink-0" />
                  <span class="truncate">{{ item.state.chip.label }}</span>
                  <span v-if="item.state.chip.detail" class="text-secondary font-medium">{{ item.state.chip.detail }}</span>
                </span>

                <span
                    v-if="item.state.isNew"
                    class="stamp-new absolute left-2"
                    :class="item.state.chip || item.state.progress !== null ? 'bottom-[42px]' : 'bottom-2.5'"
                >NOUVEAU</span>
              </div>

              <div class="flex flex-col gap-0.5 min-w-0">
                <span class="text-body font-medium truncate" :class="item.state.dim ? 'text-secondary' : 'text-primary'">{{ item.serie.title }}</span>
                <span class="text-xs text-muted truncate">{{ [item.serie.year, statusLabel(item.serie.status)].filter(Boolean).join(' · ') }}</span>
              </div>
            </component>
          </template>
        </div>
      </div>
    </div>

    <div v-if="selecting" class="sticky bottom-4 z-10 mt-8 mx-auto w-fit max-w-full bg-card border border-border rounded-card px-4 py-3 flex items-center gap-x-3 gap-y-2 flex-wrap shadow-[0_16px_40px_rgb(0_0_0/0.5)]">
      <span class="text-body font-bold text-primary">{{ plural(selected.size, 'sélectionnée') }}</span>
      <button @click="selectAllFiltered" class="text-meta text-accent hover:underline">Tout sélectionner ({{ filtered.length }})</button>
      <button v-if="selected.size > 0" @click="clearSelection" class="text-meta text-secondary hover:text-primary">Tout désélectionner</button>
      <span class="hidden sm:block w-px h-6 bg-hover" />
      <div class="flex items-center gap-2 flex-wrap">
        <button @click="bulkRename" :disabled="bulkBusy || selected.size === 0" class="btn-secondary btn-sm">Renommer les fichiers</button>
        <button @click="bulkSync(true)" :disabled="bulkBusy || selected.size === 0" class="btn-secondary btn-sm">Surveiller</button>
        <button @click="bulkSync(false)" :disabled="bulkBusy || selected.size === 0" class="btn-secondary btn-sm">Ne plus surveiller</button>
        <button @click="selecting = false" class="btn-icon btn-sm" title="Quitter la sélection" aria-label="Quitter la sélection"><X :size="14" /></button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted, onActivated, onDeactivated } from 'vue'
import { RouterLink } from 'vue-router'
import { Check, Clock3, Folder, Rss, TriangleAlert, Tv, X } from 'lucide-vue-next'
import { useSeriesStore, type Serie } from '@/stores/series'
import { useDownloadsStore } from '@/stores/downloads'
import { useAuthStore }      from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { usePosterSize } from '@/composables/usePosterSize'
import { useLibrarySearch } from '@/composables/useLibrarySearch'
import { isNew, statusLabel } from '@/utils/series'
import { plural } from '@/utils/format'
import SeriesToolbar, { type LibraryFilter } from '@/components/series/SeriesToolbar.vue'

defineOptions({ name: 'SeriesView' })

const store     = useSeriesStore()
const dlStore   = useDownloadsStore()
const auth      = useAuthStore()
const librarySearch = useLibrarySearch()
const { add: toast } = useToast()
const { current: posterSize, sizes: posterSizes } = usePosterSize()

const search       = ref('')
const activeFilter = ref('all')
const activeSort   = ref('alpha')

const sortOptions = [
  { label: 'De A à Z', value: 'alpha' },
  { label: 'De Z à A', value: 'alpha-desc' },
  { label: 'Année de sortie', value: 'recent' },
  { label: "Importées d'abord", value: 'imported' },
]

// ── Filtres à compteur ──
const myRequested = ref<Set<number>>(new Set())

const predicates: Record<string, (s: Serie) => boolean> = {
  'all'        : () => true,
  'complete'   : s => s.download_state === 'complete',
  'partial'    : s => s.download_state === 'partial',
  'downloading': s => s.download_state === 'downloading',
  'to-download': s => s.download_state === 'none' && s.has_torrents,
  'no-torrent' : s => s.download_state === 'none' && !s.has_torrents,
  'not-here'   : s => s.download_state === 'none',
  'mine'       : s => myRequested.value.has(s.id),
  'available'  : s => s.has_torrents,
  'untracked'  : s => !s.in_client && !s.has_files,
  'watched'    : s => s.rss_synced,
}

const countOf = (value: string) => store.series.filter(predicates[value]!).length

const filters = computed<LibraryFilter[]>(() => (auth.isAdmin
  ? [
      { value: 'all',         label: 'Toutes' },
      { value: 'complete',    label: 'Importées' },
      { value: 'partial',     label: 'Partielles' },
      { value: 'downloading', label: 'En téléchargement', attention: true },
      { value: 'to-download', label: 'À télécharger' },
      { value: 'no-torrent',  label: 'Sans torrent' },
    ]
  : [
      { value: 'all',         label: 'Toutes' },
      { value: 'complete',    label: 'Prêtes à regarder' },
      { value: 'partial',     label: 'Partielles' },
      { value: 'downloading', label: 'Bientôt là', attention: true },
      { value: 'not-here',    label: 'Pas encore là' },
      { value: 'mine',        label: 'Mes demandes', attention: true },
    ]
).map(f => ({ ...f, count: countOf(f.value) })))

const moreFilters = computed<LibraryFilter[]>(() => auth.isAdmin
  ? [
      { value: 'available', label: 'Avec torrent' },
      { value: 'watched',   label: 'Surveillées' },
      { value: 'untracked', label: 'Absentes du client et du disque' },
    ].map(f => ({ ...f, count: countOf(f.value) }))
  : [])

const filtered = computed(() => {
  let list = store.series.filter(predicates[activeFilter.value] ?? predicates.all!)

  if (search.value.trim()) {
    const q = normalize(search.value)
    list = list.filter(s => normalize(s.title).includes(q))
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

function normalize(text: string) {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

// ── État des séries ──
const errorsBySerie = ref<Map<number, number>>(new Map())
const staleFolders  = ref<Set<number>>(new Set())

const chipTone: Record<string, string> = {
  err    : 'text-err',
  accent : 'text-accent',
  primary: 'text-primary',
  muted  : 'text-secondary',
}

interface PosterState {
  imported : boolean
  watched  : boolean
  requested: boolean
  dim      : boolean
  isNew    : boolean
  progress : number | null
  chip     : { label: string; detail?: string; tone: string; icon?: string; title?: string } | null
}

function downloadProgress(s: Serie): number | null {
  if (s.download_state !== 'downloading') return null
  const active = dlStore.torrents.filter(t => t.serieId === s.id && t.state === 'downloading')
  if (active.length === 0) return -1
  const size = active.reduce((sum, t) => sum + (t.size ?? 0), 0)
  const done = active.reduce((sum, t) => sum + (t.downloaded ?? 0), 0)
  return Math.round(size > 0 ? done / size * 100 : active[0].progress ?? 0)
}

function posterState(s: Serie): PosterState {
  const partial = s.download_state === 'partial'
    ? { label: 'Partielle', detail: s.episode_count ? `${s.organized_count}/${s.episode_count}` : undefined, tone: 'primary' }
    : null

  if (!auth.isAdmin) {
    const notHere = s.download_state === 'none'
    return {
      imported : false,
      watched  : false,
      requested: myRequested.value.has(s.id),
      dim      : notHere,
      isNew    : s.download_state !== 'none' && isNew(s.last_imported_at),
      progress : null,
      chip     : s.download_state === 'downloading' ? { label: 'Bientôt là', tone: 'accent', icon: 'soon' }
               : partial ?? (notHere ? { label: 'Pas encore là', tone: 'muted' } : null),
    }
  }

  const errors = errorsBySerie.value.get(s.id) ?? 0
  return {
    imported : s.download_state === 'complete',
    watched  : s.rss_synced,
    requested: false,
    dim      : s.download_state === 'none' && !s.has_torrents,
    isNew    : isNew(s.last_imported_at),
    progress : errors ? null : downloadProgress(s),
    chip     : errors ? { label: plural(errors, 'erreur'), tone: 'err', icon: 'error', title: 'Import en erreur' }
             : staleFolders.value.has(s.id) ? { label: 'À renommer', tone: 'accent', icon: 'folder', title: 'Nom de dossier différent du titre' }
             : partial ?? (s.download_state === 'none' && !s.has_torrents ? { label: 'Sans torrent', tone: 'muted' } : null),
  }
}

// ── Grille ──
function letterOf(title: string) {
  const c = normalize(title).charAt(0).toUpperCase()
  return /[A-Z]/.test(c) ? c : '#'
}

type GridItem =
  | { type: 'letter'; key: string; letter: string; count: number }
  | { type: 'serie'; key: number; serie: Serie; state: PosterState; first: boolean }

const gridItems = computed<GridItem[]>(() => {
  const withLetters = activeSort.value === 'alpha' || activeSort.value === 'alpha-desc'
  const counts = new Map<string, number>()
  if (withLetters) for (const s of filtered.value) counts.set(letterOf(s.title), (counts.get(letterOf(s.title)) ?? 0) + 1)

  const items: GridItem[] = []
  let letter = ''
  filtered.value.forEach((serie, i) => {
    if (withLetters && letterOf(serie.title) !== letter) {
      letter = letterOf(serie.title)
      items.push({ type: 'letter', key: `letter-${letter}`, letter, count: counts.get(letter) ?? 0 })
    }
    items.push({ type: 'serie', key: serie.id, serie, state: posterState(serie), first: i === 0 })
  })
  return items
})

// ── Sélection multiple ──
const selecting = ref(false)
const selected  = ref<Set<number>>(new Set())
const bulkBusy  = ref(false)

watch(selecting, on => { if (!on) clearSelection() })

function toggleSelected(id: number) {
  const next = new Set(selected.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selected.value = next
}
function selectAllFiltered() { selected.value = new Set(filtered.value.map(s => s.id)) }
function clearSelection()    { selected.value = new Set() }

async function bulkRename() {
  bulkBusy.value = true
  try {
    const res  = await fetch('/api/rename-all', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ serie_ids: [...selected.value] }),
    })
    const data = await res.json()
    if (!res.ok) { toast(data.error ?? 'Impossible de renommer les fichiers', 'error'); return }
    const errs = data.errors?.length ?? 0
    toast(`${plural(data.done, 'fichier renommé', 'fichiers renommés')}${errs ? ` · ${plural(errs, 'erreur')}` : ''}`, errs ? 'error' : 'success')
  } catch {
    toast('Impossible de contacter le serveur', 'error')
  } finally {
    bulkBusy.value = false
  }
}

async function bulkSync(enabled: boolean) {
  bulkBusy.value = true
  try {
    const targets = store.series.filter((s: Serie) => selected.value.has(s.id))
    const res  = await fetch('/api/rss-sync/bulk', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ enabled, series: targets.map((s: Serie) => ({ id: s.id, name: s.title })) }),
    })
    const data = await res.json()
    if (!res.ok) { toast(data.error ?? 'Impossible de mettre à jour la surveillance', 'error'); return }
    for (const s of targets) s.rss_synced = enabled
    const n = data.changed
    toast(enabled
      ? `${plural(n, 'série ajoutée', 'séries ajoutées')} à la surveillance`
      : `${plural(n, 'série retirée', 'séries retirées')} de la surveillance`, 'success')
  } catch {
    toast('Impossible de contacter le serveur', 'error')
  } finally {
    bulkBusy.value = false
  }
}

// ── Suivi des téléchargements et des imports ──
let dlInterval: ReturnType<typeof setInterval> | null = null
const seenNotifs = new Set<string>()
let notifsPrimed = false

async function fetchOrganizeNotifs() {
  try {
    const res = await fetch('/api/organize/recent', { credentials: 'include' })
    if (!res.ok) return
    const notifs: any[] = await res.json()

    // Erreurs du dernier passage de chaque torrent, par série
    const errors = new Map<number, number>()
    const latest = new Set<string>()
    for (const n of notifs) {
      if (latest.has(n.hash)) continue
      latest.add(n.hash)
      if (n.errors > 0 && n.serieId != null) errors.set(n.serieId, (errors.get(n.serieId) ?? 0) + n.errors)
    }
    errorsBySerie.value = errors

    const primed = notifsPrimed
    notifsPrimed = true
    let hasNew = false
    for (const n of notifs) {
      const key = `${n.hash}-${n.at}`
      if (seenNotifs.has(key)) continue
      seenNotifs.add(key)
      if (!primed) continue
      hasNew = true
      if (n.done > 0) {
        const msg = n.errors > 0
            ? `${n.name} : ${plural(n.done, 'fichier importé', 'fichiers importés')}, ${plural(n.errors, 'erreur')}`
            : `${n.name} : ${plural(n.done, 'fichier importé', 'fichiers importés')}`
        toast(msg, n.errors > 0 ? 'error' : 'success')
      }
    }
    if (hasNew) await store.fetchSeries()
  } catch {}
}

async function fetchStaleFolders() {
  try {
    const res = await fetch('/api/organized-folders', { credentials: 'include' })
    if (res.ok) staleFolders.value = new Set((await res.json()).map((f: any) => f.serie_id))
  } catch {}
}

async function fetchMyRequests() {
  try {
    const res = await fetch('/api/requests', { credentials: 'include' })
    if (!res.ok) return
    const list: any[] = await res.json()
    myRequested.value = new Set(list.filter(r => r.status === 'pending' || r.status === 'approved').map(r => r.serieId))
  } catch {}
}

onMounted(async () => {
  if (store.series.length === 0) await store.fetchSeries()
  if (auth.isAdmin) {
    dlStore.refresh()
    fetchOrganizeNotifs()
    fetchStaleFolders()
    dlInterval = setInterval(() => {
      dlStore.refresh()
      fetchOrganizeNotifs()
    }, 10000)
  }
})

let isActive = false
function applyLibrarySearch() {
  const q = librarySearch.consume()
  if (q === null) return
  if (q) search.value = q
  nextTick(() => document.querySelector<HTMLInputElement>('[data-library-search]')?.focus())
}
watch(librarySearch.pending, (p) => { if (p && isActive) applyLibrarySearch() })
onDeactivated(() => { isActive = false })

onActivated(async () => {
  isActive = true
  applyLibrarySearch()
  store.fetchSeries()
  if (auth.isAdmin) { dlStore.refresh(); fetchStaleFolders() }
  else fetchMyRequests()
})

onUnmounted(() => {
  if (dlInterval) clearInterval(dlInterval)
})
</script>
