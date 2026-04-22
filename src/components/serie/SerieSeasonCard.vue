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
              {{ torrentLabel(t, i) }}
            </button>
          </div>
        </div>
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
            <div class="flex items-center gap-2 mt-0.5">
              <span v-if="ep.aired" class="text-xs text-muted">{{ formatDate(ep.aired) }}</span>
              <span v-if="ep.duration" class="text-xs text-muted">{{ formatDuration(ep.duration) }}</span>
              <!-- Badge langue -->
              <span
                  v-if="epLang(ep) === 'MULTI'"
                  title="Audio japonais + français"
                  class="shrink-0 inline-flex items-center gap-1 text-[11px] leading-none px-1.5 py-0.5 rounded border bg-blue-500/10 border-blue-500/20 select-none"
              >
                <span>🇯🇵</span><span class="text-blue-400 font-medium text-[9px]">+</span><span>🇫🇷</span>
              </span>
              <span
                  v-else-if="epLang(ep) === 'VOSTFR'"
                  title="Audio japonais · Sous-titres français"
                  class="shrink-0 inline-flex items-center gap-1 text-[11px] leading-none px-1.5 py-0.5 rounded border bg-amber-500/10 border-amber-500/20 select-none"
              >
                <span>🇯🇵</span><span class="text-amber-400 font-medium text-[9px]">ST</span><span>🇫🇷</span>
              </span>
            </div>
          </div>

          <!-- Bouton état épisode (dropdown si plusieurs options) -->
          <div class="relative shrink-0" @click.stop>
            <button
                class="w-8 h-8 rounded-lg border flex items-center justify-center transition-colors"
                :class="epBtnClass(ep)"
                :disabled="epState(ep) !== 'idle'"
                @click="handleEpBtnClick(ep)"
            >
              <component :is="epStateIcon(ep)" />
            </button>
            <!-- Dropdown quand plusieurs options de torrent -->
            <div v-if="epOptionsOpen === ep.id && !ep.organized && ep.torrents && ep.torrents.length > 1"
                 class="absolute right-0 bottom-full mb-1 bg-card border border-border rounded-xl p-1 z-20 w-52 shadow-xl flex flex-col gap-0.5">
              <button
                  v-for="(t, i) in ep.torrents"
                  :key="i"
                  class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-primary hover:bg-hover transition-colors"
                  :class="(isDownloaded(`ep-${ep.id}-${i}`) || isAlreadyQueued(t)) ? 'opacity-50 cursor-not-allowed' : ''"
                  :disabled="isDownloaded(`ep-${ep.id}-${i}`) || isAlreadyQueued(t)"
                  @click="!isDownloaded(`ep-${ep.id}-${i}`) && !isAlreadyQueued(t) && (emit('download', `ep-${ep.id}-${i}`, t.torrent_url, t.magnet, t.file_index ?? null, t.file_path ?? null), epOptionsOpen = null)"
              >
                <component :is="(isDownloaded(`ep-${ep.id}-${i}`) || isAlreadyQueued(t)) ? checkIcon : downloadIcon" />
                {{ torrentLabel(t, i) }}
              </button>
            </div>
          </div>

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
import { ref, computed, h, onMounted, onUnmounted } from 'vue'
import { ChevronUp, Download, Loader, Check, X } from 'lucide-vue-next'

interface ActiveTorrent { hash: string; progress: number; state: string; files?: { index: number; progress: number }[] }

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
}>()

const emit = defineEmits<{
  toggle         : [id: number]
  download       : [key: string, url: string | null, magnet: string | null, file_index?: number | null, file_path?: string | null]
  downloadSeason : [season: any, packHash?: string]
  renameEpisode  : [ep: any, season: any]
  unimportEpisode: [ep: any, season: any, deleteFile: boolean]
}>()

const epMenuOpen    = ref<number | null>(null)
const epOptionsOpen = ref<number | null>(null)
const seasonMenuOpen = ref(false)
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
        // Avec données par fichier on se fie à la progression réelle du fichier précis,
        // pas à l'état global du torrent — évite d'afficher les fichiers non sélectionnés (progress 0).
        if (file != null && (sessionDl || file.progress > 0)) {
          return { ...active, progress: file.progress }
        }
        if (!sessionDl) continue
      } else {
        // Pas de données par fichier : session ou torrent terminé
        if (!sessionDl && active.state !== 'seeding') continue
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
    emit('download', `ep-${ep.id}`, ep.torrent.torrent_url, ep.torrent.magnet, ep.torrent.file_index ?? null, ep.torrent.file_path ?? null)
  }
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
    return ep.formatted_name?.trim() ? ep.formatted_name.replace(/[<>:"/\\|?*]/g, '').trim() + srcExt : entry.dest_filename
  }
}
function epNeedsRename(ep: any): boolean {
  const entry = props.organizedByEpisode[String(ep.id)]
  if (!entry) return false
  const expected = epExpectedName(ep)
  return !!expected && expected !== entry.dest_filename
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

function torrentLabel(torrent: any, index: number): string {
  if (torrent.torrent_name) return torrent.torrent_name
  const raw     = torrent.raw ?? ''
  const quality = raw.match(/\b(2160p|4K|1080p|720p|480p)\b/i)?.[1]?.toUpperCase()
  const lang    = raw.match(/\b(VOSTFR|MULTI|VF|VO|FR|EN)\b/i)?.[1]?.toUpperCase()
  if (quality && lang) return `${quality} · ${lang}`
  if (quality) return quality
  if (lang) return lang
  return raw.length > 40 ? raw.slice(0, 40) + '…' : (raw || `Option ${index + 1}`)
}

// Packs parents distincts couvrant cette saison (quand pas de pack saison explicite)
// Permet le dropdown "Saison ▾" quand une saison est couverte par plusieurs intégrales
const uniquePackOptions = computed(() => {
  if (props.season.torrents?.length) return []
  const seen = new Set<string>()
  const opts: { infohash: string; label: string }[] = []
  for (const ep of props.season.episodes) {
    if (!ep.available) continue
    for (const t of (ep.torrents ?? [])) {
      const hash = t.infohash ?? extractHash(t)
      if (!hash || seen.has(hash)) continue
      seen.add(hash)
      opts.push({ infohash: hash, label: torrentLabel(t, opts.length) })
    }
  }
  return opts.length > 1 ? opts : []
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

function closeAllMenus() {
  epMenuOpen.value    = null
  epOptionsOpen.value = null
  seasonMenuOpen.value = false
}

onMounted(()   => document.addEventListener('click', closeAllMenus))
onUnmounted(() => document.removeEventListener('click', closeAllMenus))

defineExpose({ closeEpMenu: closeAllMenus })
</script>
