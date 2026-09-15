<template>
  <section class="bg-card rounded-card">
    <div class="flex items-center gap-3.5 px-4 sm:px-5 py-3.5 flex-wrap" :class="{ 'border-b border-hover': !collapsed }">
      <button
          class="w-8 h-8 pointer-coarse:w-10 pointer-coarse:h-10 -ml-1.5 rounded-full flex items-center justify-center text-muted hover:text-primary hover:bg-hover transition-colors shrink-0"
          :aria-expanded="!collapsed"
          :aria-label="collapsed ? 'Déplier la saison' : 'Replier la saison'"
          @click="emit('toggle', season.id)"
      >
        <ChevronUp :size="16" :stroke-width="2" class="transition-transform duration-200" :class="collapsed ? 'rotate-180' : ''" />
      </button>

      <div class="flex-1 min-w-[160px] flex flex-col gap-[3px] cursor-pointer" @click="emit('toggle', season.id)">
        <h2 class="font-display text-[17px] font-bold text-primary">
          {{ season.season_number === 0 ? 'Spéciaux' : `Saison ${season.season_number}` }}
          <span v-if="season.title && season.title !== `Saison ${season.season_number}`" class="font-sans text-sm font-normal text-muted">· {{ season.title }}</span>
        </h2>
        <p class="text-meta text-muted">{{ seasonMeta }}</p>
      </div>

      <div class="flex items-center gap-2.5 flex-wrap">
        <!-- ── Mode demande ── -->
        <template v-if="requestMode">
          <span v-if="season.organized_state === 'complete'" class="flex items-center gap-[7px] text-meta text-ok">
            <Check :size="14" :stroke-width="2.5" /> Saison complète
          </span>
          <span v-else-if="isSeasonRequested" class="flex items-center gap-[7px] text-meta text-accent">
            <Clock3 :size="14" :stroke-width="2" /> {{ requestStatus === 'approved' ? 'Demandée · bientôt là' : 'Demandée · en attente de réponse' }}
          </span>
          <button
              v-else
              @click.stop="emit('requestSeason', season.season_number)"
              class="btn-secondary btn-sm"
          >
            <Clock3 :size="14" :stroke-width="2" />
            {{ missingCount === season.episodes.length ? 'Demander la saison' : missingCount > 1 ? `Demander ${missingCount} épisodes` : "Demander l'épisode manquant" }}
          </button>
        </template>

        <!-- ── Mode téléchargement (admin) ── -->
        <template v-else>
          <span v-if="season.organized_state === 'complete'" class="flex items-center gap-[7px] text-meta text-ok">
            <Check :size="14" :stroke-width="2.5" /> Saison complète
          </span>
          <span v-else-if="season.organized_state === 'partial'" class="text-meta text-secondary">
            Partielle {{ season.organized_count }}/{{ availableCount || season.episodes.length }}
          </span>


          <template v-if="season.torrents.length === 0 && hasDownloadable">
            <div v-if="uniquePackOptions.length > 1" class="relative" @click.stop>
              <button class="btn-secondary btn-sm" @click="seasonMenuOpen = !seasonMenuOpen" aria-haspopup="menu" :aria-expanded="seasonMenuOpen">
                <Download :size="14" />
                Télécharger {{ downloadableLabel }}
                <ChevronDown :size="12" :stroke-width="2.5" />
              </button>
              <div v-if="seasonMenuOpen" class="menu absolute right-0 top-full mt-1.5 w-72 max-w-[90vw] z-20" role="menu">
                <button
                    v-for="opt in uniquePackOptions"
                    :key="opt.infohash"
                    role="menuitem"
                    class="menu-item"
                    @click="emit('downloadSeason', season, opt.infohash); seasonMenuOpen = false"
                >
                  <Download :size="14" class="shrink-0" />
                  <span class="truncate">{{ opt.label }}</span>
                </button>
              </div>
            </div>
            <button
                v-else
                @click="emit('downloadSeason', season)"
                :disabled="downloadingSeason"
                class="btn-secondary btn-sm"
            >
              <Loader v-if="downloadingSeason" :size="14" class="animate-spin" />
              <Download v-else :size="14" />
              {{ downloadingSeason ? 'Envoi…' : `Télécharger ${downloadableLabel}` }}
            </button>
          </template>

          <button
              v-if="season.torrents.length === 1 && season.organized_state !== 'complete'"
              class="btn-secondary btn-sm"
              :disabled="!canDownloadSeason"
              @click="canDownloadSeason && emit('download', `season-${season.id}`, season.torrent.torrent_url, season.torrent.magnet)"
          >
            <component :is="seasonBtnIcon" />
            {{ seasonBtnLabel }}
          </button>

          <div v-if="season.torrents.length > 1 && season.organized_state !== 'complete'" class="relative" @click.stop>
            <button class="btn-secondary btn-sm" @click="seasonMenuOpen = !seasonMenuOpen" aria-haspopup="menu" :aria-expanded="seasonMenuOpen">
              <Download :size="14" />
              Télécharger la saison
              <ChevronDown :size="12" :stroke-width="2.5" />
            </button>
            <div v-if="seasonMenuOpen" class="menu absolute right-0 top-full mt-1.5 w-72 max-w-[90vw] z-20" role="menu">
              <button
                  v-for="(t, i) in (season.torrents as any[])"
                  :key="i"
                  role="menuitem"
                  :title="t.raw ?? t.torrent_name ?? ''"
                  class="menu-item"
                  :disabled="isDownloaded(`season-${season.id}-${i}`) || isAlreadyQueued(t)"
                  @click="!isDownloaded(`season-${season.id}-${i}`) && !isAlreadyQueued(t) && (emit('download', `season-${season.id}-${i}`, t.torrent_url, t.magnet), seasonMenuOpen = false)"
              >
                <component :is="(isDownloaded(`season-${season.id}-${i}`) || isAlreadyQueued(t)) ? checkIcon : downloadIcon" />
                <span class="truncate">{{ groupLabels(season.torrents)[i] }}</span>
              </button>
            </div>
          </div>

          <button
              v-if="season.organized_count > 0"
              @click.stop="openUnimportSeasonModal"
              class="w-8 h-8 pointer-coarse:w-10 pointer-coarse:h-10 rounded-full flex items-center justify-center text-muted hover:text-err hover:bg-err/10 transition-colors"
              title="Retirer la saison de la médiathèque"
              aria-label="Retirer la saison de la médiathèque"
          >
            <Trash2 :size="15" />
          </button>
        </template>
      </div>
    </div>

    <div v-if="!collapsed">
      <div
          v-for="ep in season.episodes"
          :key="ep.id"
          class="px-4 sm:px-5 py-2 border-t border-hover first:border-t-0 hover:bg-hover/30 transition-colors last:rounded-b-card"
      >
        <div class="flex items-center gap-3 sm:gap-3.5">
          <div
              class="shrink-0 w-[64px] h-[36px] sm:w-[88px] sm:h-[50px] rounded-[4px] overflow-hidden bg-main flex items-center justify-center text-muted text-xs"
              :class="{ 'opacity-50': !requestMode && !ep.available && !ep.organized }"
          >
            <img v-if="ep.thumb_image" :src="ep.thumb_image" alt="" class="w-full h-full object-cover" loading="lazy" />
            <span v-else>{{ season.season_number === 0 ? 'SP' : `E${ep.episode_number}` }}</span>
          </div>

          <div class="flex-1 min-w-0 flex flex-col gap-[3px]">
            <div class="flex items-center gap-2.5 min-w-0">
              <span class="w-[26px] shrink-0 text-[11.5px] text-muted tabular-nums max-sm:hidden">
                {{ season.season_number === 0 ? 'SP' : `E${String(ep.episode_number).padStart(2, '0')}` }}
              </span>
              <span class="text-[14.5px] font-medium truncate" :class="!requestMode && !ep.available && !ep.organized ? 'text-muted' : 'text-primary'">
                {{ ep.title || `Épisode ${ep.episode_number}` }}
              </span>
              <span
                  v-if="ep.fankai === false || ep.torrent?.fankai === false"
                  class="shrink-0 h-[19px] px-[7px] rounded-[4px] border border-border text-[10.5px] font-bold text-muted flex items-center"
                  title="Ce fichier n'est pas une version officielle Fankai"
              >Hors Fankai</span>
            </div>
            <span v-if="episodeMeta(ep)" class="sm:pl-9 text-meta text-muted truncate" :title="episodeMeta(ep)">{{ episodeMeta(ep) }}</span>
          </div>

          <!-- ── État et actions, mode demande ── -->
          <template v-if="requestMode">
            <span v-if="ep.organized" class="shrink-0 flex items-center gap-[7px] text-meta text-ok">
              <Check :size="14" :stroke-width="2.5" /> <span class="max-sm:sr-only">Disponible</span>
            </span>
            <span v-else-if="isEpisodeRequested(ep.id)" class="shrink-0 flex items-center gap-[7px] text-meta text-accent">
              <Clock3 :size="14" :stroke-width="2" /> <span class="max-sm:sr-only">{{ requestStatus === 'approved' ? 'Demandé · bientôt là' : 'Demandé' }}</span>
            </span>
            <div v-else class="relative shrink-0" @click.stop>
              <button class="btn-secondary btn-sm pointer-fine:h-[30px] max-sm:w-10 max-sm:px-0" @click="handleEpRequestClick(ep)" title="Demander l'épisode" aria-label="Demander l'épisode">
                <Plus :size="13" :stroke-width="2" /> <span class="max-sm:hidden">Demander</span>
                <ChevronDown v-if="ep.torrents && ep.torrents.length > 1" :size="12" :stroke-width="2.5" />
              </button>
              <div v-if="epOptionsOpen === ep.id && ep.torrents && ep.torrents.length > 1" class="menu absolute right-0 bottom-full mb-1.5 w-80 max-w-[90vw] z-20" role="menu">
                <p class="tag-label px-3 pt-1.5 pb-1">Choisir la version</p>
                <button
                    v-for="(t, i) in (ep.torrents as any[])"
                    :key="i"
                    role="menuitem"
                    :title="t.raw ?? t.torrent_name ?? ''"
                    class="menu-item items-start"
                    @click="emit('requestEpisode', season.season_number, ep.id, t); epOptionsOpen = null"
                >
                  <Clock3 :size="14" class="shrink-0 mt-0.5" />
                  <span class="whitespace-normal break-words">{{ t.raw ?? t.torrent_name ?? `Option ${i + 1}` }}</span>
                </button>
              </div>
            </div>
          </template>

          <!-- ── État et actions, admin ── -->
          <template v-else>
            <template v-if="ep.organized">
              <button
                  v-if="organizedByEpisode[String(ep.id)] && epNeedsRename(ep)"
                  @click.stop="emit('renameEpisode', ep, season)"
                  :disabled="epActionLoading[ep.id]"
                  class="pill pill-wait h-[26px] px-2.5 shrink-0 hover:bg-accent-muted transition-colors"
                  :title="`Le fichier ne porte pas le nom attendu.\nActuel : ${organizedByEpisode[String(ep.id)]?.dest_filename}\nAttendu : ${epExpectedName(ep)}`"
              >
                <Loader v-if="epActionLoading[ep.id]" :size="12" class="animate-spin" />
                <PencilLine v-else :size="12" :stroke-width="2.25" />
                <span class="max-sm:hidden">Renommer</span>
              </button>
              <span class="shrink-0 flex items-center gap-[7px] text-meta text-ok">
                <Check :size="14" :stroke-width="2.5" /> <span class="max-sm:sr-only">Importé</span>
              </span>
            </template>

            <span v-else-if="epState(ep) === 'loading'" class="shrink-0 flex items-center gap-[7px] text-meta text-accent">
              <Clock3 :size="14" :stroke-width="2" />
              <template v-if="epProgress(ep) && epProgress(ep)!.progress > 0 && epProgress(ep)!.progress < 100"><span class="max-sm:hidden">Téléchargement · </span>{{ epProgress(ep)!.progress }}&nbsp;%</template>
              <span v-else class="max-sm:sr-only">En file d'attente</span>
            </span>

            <span v-else-if="epState(ep) === 'unavailable'" class="shrink-0 text-meta text-muted">Sans torrent</span>

            <div v-else class="relative shrink-0" @click.stop>
              <button class="btn-secondary btn-sm pointer-fine:h-[30px] max-sm:w-10 max-sm:px-0" @click="handleEpBtnClick(ep)" title="Télécharger l'épisode" aria-label="Télécharger l'épisode">
                <Download :size="13" /> <span class="max-sm:hidden">Télécharger</span>
                <ChevronDown v-if="ep.torrents && ep.torrents.length > 1" :size="12" :stroke-width="2.5" />
              </button>
              <div v-if="epOptionsOpen === ep.id && ep.torrents && ep.torrents.length > 1" class="menu absolute right-0 bottom-full mb-1.5 w-72 max-w-[90vw] z-20" role="menu">
                <button
                    v-for="(t, i) in (ep.torrents as any[])"
                    :key="i"
                    role="menuitem"
                    :title="t.raw ?? t.torrent_name ?? ''"
                    class="menu-item"
                    :disabled="isDownloaded(`ep-${ep.id}-${i}`) || isAlreadyQueued(t)"
                    @click="!isDownloaded(`ep-${ep.id}-${i}`) && !isAlreadyQueued(t) && (emit('download', `ep-${ep.id}-${i}`, t.torrent_url, t.magnet, t.file_index ?? null, t.file_path ?? null, t.infohash ?? null), epOptionsOpen = null)"
                >
                  <component :is="(isDownloaded(`ep-${ep.id}-${i}`) || isAlreadyQueued(t)) ? checkIcon : downloadIcon" />
                  <span class="truncate">{{ groupLabels(ep.torrents)[i] }}</span>
                </button>
              </div>
            </div>

            <button
                v-if="ep.organized && organizedByEpisode[String(ep.id)]"
                @click.stop="openUnimportModal(ep, season)"
                :disabled="epActionLoading[ep.id]"
                class="w-[30px] h-[30px] pointer-coarse:w-10 pointer-coarse:h-10 shrink-0 rounded-full flex items-center justify-center text-muted hover:text-err hover:bg-err/10 transition-colors"
                title="Retirer l'épisode de la médiathèque"
                aria-label="Retirer l'épisode de la médiathèque"
            >
              <Trash2 :size="14" />
            </button>
          </template>

          <button
              v-if="ep.plot"
              @click.stop="togglePlot(ep.id)"
              class="w-[30px] h-[30px] pointer-coarse:w-10 pointer-coarse:h-10 shrink-0 rounded-full flex items-center justify-center transition-colors"
              :class="plotOpen === ep.id ? 'text-accent' : 'text-muted hover:text-primary hover:bg-hover'"
              :aria-expanded="plotOpen === ep.id"
              title="Voir le synopsis"
          >
            <ChevronDown :size="14" class="transition-transform duration-200" :class="plotOpen === ep.id ? 'rotate-180' : ''" />
          </button>
        </div>

        <div v-if="epProgress(ep) && epProgress(ep)!.progress < 100" class="progress mt-2 sm:ml-[138px]">
          <div class="progress-bar" :style="{ width: `${epProgress(ep)!.progress}%` }" />
        </div>

        <p v-if="plotOpen === ep.id && ep.plot" class="mt-2 mb-1 sm:ml-[138px] text-meta text-secondary leading-relaxed whitespace-pre-line max-w-[760px]">
          {{ parseEpChap(ep.plot).cleanPlot }}
        </p>
      </div>
    </div>
  </section>

  <Teleport to="body">
    <div v-if="unimportModal" class="modal-backdrop" @click.self="unimportModal = false">
      <div class="modal max-w-sm" role="dialog" aria-modal="true" aria-labelledby="unimport-ep-title">
        <div class="flex flex-col gap-1">
          <h3 id="unimport-ep-title" class="card-title">Retirer l'épisode de la médiathèque</h3>
          <p class="text-meta text-muted">L'épisode sera retiré de la médiathèque. Le fichier reste sur le disque, sauf si vous cochez la case.</p>
        </div>
        <label class="flex items-center gap-3 cursor-pointer select-none">
          <input type="checkbox" v-model="deleteFileOnUnimport" class="w-4 h-4 rounded" />
          <span class="text-body text-secondary">Supprimer le fichier du disque</span>
        </label>
        <div class="flex gap-2.5 justify-end">
          <button @click="unimportModal = false" class="btn-ghost">Annuler</button>
          <button @click="confirmUnimport" class="btn-danger">
            {{ deleteFileOnUnimport ? 'Supprimer' : 'Retirer' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <Teleport to="body">
    <div v-if="unimportSeasonModal" class="modal-backdrop" @click.self="unimportSeasonModal = false">
      <div class="modal max-w-sm" role="dialog" aria-modal="true" aria-labelledby="unimport-season-title">
        <div class="flex flex-col gap-1">
          <h3 id="unimport-season-title" class="card-title">Retirer la saison de la médiathèque</h3>
          <p class="text-meta text-muted">Les épisodes importés de cette saison seront retirés de la médiathèque. Les fichiers restent sur le disque, sauf si vous cochez la case.</p>
        </div>
        <label class="flex items-center gap-3 cursor-pointer select-none">
          <input type="checkbox" v-model="deleteSeasonFiles" class="w-4 h-4 rounded" />
          <span class="text-body text-secondary">Supprimer les fichiers du disque</span>
        </label>
        <div class="flex gap-2.5 justify-end">
          <button @click="unimportSeasonModal = false" class="btn-ghost">Annuler</button>
          <button @click="confirmUnimportSeason" class="btn-danger">
            {{ deleteSeasonFiles ? 'Supprimer' : 'Retirer' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, h, onMounted, onUnmounted } from 'vue'
import { ChevronDown, ChevronUp, Clock3, Download, Loader, Check, PencilLine, Plus, X, Trash2 } from 'lucide-vue-next'
import { plural } from '@/utils/format'

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
  requestedSeasons  ?: number[]  // saisons déjà demandées par l'utilisateur pour cette série
  requestedEpisodes ?: number[]  // IDs d'épisodes déjà demandés par l'utilisateur pour cette série
  requestStatus     ?: string    // statut de la demande en cours de l'utilisateur
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

const isSeasonRequested = computed(() =>
  props.requestedSeasons?.includes(props.season.season_number) ?? false
)

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
const downloadIcon = h(Download, { size: 14, class: 'shrink-0' })
const checkIcon    = h(Check, { size: 14, class: 'shrink-0' })

// ── Hash et progression ──
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
  // Fichier d'un pack : le hash ne suffit pas, on se fie à downloading/downloaded
  if (torrent?.file_index != null) return false
  const hash = extractHash(torrent)
  if (!hash) return false
  return props.activeTorrents.some(t => t.hash.toLowerCase() === hash.toLowerCase())
}

// ── État de la saison ──
const availableCount = computed(() => props.season.episodes.filter((e: any) => e.available).length)
const hasDownloadable = computed(() =>
    props.season.episodes.some((ep: any) =>
        ep.torrent && ep.available && !ep.organized && !isAlreadyQueued(ep.torrent) && !isDownloaded(`ep-${ep.id}`)
    )
)
const canDownloadSeason = computed(() =>
    !!props.season.torrent && !isDownloading(`season-${props.season.id}`) && !isDownloaded(`season-${props.season.id}`) && !isAlreadyQueued(props.season.torrent) && props.season.organized_state !== 'complete'
)
const seasonBtnLabel = computed(() => {
  if (props.season.organized_state === 'complete') return 'Importée'
  if (isAlreadyQueued(props.season.torrent)) return 'Déjà dans le client'
  if (isDownloaded(`season-${props.season.id}`)) return 'Envoyée au client'
  return 'Télécharger la saison'
})
const seasonBtnIcon = computed(() => {
  if (props.season.organized_state === 'complete' || isDownloaded(`season-${props.season.id}`) || isAlreadyQueued(props.season.torrent)) return h(Check, { size: 14 })
  if (isDownloading(`season-${props.season.id}`)) return h(Loader, { size: 14, class: 'animate-spin' })
  if (!props.season.torrent) return h(X, { size: 14 })
  return h(Download, { size: 14 })
})

// ── Résumés de saison ──
const queuedCount = computed(() => props.season.episodes.filter((ep: any) => !ep.organized && epState(ep) === 'loading').length)
const missingCount = computed(() => props.season.episodes.filter((ep: any) => !ep.organized).length)
const downloadableCount = computed(() =>
    props.season.episodes.filter((ep: any) => ep.torrent && ep.available && !ep.organized && !isAlreadyQueued(ep.torrent) && !isDownloaded(`ep-${ep.id}`)).length
)
const downloadableLabel = computed(() => {
  if (downloadableCount.value === props.season.episodes.length) return 'la saison'
  return downloadableCount.value > 1 ? `${downloadableCount.value} épisodes` : "l'épisode"
})

// Admin : « 12 épisodes · 12 disponibles · 5 importés · 1 en file » ; invité : ce qui est déjà visible
const seasonMeta = computed(() => {
  const total = props.season.episodes.length
  const parts = [plural(total, 'épisode')]
  if (props.requestMode) {
    const ready = props.season.organized_count ?? 0
    parts.push(ready === 0 ? 'aucun disponible' : ready >= total ? 'tous disponibles' : plural(ready, 'disponible'))
    return parts.join(' · ')
  }
  if (availableCount.value > 0) parts.push(plural(availableCount.value, 'disponible'))
  if (props.season.organized_count > 0) parts.push(plural(props.season.organized_count, 'importé'))
  if (queuedCount.value > 0) parts.push(`${queuedCount.value} en file`)
  return parts.join(' · ')
})

// Date · durée · langue · versions · plages d'épisodes et de chapitres, en texte
function episodeMeta(ep: any): string {
  const { episodes, chapters } = parseEpChap(ep.plot)
  const sources = ep.torrents?.length > 1 ? `${ep.torrents.length} versions` : ''
  return [ep.aired && formatDate(ep.aired), ep.duration && formatDuration(ep.duration), epLang(ep), sources, episodes, chapters]
    .filter(Boolean).join(' · ')
}

// ── État de l'épisode ──

// Clés ep-{id} (torrent unique) et ep-{id}-{i} (plusieurs torrents)
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
        // Fichier à 100 % hors session (ex. retiré puis revu) : pas d'indicateur
        if (file != null && file.priority !== 0 && (sessionDl || file.progress < 1)) {
          return { ...active, progress: Math.round(file.progress * 100) }
        }
        if (!sessionDl) continue
      } else {
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
    epOptionsOpen.value = epOptionsOpen.value === ep.id ? null : ep.id
    return
  }
  if (ep.torrent && !isAlreadyQueued(ep.torrent)) {
    emit('download', `ep-${ep.id}`, ep.torrent.torrent_url, ep.torrent.magnet, ep.torrent.file_index ?? null, ep.torrent.file_path ?? null, ep.torrent.infohash ?? null)
  }
}

