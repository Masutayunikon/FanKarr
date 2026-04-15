<template>
  <div class="relative">
    <div v-if="serie.fanart_image" class="absolute inset-0 h-64 overflow-hidden pointer-events-none">
      <img
          :src="serie.fanart_image"
          class="w-full h-full object-cover opacity-15"
          @error="(e) => ((e.target as HTMLElement).closest('div') as HTMLElement).style.display = 'none'"
      />
      <div class="absolute inset-0 bg-gradient-to-b from-transparent to-main" />
    </div>

    <div class="relative px-4 md:px-8 pt-6 pb-10 flex gap-6 min-h-[200px]">
      <!-- Poster -->
      <div class="shrink-0 w-32 rounded-xl overflow-hidden border border-border shadow-xl hidden sm:block">
        <img v-if="serie.poster_image" :src="serie.poster_image" class="w-full h-full object-cover" />
        <div v-else class="w-full aspect-[2/3] bg-card flex items-center justify-center text-muted">
          <Tv :size="28" />
        </div>
      </div>

      <!-- Infos -->
      <div class="flex flex-col gap-3 justify-end min-w-0">
        <RouterLink to="/series" class="inline-flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors w-fit">
          <ArrowLeft :size="13" />
          Séries
        </RouterLink>

        <!-- Titre + boutons actions -->
        <div class="flex items-center gap-3 flex-wrap">
          <h1 class="text-2xl font-bold text-primary tracking-tight">{{ serie.title }}</h1>

          <button
              @click="emit('openManualImport')"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border text-muted hover:text-primary hover:border-secondary transition shrink-0"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Import manuel
          </button>

          <div v-if="Object.keys(organizedByEpisode).length > 0" class="relative" @click.stop>
            <button
                @click="unimportMenuOpen = !unimportMenuOpen"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border text-muted hover:text-red-400 hover:border-red-500/40 transition shrink-0"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
              </svg>
              Désimporter
            </button>
            <div v-if="unimportMenuOpen" class="absolute top-full left-0 mt-1 bg-card border border-border rounded-xl p-1 z-20 w-48 shadow-xl flex flex-col gap-0.5">
              <button @click="emit('unimport', false); unimportMenuOpen = false" class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted hover:bg-hover transition-colors">
                Retirer de la bibliothèque
              </button>
              <button @click="emit('unimport', true); unimportMenuOpen = false" class="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors">
                Supprimer les fichiers
              </button>
            </div>
          </div>
        </div>

        <!-- Métadonnées -->
        <div class="flex flex-wrap items-center gap-2">
          <span v-if="serie.year" class="text-sm text-muted">{{ serie.year }}</span>
          <span
              v-if="serie.status"
              class="text-xs px-2 py-0.5 rounded-full border"
              :class="serie.status.toLowerCase() === 'continuing'
              ? 'bg-green-500/15 text-green-400 border-green-500/20'
              : 'bg-hover text-muted border-border'"
          >{{ serie.status }}</span>
        </div>

        <p v-if="serie.plot" class="text-sm text-secondary leading-relaxed max-w-2xl line-clamp-3">
          {{ serie.plot }}
        </p>

        <!-- Boutons intégrale / tout télécharger -->
        <div class="flex flex-wrap gap-2 mt-1">
          <button
              v-if="hasDownloadableTorrents"
              @click="emit('downloadAll')"
              :disabled="downloadingAll"
              class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent-hover transition"
              :class="downloadingAll ? 'opacity-50 cursor-not-allowed' : ''"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" :class="downloadingAll ? 'animate-spin' : ''">
              <path v-if="!downloadingAll" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline v-if="!downloadingAll" points="7 10 12 15 17 10"/><line v-if="!downloadingAll" x1="12" y1="15" x2="12" y2="3"/>
              <path v-else d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-6.36-2.64M3 12a9 9 0 0 1 9-9 9 9 0 0 1 6.36 2.64"/>
            </svg>
            {{ downloadingAll ? 'Envoi…' : 'Tout télécharger' }}
          </button>

          <button
              v-for="(t, i) in torrentsIntegrale"
              :key="i"
              :title="t.raw"
              class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition"
              :class="[
              t.label === 'Intégrale'
                ? 'bg-accent text-white hover:bg-accent-hover'
                : 'bg-accent-muted text-accent border border-accent/20 hover:bg-accent/20',
              (isAlreadyQueued(t) || isDownloaded(`integrale-${i}`))
                ? 'opacity-50 cursor-not-allowed' : ''
            ]"
              :disabled="isAlreadyQueued(t) || isDownloaded(`integrale-${i}`)"
              @click="emit('download', `integrale-${i}`, t.torrent_url, t.magnet)"
          >
            <component :is="btnIcon(`integrale-${i}`, t)" />
            {{ isAlreadyQueued(t) ? 'Déjà ajouté' : isDownloaded(`integrale-${i}`) ? 'Envoyé ✓' : t.label }}
          </button>
        </div>

        <!-- Progression intégrale -->
        <template v-for="(t, i) in torrentsIntegrale" :key="`prog-${i}`">
          <div v-if="torrentProgress(extractHash(t)) && torrentProgress(extractHash(t))!.progress < 100" class="h-0.5 bg-border rounded-full overflow-hidden">
            <div class="h-full bg-accent rounded-full transition-all duration-500" :style="{ width: `${torrentProgress(extractHash(t))!.progress}%` }" />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, h } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowLeft, Tv, Download, Loader, Check } from 'lucide-vue-next'

interface ActiveTorrent { hash: string; progress: number; state: string }

const props = defineProps<{
  serie               : any
  torrentsIntegrale   : any[]
  organizedByEpisode  : Record<string, any>
  hasDownloadableTorrents: boolean
  downloadingAll      : boolean
  activeTorrents      : ActiveTorrent[]
  downloading         : string[]
  downloaded          : string[]
}>()

const emit = defineEmits<{
  openManualImport: []
  unimport        : [deleteFile: boolean]
  downloadAll     : []
  download        : [key: string, url: string | null, magnet: string | null]
}>()

const unimportMenuOpen = ref(false)

function isDownloaded(key: string)  { return props.downloaded.includes(key) }
function isAlreadyQueued(torrent: any): boolean {
  const hash = extractHash(torrent)
  if (!hash) return false
  return props.activeTorrents.some(t => t.hash.toLowerCase() === hash.toLowerCase())
}
function extractHash(torrent: any): string | null {
  if (!torrent?.magnet) return null
  const m = torrent.magnet.match(/xt=urn:btih:([a-fA-F0-9]{40})/i)
  return m ? m[1].toLowerCase() : null
}
function torrentProgress(hash: string | null | undefined): ActiveTorrent | null {
  if (!hash) return null
  return props.activeTorrents.find(t => t.hash.toLowerCase() === hash.toLowerCase()) ?? null
}
function btnIcon(key: string, torrent: any) {
  if (isDownloaded(key) || isAlreadyQueued(torrent)) return h(Check, { size: 14 })
  return h(Download, { size: 14 })
}

defineExpose({ closeUnimportMenu: () => { unimportMenuOpen.value = false } })
</script>
