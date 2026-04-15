<template>
  <div class="bg-card border border-border rounded-xl overflow-hidden">
    <!-- Header saison -->
    <div class="flex items-center justify-between px-5 py-3.5 border-b border-border">
      <div class="flex items-center gap-3">
        <button class="text-muted hover:text-primary transition-colors" @click="emit('toggle', season.id)">
          <ChevronUp :size="15" class="transition-transform duration-200" :class="collapsed ? 'rotate-180' : ''" />
        </button>
        <div>
          <h2 class="text-sm font-semibold text-primary">
            {{ season.season_number === 0 ? 'Spéciaux' : `Saison ${season.season_number}` }}
            <span v-if="season.title && season.title !== `Saison ${season.season_number}`" class="text-muted font-normal ml-1">
              — {{ season.title }}
            </span>
          </h2>
          <p class="text-xs text-muted mt-0.5">
            {{ season.episodes.length }} épisode{{ season.episodes.length > 1 ? 's' : '' }}
            <template v-if="availableCount > 0"> · {{ availableCount }}/{{ season.episodes.length }} dispo</template>
            <span
                v-if="season.organized_state !== 'none'"
                class="ml-1.5 px-1.5 py-0.5 rounded text-[10px]"
                :class="season.organized_state === 'complete' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-500'"
            >
              {{ season.organized_state === 'complete'
                ? `✓ ${season.organized_count} importé${season.organized_count > 1 ? 's' : ''}`
                : `${season.organized_count}/${availableCount || season.episodes.length} importés` }}
            </span>
          </p>
        </div>
      </div>

      <!-- Boutons saison -->
      <div class="flex items-center gap-2">
        <button
            v-if="!season.torrent && hasDownloadable"
            @click="emit('downloadSeason', season)"
            :disabled="downloadingSeason"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border bg-accent-muted text-accent border-accent/20 hover:bg-accent/20 transition"
        >
          <component :is="downloadingSeason ? loaderIcon : downloadIcon" />
          {{ downloadingSeason ? 'Envoi…' : 'Tout télécharger' }}
        </button>

        <button
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition"
            :class="canDownloadSeason
            ? 'bg-accent-muted text-accent border-accent/20 hover:bg-accent/20'
            : 'text-muted border-border cursor-not-allowed opacity-50'"
            :disabled="!canDownloadSeason"
            @click="canDownloadSeason && emit('download', `season-${season.id}`, season.torrent.torrent_url, season.torrent.magnet)"
        >
          <component :is="seasonBtnIcon" />
          {{ seasonBtnLabel }}
        </button>
      </div>
    </div>

    <!-- Progression saison -->
    <div v-if="seasonProgress && seasonProgress.progress < 100" class="px-5 pb-3 -mt-1">
      <div class="h-0.5 bg-border rounded-full overflow-hidden">
        <div class="h-full bg-accent rounded-full transition-all duration-500" :style="{ width: `${seasonProgress.progress}%` }" />
      </div>
      <p class="text-[11px] text-muted mt-1">{{ seasonProgress.progress }}%</p>
    </div>

    <!-- Épisodes -->
    <div v-if="!collapsed" class="divide-y divide-border/50">
      <div
          v-for="ep in season.episodes"
          :key="ep.id"
          class="px-5 py-3 hover:bg-hover/50 transition-colors"
          :class="{ 'opacity-40': !ep.available && !ep.organized }"
      >
        <div class="flex items-center gap-3">
          <!-- Thumbnail -->
          <div class="shrink-0 w-20 aspect-video rounded-md overflow-hidden bg-shell hidden sm:flex items-center justify-center text-muted text-xs font-mono">
            <img v-if="ep.thumb_image" :src="ep.thumb_image" class="w-full h-full object-cover" loading="lazy" />
            <span v-else>{{ season.season_number === 0 ? 'SP' : `E${ep.episode_number}` }}</span>
          </div>

          <!-- Infos épisode -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-xs text-muted shrink-0 font-mono">
                {{ season.season_number === 0 ? 'SP' : `E${String(ep.episode_number).padStart(2, '0')}` }}
              </span>
              <span class="text-sm text-primary truncate">{{ ep.title || `Épisode ${ep.episode_number}` }}</span>
              <span
                  v-if="ep.fankai === false || ep.torrent?.fankai === false"
                  class="shrink-0 text-[10px] px-1.5 py-0.5 rounded border bg-purple-500/10 text-purple-400 border-purple-500/20"
                  title="Ce fichier ne provient pas du catalogue Fan-Kai officiel"
              >Hors Fankai</span>
            </div>
            <div class="flex items-center gap-2 mt-0.5">
              <span v-if="ep.aired" class="text-xs text-muted">{{ formatDate(ep.aired) }}</span>
              <span v-if="ep.duration" class="text-xs text-muted">{{ formatDuration(ep.duration) }}</span>
            </div>
          </div>

          <!-- Bouton état épisode -->
          <button
              class="shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center transition-colors"
              :class="epBtnClass(ep)"
              :disabled="!ep.torrent || ep.organized || isAlreadyQueued(ep.torrent)"
              @click="ep.torrent && !ep.organized && !isAlreadyQueued(ep.torrent) && emit('download', `ep-${ep.id}`, ep.torrent.torrent_url, ep.torrent.magnet)"
          >
            <component :is="epStateIcon(ep)" />
          </button>

          <!-- Actions épisode importé -->
          <template v-if="ep.organized && organizedByEpisode[String(ep.id)]">
            <span
                v-if="epNeedsRename(ep)"
                class="shrink-0 text-[10px] px-1.5 py-0.5 rounded border bg-yellow-500/10 text-yellow-400 border-yellow-500/20 cursor-default"
                :title="`Actuel : ${organizedByEpisode[String(ep.id)]?.dest_filename}\nAttendu : ${epExpectedName(ep)}`"
            >Rename</span>

            <div class="relative" @click.stop>
              <button
                  @click="epMenuOpen = epMenuOpen === ep.id ? null : ep.id"
                  class="w-6 h-6 flex items-center justify-center rounded text-muted hover:text-primary transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
              </button>
              <div v-if="epMenuOpen === ep.id" class="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl p-1 z-20 w-44 shadow-xl flex flex-col gap-0.5">
                <button v-if="epNeedsRename(ep)" @click="emit('renameEpisode', ep, season); epMenuOpen = null" :disabled="epActionLoading[ep.id]" class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-primary hover:bg-hover transition-colors">
                  <svg width="11" height="11" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Renommer
                </button>
                <button @click="emit('unimportEpisode', ep, season, false); epMenuOpen = null" :disabled="epActionLoading[ep.id]" class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted hover:bg-hover transition-colors">
                  <svg width="11" height="11" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
                  Désimporter
                </button>
                <button @click="emit('unimportEpisode', ep, season, true); epMenuOpen = null" :disabled="epActionLoading[ep.id]" class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors">
                  <svg width="11" height="11" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
                  Supprimer le fichier
                </button>
              </div>
            </div>
          </template>
        </div>

        <!-- Barre progression épisode -->
        <div v-if="epProgress(ep) && epProgress(ep)!.progress < 100" class="mt-1.5 sm:pl-[92px]">
          <div class="h-0.5 bg-border rounded-full overflow-hidden">
            <div class="h-full bg-accent rounded-full transition-all duration-500" :style="{ width: `${epProgress(ep)!.progress}%` }" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue'