function handleEpRequestClick(ep: any) {
  if (isEpisodeRequested(ep.id)) return
  if (ep.torrents && ep.torrents.length > 1) {
    epOptionsOpen.value = epOptionsOpen.value === ep.id ? null : ep.id
    return
  }
  emit('requestEpisode', props.season.season_number, ep.id, ep.torrent ?? undefined)
}

function epState(ep: any): 'idle' | 'loading' | 'done' | 'unavailable' {
  if (ep.organized) return 'done'
  if (epAnyDownloaded(ep) || epAnyDownloading(ep) || isAlreadyQueued(ep.torrent)) return 'loading'
  const prog = epProgress(ep)
  if (prog) return 'loading'
  if (!ep.torrent || !ep.available) return 'unavailable'
  return 'idle'
}

// ── Renommage ──
function epExpectedName(ep: any): string {
  const entry = props.organizedByEpisode[String(ep.id)]
  if (!entry) return ''
  const srcExt = entry.dest_filename ? '.' + entry.dest_filename.split('.').pop() : '.mkv'
  if (props.nfoSupport) {
    return ep.nfo_filename ? ep.nfo_filename.replace(/\.[^.]+$/, '') + srcExt : entry.dest_filename
  } else {
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

// ── Épisodes et chapitres cités dans le synopsis ──
// Cache : le synopsis est analysé plusieurs fois par rendu
const _epChapCache = new Map<string | null | undefined, ReturnType<typeof _parseEpChap>>()
// Extrait les plages d'épisodes et de chapitres, et retire du synopsis les lignes qui les citent
function _parseEpChap(plot: string | null | undefined): {
  episodes: string | null
  season: string | null
  chapters: string |null
  cleanPlot: string
} {
  const text = plot ?? ''

  const epMatch = text.match(
      /[éeÉE]pisodes?\s+(\d+)(?:\s+[àa]\s+(\d+))?(?:\s+de\s+la\s+saison\s+(\d+))?/i
  )

  const seasonMatch = text.match(/saison\s+(\d+)/i)

  const season = epMatch?.[3] ?? seasonMatch?.[1] ?? null

  const chapMatch = text.match(
      /chapitres?\s+(\d+)(?:\s+[àa]\s+(\d+))?/i
  )

  const episodes = epMatch
      ? `${season ? `S${season} · ` : ''}${
          epMatch[2]
              ? `Ép. ${epMatch[1]}–${epMatch[2]}`
              : `Ép. ${epMatch[1]}`
      }`
      : null



  const chapters = chapMatch
      ? (chapMatch[2] ? `Ch. ${chapMatch[1]}–${chapMatch[2]}` : `Ch. ${chapMatch[1]}`)
      : null

  let cleanPlot = text
  if (episodes || chapters || season) {
    cleanPlot = text
        .split(/\r?\n/)
        .filter(line => !/(?:[éeÉE]pisodes?\s+\d+|chapitres?\s+\d+|saison\s+\d+)/i.test(line))
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
  }

  return { episodes, season, chapters, cleanPlot }
}
function parseEpChap(plot: string | null | undefined) {
  if (_epChapCache.has(plot)) return _epChapCache.get(plot)!
  const result = _parseEpChap(plot)
  _epChapCache.set(plot, result)
  return result
}

// ── Langue ──
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

// ── Libellés des versions ──
function labelFromRaw(raw: string, index: number): string {
  if (!raw) return `Option ${index + 1}`
  return raw.length > 65 ? raw.slice(0, 65) + '…' : raw
}

function groupLabels(torrents: any[]): string[] {
  const names = torrents.map((t: any) => t.torrent_name ?? null)
  const allPresent = names.every(n => n !== null && String(n).trim() !== '')
  const allUnique  = allPresent && new Set(names).size === names.length
  if (allUnique) return names as string[]
  return torrents.map((t: any, i: number) => labelFromRaw(t.raw ?? '', i))
}

// Packs couvrant ≥ 2 épisodes, proposés si la saison n'a pas de pack dédié
const uniquePackOptions = computed(() => {
  if (props.season.torrents?.length) return []

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
// 4 h 10, 24 min
function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return m > 0 ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
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
