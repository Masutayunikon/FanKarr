<template>
  <div class="bg-card border border-border rounded-xl">
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
        <!-- Corbeille saison (admin uniquement) -->
        <button
            v-if="!requestMode && season.organized_count > 0"
            @click.stop="openUnimportSeasonModal"
            class="w-8 h-8 rounded-lg border flex items-center justify-center transition-colors border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20"
            title="Désimporter la saison"
        >
          <Trash2 :size="14" />
        </button>

        <!-- ── Mode demande ────────────────────────────────────── -->
        <template v-if="requestMode">
          <button
              @click.stop="emit('requestSeason', season.season_number)"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition"
              :class="isSeasonRequested
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 cursor-default'
                : 'bg-accent-muted text-accent border-accent/20 hover:bg-accent/20'"
          >
            <component :is="isSeasonRequested ? checkIcon : requestIcon" />
            {{ isSeasonRequested ? 'Demandé' : 'Demander' }}
          </button>
        </template>

        <!-- ── Mode téléchargement (admin) ─────────────────────── -->
        <template v-else>
          <!-- Pas de pack saison : bouton "Saison" (dropdown si plusieurs packs via intégrales) -->
          <template v-if="season.torrents.length === 0 && hasDownloadable">
            <div v-if="uniquePackOptions.length > 1" class="relative" @click.stop>
              <button
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition bg-accent-muted text-accent border-accent/20 hover:bg-accent/20"
                  @click="seasonMenuOpen = !seasonMenuOpen"
              >
                <component :is="downloadIcon" />
                Saison ▾
              </button>
              <div v-if="seasonMenuOpen" class="absolute right-0 bottom-full mb-1 bg-card border border-border rounded-xl p-1 z-20 w-56 shadow-xl flex flex-col gap-0.5">
                <button
                    v-for="opt in uniquePackOptions"
                    :key="opt.infohash"
                    class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-primary hover:bg-hover transition-colors text-left"
                    @click="emit('downloadSeason', season, opt.infohash); seasonMenuOpen = false"
                >
                  <component :is="downloadIcon" />
                  {{ opt.label }}
                </button>
              </div>
            </div>
            <button
                v-else
                @click="emit('downloadSeason', season)"
                :disabled="downloadingSeason"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border bg-accent-muted text-accent border-accent/20 hover:bg-accent/20 transition"
            >
              <component :is="downloadingSeason ? loaderIcon : downloadIcon" />
              {{ downloadingSeason ? 'Envoi…' : 'Saison' }}
            </button>
          </template>

          <!-- Pack saison unique -->
          <button
              v-if="season.torrents.length === 1"
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

          <!-- Dropdown packs saison multiples -->
          <div v-if="season.torrents.length > 1" class="relative" @click.stop>
            <button
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition bg-accent-muted text-accent border-accent/20 hover:bg-accent/20"
                @click="seasonMenuOpen = !seasonMenuOpen"
            >
              <component :is="downloadIcon" />
              Saison ▾
            </button>
            <div v-if="seasonMenuOpen" class="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl p-1 z-20 w-52 shadow-xl flex flex-col gap-0.5">
              <button
                  v-for="(t, i) in season.torrents"
                  :key="i"
                  class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-primary hover:bg-hover transition-colors"
                  :class="(isDownloaded(`season-${season.id}-${i}`) || isAlreadyQueued(t)) ? 'opacity-50 cursor-not-allowed' : ''"
                  :disabled="isDownloaded(`season-${season.id}-${i}`) || isAlreadyQueued(t)"
                  @click="!isDownloaded(`season-${season.id}-${i}`) && !isAlreadyQueued(t) && (emit('download', `season-${season.id}-${i}`, t.torrent_url, t.magnet), seasonMenuOpen = false)"
              >
                <component :is="(isDownloaded(`season-${season.id}-${i}`) || isAlreadyQueued(t)) ? checkIcon : downloadIcon" />
                {{ groupLabels(season.torrents)[i] }}
              </button>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Épisodes -->
    <div v-if="!collapsed" class="divide-y divide-border/50">
      <div
          v-for="ep in season.episodes"
          :key="ep.id"
          class="px-5 py-3 hover:bg-hover/50 transition-colors last:rounded-b-xl"
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
            <div class="flex items-center gap-2 mt-0.5 flex-wrap">
              <span v-if="ep.aired" class="text-xs text-muted">{{ formatDate(ep.aired) }}</span>
              <span v-if="ep.duration" class="text-xs text-muted">{{ formatDuration(ep.duration) }}</span>
              <!-- Badge langue -->
              <span
                  v-if="epLang(ep) === 'MULTI'"
                  title="Audio japonais + français"
                  class="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold leading-none px-1.5 py-0.5 rounded border bg-blue-500/10 border-blue-500/20 text-blue-300 select-none tracking-wide"
              >
                <!-- JP flag -->
                <svg width="14" height="10" viewBox="0 0 14 10" class="rounded-[1px] shrink-0"><rect width="14" height="10" fill="#fff"/><circle cx="7" cy="5" r="3" fill="#BC002D"/></svg>
                <!-- FR flag -->
                <svg width="14" height="10" viewBox="0 0 14 10" class="rounded-[1px] shrink-0"><rect width="14" height="10" fill="#ED2939"/><rect width="9.33" height="10" fill="#fff"/><rect width="4.67" height="10" fill="#002395"/></svg>
                MULTI
              </span>
              <span
                  v-else-if="epLang(ep) === 'VOSTFR'"
                  title="Audio japonais · Sous-titres français"
                  class="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold leading-none px-1.5 py-0.5 rounded border bg-amber-500/10 border-amber-500/20 text-amber-300 select-none tracking-wide"
              >
                <!-- JP flag -->
                <svg width="14" height="10" viewBox="0 0 14 10" class="rounded-[1px] shrink-0"><rect width="14" height="10" fill="#fff"/><circle cx="7" cy="5" r="3" fill="#BC002D"/></svg>
                <!-- FR flag -->
                <svg width="14" height="10" viewBox="0 0 14 10" class="rounded-[1px] shrink-0"><rect width="14" height="10" fill="#ED2939"/><rect width="9.33" height="10" fill="#fff"/><rect width="4.67" height="10" fill="#002395"/></svg>
                VOSTFR
              </span>
              <!-- Badge épisodes -->
              <span
                  v-if="parseEpChap(ep.plot).episodes"
                  class="shrink-0 text-[10px] font-medium leading-none px-1.5 py-0.5 rounded border bg-violet-500/10 border-violet-500/20 text-violet-300 select-none"
                  :title="`Plage d'épisodes couverts`"
              >{{ parseEpChap(ep.plot).episodes }}</span>
              <!-- Badge chapitres -->
              <span
                  v-if="parseEpChap(ep.plot).chapters"
                  class="shrink-0 text-[10px] font-medium leading-none px-1.5 py-0.5 rounded border bg-teal-500/10 border-teal-500/20 text-teal-300 select-none"
                  :title="`Plage de chapitres manga couverts`"
              >{{ parseEpChap(ep.plot).chapters }}</span>
            </div>
          </div>

          <!-- Bouton épisode -->
          <div v-if="!ep.organized" class="relative shrink-0" @click.stop>
            <!-- Mode demande -->
            <button
                v-if="requestMode"
                class="w-8 h-8 rounded-lg border flex items-center justify-center transition-colors"
                :class="isEpisodeRequested(ep.id)
                  ? 'border-blue-500/30 text-blue-400 bg-blue-500/10 cursor-default'
                  : 'border-border text-muted hover:border-accent hover:text-accent cursor-pointer'"
                :title="isEpisodeRequested(ep.id) ? 'Déjà demandé' : 'Demander cet épisode'"
                @click="handleEpRequestClick(ep)"
            >
              <component :is="isEpisodeRequested(ep.id) ? checkIcon : requestIcon" />
            </button>
            <!-- Mode téléchargement (admin) -->
            <button
                v-else
                class="w-8 h-8 rounded-lg border flex items-center justify-center transition-colors"
                :class="epBtnClass(ep)"
                :disabled="epState(ep) !== 'idle'"
                @click="handleEpBtnClick(ep)"
            >
              <component :is="epStateIcon(ep)" />
            </button>

            <!-- Dropdown sélection torrent — mode demande -->
            <div v-if="requestMode && epOptionsOpen === ep.id && ep.torrents && ep.torrents.length > 1"
                 class="absolute right-0 bottom-full mb-1 bg-card border border-border rounded-xl p-1 z-20 w-64 shadow-xl flex flex-col gap-0.5">
              <p class="px-3 pt-1.5 pb-0.5 text-[10px] text-muted font-medium uppercase tracking-wide">Choisir le torrent</p>
              <button
                  v-for="(t, i) in ep.torrents"
                  :key="i"
                  class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-primary hover:bg-hover transition-colors text-left"
                  @click="emit('requestEpisode', season.season_number, ep.id, t); epOptionsOpen = null"
              >
                <component :is="requestIcon" class="shrink-0" />
                <span class="truncate">{{ groupLabels(ep.torrents)[i] }}</span>
              </button>
            </div>

            <!-- Dropdown sélection torrent — mode téléchargement -->
            <div v-if="!requestMode && epOptionsOpen === ep.id && ep.torrents && ep.torrents.length > 1"
                 class="absolute right-0 bottom-full mb-1 bg-card border border-border rounded-xl p-1 z-20 w-52 shadow-xl flex flex-col gap-0.5">
              <button
                  v-for="(t, i) in ep.torrents"
                  :key="i"
                  class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-primary hover:bg-hover transition-colors"
                  :class="(isDownloaded(`ep-${ep.id}-${i}`) || isAlreadyQueued(t)) ? 'opacity-50 cursor-not-allowed' : ''"
                  :disabled="isDownloaded(`ep-${ep.id}-${i}`) || isAlreadyQueued(t)"
                  @click="!isDownloaded(`ep-${ep.id}-${i}`) && !isAlreadyQueued(t) && (emit('download', `ep-${ep.id}-${i}`, t.torrent_url, t.magnet, t.file_index ?? null, t.file_path ?? null, t.infohash ?? null), epOptionsOpen = null)"
              >
                <component :is="(isDownloaded(`ep-${ep.id}-${i}`) || isAlreadyQueued(t)) ? checkIcon : downloadIcon" />
                {{ groupLabels(ep.torrents)[i] }}
              </button>
            </div>
          </div>

          <!-- Actions épisode importé (admin uniquement) -->
          <template v-if="!requestMode && ep.organized && organizedByEpisode[String(ep.id)]">
            <!-- Badge rename cliquable -->
            <button
                v-if="epNeedsRename(ep)"
                @click.stop="emit('renameEpisode', ep, season)"
                :disabled="epActionLoading[ep.id]"
                class="shrink-0 text-[10px] px-1.5 py-0.5 rounded border bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20 transition-colors"
                :title="`Actuel : ${organizedByEpisode[String(ep.id)]?.dest_filename}\nAttendu : ${epExpectedName(ep)}`"
            >Rename</button>
            <!-- Corbeille épisode -->
            <button
                @click.stop="openUnimportModal(ep, season)"
                :disabled="epActionLoading[ep.id]"
                class="w-6 h-6 flex items-center justify-center rounded text-red-400 hover:bg-red-500/10 transition-colors"
                title="Désimporter l'épisode"
            >
              <Trash2 :size="12" />
            </button>
          </template>

          <!-- Chevron synopsis (à droite, visible si l'épisode a un plot) -->
          <button
              v-if="ep.plot"
              @click.stop="togglePlot(ep.id)"
              class="w-6 h-6 flex items-center justify-center rounded transition-colors shrink-0"
              :class="plotOpen === ep.id ? 'text-accent' : 'text-muted hover:text-primary'"
              title="Voir le synopsis"
          >
            <ChevronUp :size="14" class="transition-transform duration-200" :class="plotOpen === ep.id ? '' : 'rotate-180'" />
          </button>
        </div>

        <!-- Barre progression épisode -->
        <div v-if="epProgress(ep) && epProgress(ep)!.progress < 100" class="mt-1.5 sm:pl-[92px]">
          <div class="h-0.5 bg-border rounded-full overflow-hidden">
            <div class="h-full bg-accent rounded-full transition-all duration-500" :style="{ width: `${epProgress(ep)!.progress}%` }" />
          </div>
        </div>

        <!-- Synopsis -->
        <div v-if="plotOpen === ep.id && ep.plot" class="mt-2 sm:pl-[92px]">
          <p class="text-xs text-muted leading-relaxed" style="white-space: pre-line">{{ parseEpChap(ep.plot).cleanPlot }}</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal désimport épisode -->
  <Teleport to="body">
    <div v-if="unimportModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" @click.self="unimportModal = false">
      <div class="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl mx-4">
        <h3 class="text-sm font-semibold text-primary mb-1">Désimporter l'épisode</h3>
        <p class="text-xs text-muted mb-4">L'épisode sera retiré de la bibliothèque.</p>
        <label class="flex items-center gap-2 mb-5 cursor-pointer select-none">
          <input type="checkbox" v-model="deleteFileOnUnimport" class="accent-red-500" />
          <span class="text-xs text-muted">Supprimer le fichier du disque</span>
        </label>
        <div class="flex gap-2 justify-end">
          <button @click="unimportModal = false" class="px-4 py-2 text-xs rounded-lg border border-border text-muted hover:bg-hover transition-colors">Annuler</button>
          <button @click="confirmUnimport" class="px-4 py-2 text-xs rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-colors">
            {{ deleteFileOnUnimport ? 'Supprimer' : 'Désimporter' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Modal désimport saison -->
  <Teleport to="body">
    <div v-if="unimportSeasonModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" @click.self="unimportSeasonModal = false">
      <div class="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl mx-4">
        <h3 class="text-sm font-semibold text-primary mb-1">Désimporter la saison</h3>
        <p class="text-xs text-muted mb-4">Tous les épisodes importés de cette saison seront retirés de la bibliothèque.</p>
        <label class="flex items-center gap-2 mb-5 cursor-pointer select-none">
          <input type="checkbox" v-model="deleteSeasonFiles" class="accent-red-500" />
          <span class="text-xs text-muted">Supprimer les fichiers du disque</span>
        </label>
        <div class="flex gap-2 justify-end">
          <button @click="unimportSeasonModal = false" class="px-4 py-2 text-xs rounded-lg border border-border text-muted hover:bg-hover transition-colors">Annuler</button>
          <button @click="confirmUnimportSeason" class="px-4 py-2 text-xs rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-colors">
            {{ deleteSeasonFiles ? 'Supprimer' : 'Désimporter' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, h, onMounted, onUnmounted } from 'vue'
import { ChevronUp, Download, Loader, Check, X, Trash2 } from 'lucide-vue-next'

interface ActiveTorrent { hash: string; progress: number; state: string; files?: { index: number; progress: number; priority?: number }[] }

const props = defineProps<{
  season            : any
  collapsed         : boolean
  activeTorrents    : ActiveTorrent[]
  downloading       : string[]
  downloaded        : string[]
  organizedByEpisode: Record<string, any>
  epActionLoading   : Record<number, boolean>
  downloadingSeason ?: boolean
  nfoSupport        ?: boolean
  requestMode       ?: boolean   // true = boutons demande au lieu de téléchargement
  requestedSeasons  ?: number[]  // saisons déjà demandées par cet user pour cette série
  requestedEpisodes ?: number[]  // IDs d'épisodes déjà demandés par cet user pour cette série
}>()

const emit = defineEmits<{
  toggle         : [id: number]
  download       : [key: string, url: string | null, magnet: string | null, file_index?: number | null, file_path?: string | null, infohash?: string | null]
  downloadSeason : [season: any, packHash?: string]
  renameEpisode  : [ep: any, season: any]
  unimportEpisode: [ep: any, season: any, deleteFile: boolean]
  unimportSeason : [season: any, deleteFiles: boolean]
  // Mode demande
  requestSeason  : [seasonNumber: number]
  requestEpisode : [seasonNumber: number, episodeId: number, torrent?: any]
}>()

const requestIcon = h('svg', { viewBox: '0 0 24 24', stroke: 'currentColor', 'stroke-width': 2, fill: 'none', width: 12, height: 12 },
  [h('circle', { cx: 12, cy: 12, r: 10 }), h('path', { d: 'M12 8v4l2 2' })]
)

const isSeasonRequested = computed(() =>
  props.requestedSeasons?.includes(props.season.season_number) ?? false
)

/** Un épisode est "demandé" si sa saison l'est, ou si son ID est dans requestedEpisodes */
function isEpisodeRequested(episodeId: number): boolean {
  return isSeasonRequested.value || (props.requestedEpisodes?.includes(episodeId) ?? false)
}

const epOptionsOpen      = ref<number | null>(null)
const plotOpen           = ref<number | null>(null)
const seasonMenuOpen     = ref(false)
const unimportModal      = ref(false)
const deleteFileOnUnimport = ref(false)
const unimportEpTarget   = ref<{ ep: any; season: any } | null>(null)
const unimportSeasonModal = ref(false)
const deleteSeasonFiles  = ref(false)
const downloadIcon = h(Download, { size: 12 })
const loaderIcon   = h(Loader, { size: 12, class: 'animate-spin' })
const checkIcon    = h(Check, { size: 12 })

// ── Helpers hash / progress ────────────────────────────────────
function extractHash(torrent: any): string | null {
  // Préférer l'infohash direct (présent même si le magnet est absent)
  if (torrent?.infohash) return torrent.infohash.toLowerCase()
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
  // Pour un fichier dans un pack (file_index défini), le hash seul ne suffit pas :
  // le pack peut être actif sans que CE fichier spécifique soit en téléchargement.
  // On s'appuie uniquement sur downloading/downloaded pour ces cas.
  if (torrent?.file_index != null) return false
  const hash = extractHash(torrent)
  if (!hash) return false
  return props.activeTorrents.some(t => t.hash.toLowerCase() === hash.toLowerCase())
}

// ── Computed saison ────────────────────────────────────────────
const availableCount = computed(() => props.season.episodes.filter((e: any) => e.available).length)
const seasonProgress = computed(() => {
  if (props.season.torrents && props.season.torrents.length > 1) {
    for (const t of props.season.torrents) {
      const prog = torrentProgress(extractHash(t))
      if (prog) return prog
    }
    return null
  }
  return torrentProgress(extractHash(props.season.torrent))
})
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

// Vérifie si n'importe quelle clé de téléchargement pour cet épisode est marquée done/downloading
// (couvre ep-{id} pour torrent unique ET ep-{id}-{i} pour multi-torrent)
function epAnyDownloaded(ep: any): boolean {
  if (isDownloaded(`ep-${ep.id}`)) return true
  const count = ep.torrents?.length ?? 0
  for (let i = 0; i < count; i++) { if (isDownloaded(`ep-${ep.id}-${i}`)) return true }
  return false
}
function epAnyDownloading(ep: any): boolean {
  if (isDownloading(`ep-${ep.id}`)) return true
  const count = ep.torrents?.length ?? 0
  for (let i = 0; i < count; i++) { if (isDownloading(`ep-${ep.id}-${i}`)) return true }
  return false
}

function epProgress(ep: any): ActiveTorrent | null {
  if (ep.organized) return null

  // Chercher parmi toutes les options de torrent, pas seulement ep.torrent (= torrents[0])
  const candidates: Array<{ torrent: any; key0: string; keyI: string }> = []
  if (ep.torrents?.length > 0) {
    ep.torrents.forEach((t: any, i: number) => candidates.push({ torrent: t, key0: `ep-${ep.id}`, keyI: `ep-${ep.id}-${i}` }))
  } else if (ep.torrent) {
    candidates.push({ torrent: ep.torrent, key0: `ep-${ep.id}`, keyI: `ep-${ep.id}` })
  }

  for (const { torrent: t, key0, keyI } of candidates) {
    const active = torrentProgress(extractHash(t))
    if (!active) continue

    if (t.file_index != null) {
      const sessionDl = isDownloaded(key0) || isDownloaded(keyI)
      if (active.files && active.files.length > 0) {
        const file = active.files.find(f => f.index === t.file_index)
        // Avec données par fichier on se fie à la progression réelle du fichier précis.
        // Si le fichier est à 100% sans session active → déjà téléchargé hors session
        // (ex : désimporté puis re-consulté) → ne pas afficher le spinner.
        if (file != null && file.priority !== 0 && (sessionDl || file.progress < 1)) {
          return { ...active, progress: Math.round(file.progress * 100) }
        }
        if (!sessionDl) continue
      } else {
        // Pas de données par fichier : ignorer si pas de session active
        if (!sessionDl) continue
        return { ...active, progress: active.state === 'seeding' ? 100 : active.progress }
      }
    }
    return active
  }

  return null
}

function handleEpBtnClick(ep: any) {
  if (ep.organized) return
  if (ep.torrents && ep.torrents.length > 1) {
    // Plusieurs options → toggle dropdown
    epOptionsOpen.value = epOptionsOpen.value === ep.id ? null : ep.id
    return
  }
  // Option unique → téléchargement direct
  if (ep.torrent && !isAlreadyQueued(ep.torrent)) {
    emit('download', `ep-${ep.id}`, ep.torrent.torrent_url, ep.torrent.magnet, ep.torrent.file_index ?? null, ep.torrent.file_path ?? null, ep.torrent.infohash ?? null)
  }
}

function handleEpRequestClick(ep: any) {
  if (isEpisodeRequested(ep.id)) return
  if (ep.torrents && ep.torrents.length > 1) {
    // Plusieurs torrents → afficher le picker
    epOptionsOpen.value = epOptionsOpen.value === ep.id ? null : ep.id
    return
  }
  // Torrent unique ou aucun → émettre directement
  emit('requestEpisode', season.season_number, ep.id, ep.torrent ?? undefined)
}

function epState(ep: any): 'idle' | 'loading' | 'done' | 'unavailable' {
  // Vert uniquement quand importé dans la bibliothèque
  if (ep.organized) return 'done'
  // Spinner si : envoyé au client, déjà en cours dans le client, ou fichier en cours/terminé
  if (epAnyDownloaded(ep) || epAnyDownloading(ep) || isAlreadyQueued(ep.torrent)) return 'loading'
  const prog = epProgress(ep)
  if (prog) return 'loading'
  if (!ep.torrent || !ep.available) return 'unavailable'
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
  if (props.nfoSupport) {
    return ep.nfo_filename ? ep.nfo_filename.replace(/\.[^.]+$/, '') + srcExt : entry.dest_filename
  } else {
    // Préférer le formatted_name du torrent qui correspond au fichier importé.
    // On essaie de matcher par hash (si l'entrée organized l'expose), sinon on
    // cherche le premier torrent qui a un formatted_name.
    const usedHash = entry.hash?.toLowerCase() ?? null
    const matchedName = usedHash
      ? (ep.torrents ?? []).find((t: any) => t.infohash === usedHash)?.formatted_name
      : null
    const name = matchedName
      ?? (ep.torrents ?? []).find((t: any) => t.formatted_name)?.formatted_name
      ?? ep.formatted_name
    return name?.trim() ? name.replace(/[<>:"/\\|?*]/g, '').trim() + srcExt : entry.dest_filename
  }
}
function epNeedsRename(ep: any): boolean {
  const entry = props.organizedByEpisode[String(ep.id)]
  if (!entry) return false
  return entry.needs_rename === true
}

// ── Extraction épisodes / chapitres depuis le synopsis ─────────
// Cache léger pour éviter de recalculer pour chaque accès template (badges + synopsis)
const _epChapCache = new Map<string | null | undefined, ReturnType<typeof _parseEpChap>>()
/**
 * Extrait les plages d'épisodes et chapitres depuis un synopsis.
 * Ex: "...épisodes 628 à 634 soit les chapitres 700 à 706."
 * → { episodes: "628–634", chapters: "700–706", cleanPlot: "..." }
 * La phrase (ou ligne) contenant ces infos est retirée du synopsis affiché.
 */
function _parseEpChap(plot: string | null | undefined): {
  episodes: string | null
  chapters: string | null
  cleanPlot: string
} {
  const text = plot ?? ''

  const epMatch   = text.match(/[éeÉE]pisodes?\s+(\d+)(?:\s+[àa]\s+(\d+))?/i)
  const chapMatch = text.match(/chapitres?\s+(\d+)(?:\s+[àa]\s+(\d+))?/i)

  const episodes = epMatch
    ? (epMatch[2] ? `Ép. ${epMatch[1]}–${epMatch[2]}` : `Ép. ${epMatch[1]}`)
    : null
  const chapters = chapMatch
    ? (chapMatch[2] ? `Ch. ${chapMatch[1]}–${chapMatch[2]}` : `Ch. ${chapMatch[1]}`)
    : null

  // Retirer les lignes contenant les références d'épisodes ou chapitres
  let cleanPlot = text
  if (episodes || chapters) {
    cleanPlot = text
      .split(/\r?\n/)
      .filter(line => !/[éeÉE]pisodes?\s+\d+|chapitres?\s+\d+/i.test(line))
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  return { episodes, chapters, cleanPlot }
}
function parseEpChap(plot: string | null | undefined) {
  if (_epChapCache.has(plot)) return _epChapCache.get(plot)!
  const result = _parseEpChap(plot)
  _epChapCache.set(plot, result)
  return result
}

// ── Détection langue ───────────────────────────────────────────
function epLang(ep: any): 'MULTI' | 'VOSTFR' | null {
  const sources: string[] = [
    ep.formatted_name ?? '',
    ep.torrent?.torrent_name ?? '',
    ep.torrent?.raw ?? '',
    ...((ep.torrents ?? []) as any[]).map((t: any) => `${t.torrent_name ?? ''} ${t.raw ?? ''}`),
  ]
  for (const s of sources) {
    if (!s) continue
    if (/\bMULTI\b/i.test(s)) return 'MULTI'
    if (/\bVOSTFR\b/i.test(s)) return 'VOSTFR'
  }
  return null
}

// ── Labels de groupe ───────────────────────────────────────────
// Si tous les torrent_name sont présents ET distincts → on les utilise.
// Sinon → titre Nyaa brut (raw), plus informatif quand les noms se ressemblent.
function labelFromRaw(raw: string, index: number): string {
  if (!raw) return `Option ${index + 1}`
  return raw.length > 65 ? raw.slice(0, 65) + '…' : raw
}

function groupLabels(torrents: any[]): string[] {
  const names = torrents.map((t: any) => t.torrent_name ?? null)
  const allPresent = names.every(n => n !== null && String(n).trim() !== '')
  const allUnique  = allPresent && new Set(names).size === names.length
  if (allUnique) return names as string[]
  // Fallback : titre Nyaa brut
  return torrents.map((t: any, i: number) => labelFromRaw(t.raw ?? '', i))
}

// Packs parents distincts couvrant cette saison (quand pas de pack saison explicite)
// Permet le dropdown "Saison ▾" quand une saison est couverte par plusieurs intégrales.
// Un torrent individuel par épisode (hash unique) n'est PAS un pack → ignoré ici,
// le bouton "Saison" simple suffira pour lancer tous les épisodes.
const uniquePackOptions = computed(() => {
  if (props.season.torrents?.length) return []

  // Compter combien d'épisodes chaque hash couvre
  const hashCount   = new Map<string, number>()
  const hashTorrent = new Map<string, any>()
  for (const ep of props.season.episodes) {
    if (!ep.available) continue
    for (const t of (ep.torrents ?? [])) {
      const hash = t.infohash ?? extractHash(t)
      if (!hash) continue
      hashCount.set(hash, (hashCount.get(hash) ?? 0) + 1)
      if (!hashTorrent.has(hash)) hashTorrent.set(hash, t)
    }
  }

  // Garder uniquement les hash qui couvrent ≥ 2 épisodes (= vrais packs / intégrales)
  const packs = [...hashCount.entries()]
    .filter(([, count]) => count > 1)
    .map(([hash]) => ({ infohash: hash, torrent: hashTorrent.get(hash)! }))

  if (packs.length <= 1) return []
  const labels = groupLabels(packs.map(r => r.torrent))
  return packs.map((r, i) => ({ infohash: r.infohash, label: labels[i] }))
})

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

function togglePlot(epId: number) {
  plotOpen.value = plotOpen.value === epId ? null : epId
}

function openUnimportModal(ep: any, season: any) {
  unimportEpTarget.value   = { ep, season }
  deleteFileOnUnimport.value = false
  unimportModal.value      = true
}

function confirmUnimport() {
  if (!unimportEpTarget.value) return
  emit('unimportEpisode', unimportEpTarget.value.ep, unimportEpTarget.value.season, deleteFileOnUnimport.value)
  unimportModal.value = false
  unimportEpTarget.value = null
}

function openUnimportSeasonModal() {
  deleteSeasonFiles.value   = false
  unimportSeasonModal.value = true
}

function confirmUnimportSeason() {
  emit('unimportSeason', props.season, deleteSeasonFiles.value)
  unimportSeasonModal.value = false
}

function closeAllMenus() {
  epOptionsOpen.value  = null
  seasonMenuOpen.value = false
}

onMounted(()   => document.addEventListener('click', closeAllMenus))
onUnmounted(() => document.removeEventListener('click', closeAllMenus))

defineExpose({ closeEpMenu: closeAllMenus })
</script>