import { ChevronUp, Download, Loader, Check, X } from 'lucide-vue-next'

interface ActiveTorrent { hash: string; progress: number; state: string }

const props = defineProps<{
  season            : any
  collapsed         : boolean
  activeTorrents    : ActiveTorrent[]
  downloading       : string[]
  downloaded        : string[]
  organizedByEpisode: Record<string, any>
  epActionLoading   : Record<number, boolean>
  downloadingSeason ?: boolean
}>()

const emit = defineEmits<{
  toggle         : [id: number]
  download       : [key: string, url: string | null, magnet: string | null]
  downloadSeason : [season: any]
  renameEpisode  : [ep: any, season: any]
  unimportEpisode: [ep: any, season: any, deleteFile: boolean]
}>()

const epMenuOpen = ref<number | null>(null)
const downloadIcon = h(Download, { size: 12 })
const loaderIcon   = h(Loader, { size: 12, class: 'animate-spin' })

// ── Helpers hash / progress ────────────────────────────────────
function extractHash(torrent: any): string | null {
  if (!torrent?.magnet) return null
  const m = torrent.magnet.match(/xt=urn:btih:([a-fA-F0-9]{40})/i)
  return m ? m[1].toLowerCase() : null
}
function torrentProgress(hash: string | null | undefined): ActiveTorrent | null {
  if (!hash) return null
  return props.activeTorrents.find(t => t.hash.toLowerCase() === hash.toLowerCase()) ?? null
}
function isDownloading(key: string) { return props.downloading.includes(key) }
function isDownloaded(key: string)  { return props.downloaded.includes(key) }
function isAlreadyQueued(torrent: any): boolean {
  const hash = extractHash(torrent)
  if (!hash) return false
  return props.activeTorrents.some(t => t.hash.toLowerCase() === hash.toLowerCase())
}

// ── Computed saison ────────────────────────────────────────────
const availableCount = computed(() => props.season.episodes.filter((e: any) => e.available).length)
const seasonProgress = computed(() => torrentProgress(extractHash(props.season.torrent)))
const hasDownloadable = computed(() =>
    props.season.episodes.some((ep: any) =>
        ep.torrent && ep.available && !ep.organized && !isAlreadyQueued(ep.torrent) && !isDownloaded(`ep-${ep.id}`)
    )
)
const canDownloadSeason = computed(() =>
    !!props.season.torrent && !isDownloading(`season-${props.season.id}`) && !isDownloaded(`season-${props.season.id}`) && !isAlreadyQueued(props.season.torrent) && props.season.organized_state !== 'complete'
)
const seasonBtnLabel = computed(() => {
  if (props.season.organized_state === 'complete') return 'Importé'
  if (isAlreadyQueued(props.season.torrent)) return 'Déjà ajouté'
  if (isDownloaded(`season-${props.season.id}`)) return 'Envoyé'
  return 'Saison entière'
})
const seasonBtnIcon = computed(() => {
  if (props.season.organized_state === 'complete' || isDownloaded(`season-${props.season.id}`) || isAlreadyQueued(props.season.torrent)) return h(Check, { size: 12 })
  if (isDownloading(`season-${props.season.id}`)) return h(Loader, { size: 12, class: 'animate-spin' })
  if (!props.season.torrent) return h(X, { size: 12 })
  return h(Download, { size: 12 })
})

// ── État épisode ───────────────────────────────────────────────
function epProgress(ep: any) { return torrentProgress(extractHash(ep.torrent)) }

function epState(ep: any): 'idle' | 'loading' | 'done' | 'unavailable' {
  if (ep.organized || isDownloaded(`ep-${ep.id}`) || isAlreadyQueued(ep.torrent)) return 'done'
  const prog = epProgress(ep)
  if (prog && prog.progress < 100) return 'loading'
  if (!ep.torrent || !ep.available) return 'unavailable'
  if (isDownloading(`ep-${ep.id}`)) return 'loading'
  return 'idle'
}
function epStateIcon(ep: any) {
  const state = epState(ep)
  if (state === 'done')        return h(Check,    { size: 14 })
  if (state === 'loading')     return h(Loader,   { size: 14, class: 'animate-spin' })
  if (state === 'unavailable') return h(X,        { size: 14 })
  return h(Download, { size: 14 })
}
function epBtnClass(ep: any): string {
  const state = epState(ep)
  if (state === 'done')        return 'border-green-500/30 text-green-500 bg-green-500/10 cursor-default'
  if (state === 'loading')     return 'border-accent/30 text-accent bg-accent-muted cursor-default'
  if (state === 'unavailable') return 'border-border text-muted opacity-40 cursor-not-allowed'
  return 'border-border text-muted hover:border-accent hover:text-accent cursor-pointer'
}

// ── Rename helpers ─────────────────────────────────────────────
function epExpectedName(ep: any): string {
  const entry = props.organizedByEpisode[String(ep.id)]
  if (!entry) return ''
  const srcExt = entry.dest_filename ? '.' + entry.dest_filename.split('.').pop() : '.mkv'
  if (ep.nfo_filename) return ep.nfo_filename.replace(/\.[^.]+$/, '') + srcExt
  if (ep.formatted_name?.trim()) return ep.formatted_name.replace(/[<>:"/\\|?*]/g, '').trim() + srcExt
  return entry.dest_filename
}
function epNeedsRename(ep: any): boolean {
  const entry = props.organizedByEpisode[String(ep.id)]
  if (!entry) return false
  const expected = epExpectedName(ep)
  return !!expected && expected !== entry.dest_filename
}

function formatDate(d: string): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' })
}
function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return m > 0 ? `${h}h ${m}min` : `${h}h`
  return `${m} min`
}

defineExpose({ closeEpMenu: () => { epMenuOpen.value = null } })
</script>
