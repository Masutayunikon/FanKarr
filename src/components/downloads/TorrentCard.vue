<template>
  <article class="bg-card rounded-xl px-4 py-3 flex flex-col md:flex-row md:items-center gap-x-4 gap-y-3">

    <div class="flex items-center gap-4 flex-1 min-w-0">
      <!-- Affiche -->
      <RouterLink v-if="torrent.serieId" :to="`/series/${torrent.serieId}`" class="shrink-0">
        <img v-if="poster" :src="poster" alt="" class="w-[34px] h-[51px] object-cover rounded-[4px]" />
        <span v-else class="w-[34px] h-[51px] rounded-[4px] bg-hover text-muted flex items-center justify-center"><Tv :size="16" :stroke-width="1.75" /></span>
      </RouterLink>
      <span v-else class="w-[34px] h-[51px] rounded-[4px] bg-hover text-muted flex items-center justify-center shrink-0" title="Série non reconnue">
        <FileQuestion :size="16" :stroke-width="1.75" />
      </span>

      <div class="flex-1 min-w-0 flex flex-col gap-[7px]">
        <!-- Nom, état, client -->
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="relative group/eps min-w-0">
            <p class="text-sm font-medium truncate cursor-default" :class="isImported ? 'text-secondary' : 'text-primary'" :title="torrent.name">
              {{ torrent.serieName && !torrent.name.startsWith(torrent.serieName) ? torrent.serieName : torrent.name }}
            </p>
            <!-- Épisodes du torrent -->
            <div v-if="episodesWithProgress.length > 0" class="absolute bottom-full left-0 mb-2 hidden group-hover/eps:block z-20 min-w-56 max-w-80">
              <div class="menu p-3 gap-0">
                <p class="text-meta text-primary font-medium truncate mb-1">{{ torrent.name }}</p>
                <p class="tag-label mb-2">{{ episodesWithProgress.length }} épisode{{ episodesWithProgress.length > 1 ? 's' : '' }}</p>
                <div class="flex flex-col gap-1 max-h-48 overflow-y-auto">
                  <div v-for="ep in episodesWithProgress" :key="ep.episode_id" class="flex items-center justify-between gap-3 text-meta">
                    <span class="text-primary shrink-0 tabular-nums">S{{ String(ep.season_number).padStart(2,'0') }}E{{ String(ep.episode_number).padStart(2,'0') }}</span>
                    <span
                        v-if="ep.progress !== null"
                        class="pill h-5 px-2 text-[10.5px]"
                        :class="ep.progress >= 100 ? 'pill-ok' : ep.priority === 0 ? 'pill-muted' : 'pill-active'"
                    >
                      {{ ep.priority === 0 ? 'ignoré' : ep.progress >= 100 ? '✓' : `${ep.progress} %` }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <span class="pill h-5 px-2 text-[11px] shrink-0" :class="[badge.class, { 'max-sm:hidden': torrent.state === 'downloading' }]">{{ badge.label }}</span>
          <span v-if="clientLine" class="text-[11.5px] text-muted shrink-0 hidden sm:inline">{{ clientLine }}</span>
          <span v-if="!isDone" class="ml-auto text-[13px] tabular-nums shrink-0" :class="torrent.state === 'error' ? 'text-err' : 'text-primary'">{{ clampedProgress }}&nbsp;%</span>
        </div>

        <!-- Progression, vitesse, ETA -->
        <template v-if="!isDone">
          <div class="progress">
            <div class="progress-bar" :class="{ 'bg-muted': torrent.state === 'paused', 'bg-err': torrent.state === 'error' }" :style="{ width: `${clampedProgress}%` }" />
          </div>
          <div class="flex items-center gap-x-4 gap-y-1 flex-wrap text-xs text-muted">
            <span v-if="torrent.state === 'downloading'">{{ formatSpeed(torrent.speed ?? 0) }}</span>
            <span v-if="torrent.state === 'downloading' && torrent.eta > 0">reste {{ formatDuration(torrent.eta) }}</span>
            <span v-if="torrent.state === 'error'" class="text-err">Le client signale une erreur sur ce torrent</span>
            <span v-if="columns.size">{{ formatSize(torrent.downloaded) }} sur {{ formatSize(torrent.size) }}</span>
          </div>
        </template>

        <!-- Terminé : erreurs d'import ou détails -->
        <template v-else>
          <div v-if="torrent.errorFiles?.length > 0" class="relative group/err flex items-center gap-[9px] text-meta text-err min-w-0 w-fit max-w-full">
            <TriangleAlert :size="14" :stroke-width="2" class="shrink-0" />
            <span class="truncate">{{ errorSummary }}</span>
            <div class="absolute bottom-full left-0 mb-2 hidden group-hover/err:block z-20 w-96 max-w-[80vw]">
              <div class="menu p-3 gap-0 border-err/30">
                <p class="tag-label text-err mb-2">Fichiers en erreur</p>
                <div v-for="e in torrent.errorFiles" :key="e.file" class="mb-1.5 last:mb-0 text-meta">
                  <p class="text-primary truncate" :title="e.file">{{ e.file }}</p>
                  <p class="text-muted">{{ e.error }}</p>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="flex items-center gap-x-4 gap-y-1 flex-wrap text-xs text-muted">
            <span>
              <template v-if="torrent.organizeProgress?.total > 1">{{ torrent.organizeProgress.total }} fichiers · </template>{{ formatSize(torrent.size) }}
            </span>
            <span v-if="torrent.state === 'unknown'" class="text-accent">État non remonté par le client</span>
            <span v-if="isImported && torrent.importedAt">importé {{ formatRelative(torrent.importedAt) }}</span>
            <span v-else-if="!isImported && autoImportIn">import automatique {{ autoImportIn }}</span>
            <span v-if="columns.uploaded && torrent.uploaded">↑ {{ formatSize(torrent.uploaded) }}</span>
            <span v-if="columns.upspeed && torrent.upspeed > 0">{{ formatSpeed(torrent.upspeed) }}</span>
          </div>
        </template>
      </div>
    </div>

    <!-- État d'import et actions -->
    <div class="md:w-[260px] shrink-0 flex items-center justify-end gap-2.5 flex-wrap">
      <template v-if="!isDone">
        <span class="text-meta text-muted max-md:mr-auto">{{ torrent.serieName ? (autoImport ? 'Import auto à la fin' : 'Import manuel à la fin') : 'Série non reconnue' }}</span>
      </template>
      <template v-else>
        <span v-if="isImported" class="flex items-center gap-1.5 text-meta text-ok max-md:mr-auto">
          <Check :size="14" :stroke-width="2.5" /> Importé {{ torrent.organizeProgress?.done }}/{{ torrent.organizeProgress?.total }}
        </span>
        <span v-else class="text-meta text-secondary max-md:mr-auto">
          {{ torrent.organizeState === 'partial' ? `Importé ${torrent.organizeProgress?.done}/${torrent.organizeProgress?.total}` : 'Non importé' }}
        </span>
        <button
            v-if="!isImported"
            @click="emit('import', torrent)"
            :disabled="importing"
            class="btn-sm min-w-[88px] max-md:min-w-[128px]"
            :class="torrent.errorFiles?.length > 0 || torrent.organizeState === 'partial' ? 'btn-secondary' : 'btn-primary'"
        >
          <Loader v-if="importing" :size="13" class="animate-spin" />
          {{ importing ? 'Import…' : torrent.errorFiles?.length > 0 ? 'Réessayer' : 'Importer' }}
        </button>
      </template>

      <!-- Supprimer -->
      <div class="relative">
        <button
            @click="emit('toggle-confirm', showConfirmDelete ? null : torrent.hash)"
            :disabled="deleting"
            class="w-8 h-8 pointer-coarse:w-10 pointer-coarse:h-10 rounded-full border border-border-light text-muted flex items-center justify-center hover:text-err hover:border-err/30 transition-colors"
            :title="isDone ? 'Supprimer le torrent' : 'Annuler le téléchargement'"
            :aria-label="isDone ? 'Supprimer le torrent' : 'Annuler le téléchargement'"
        >
          <Trash2 :size="14" />
        </button>
        <div v-if="showConfirmDelete" class="menu absolute bottom-full right-0 mb-2 w-60 z-20 p-3 gap-3">
          <p class="text-body text-primary font-medium">
            {{ isDone ? 'Supprimer ce torrent ?' : 'Annuler ce téléchargement ?' }}
          </p>
          <label class="flex items-center gap-2 text-meta text-secondary cursor-pointer">
            <input type="checkbox" v-model="withFiles" class="w-4 h-4 rounded" />
            Supprimer aussi les fichiers
          </label>
          <div class="flex gap-2">
            <button @click="emit('delete', torrent, withFiles)" :disabled="deleting" class="btn-danger btn-sm flex-1">
              {{ deleting ? '…' : 'Confirmer' }}
            </button>
            <button @click="emit('toggle-confirm', null)" class="btn-ghost btn-sm flex-1">Annuler</button>
          </div>
        </div>
      </div>
    </div>

  </article>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Check, FileQuestion, Loader, Trash2, TriangleAlert, Tv } from 'lucide-vue-next'
import { formatDuration, formatRelative, formatSize, formatSpeed } from '@/utils/format'

const props = defineProps<{
  torrent          : any
  columns          : Record<string, boolean>
  importing        : boolean
  deleting         : boolean
  showConfirmDelete: boolean
  poster?          : string | null
  autoImport?      : boolean
  autoImportIn?    : string
}>()

const emit = defineEmits<{
  import          : [torrent: any]
  delete          : [torrent: any, withFiles: boolean]
  'toggle-confirm': [hash: string | null]
}>()

const withFiles = ref(false)

const clampedProgress = computed(() => Math.min(100, Math.max(0, props.torrent.progress ?? 0)))
const isDone     = computed(() => props.torrent.state === 'seeding' || props.torrent.state === 'unknown')
const isImported = computed(() => isDone.value && props.torrent.organizeState === 'done')

const clientLine = computed(() => [
  props.columns.client ? props.torrent.client_name : null,
  isDone.value && props.columns.ratio ? `R ${(props.torrent.ratio ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null,
].filter(Boolean).join(' · '))


const errorSummary = computed(() => {
  const errs: { file: string; error: string }[] = props.torrent.errorFiles ?? []
  if (!errs.length) return ''
  const name = errs[0]!.file.split(/[\\/]/).pop() ?? errs[0]!.file
  const ep   = name.match(/S\d+E(\d+)/i)
  return `${ep ? `E${ep[1]}` : name} · ${errs[0]!.error}${errs.length > 1 ? ` (+${errs.length - 1})` : ''}`
})

// Épisodes enrichis avec leur progression depuis les données de fichiers du client
const episodesWithProgress = computed(() => {
  const eps: any[] = props.torrent.episodes ?? []
  if (!eps.length) return []
  return eps.map((ep: any) => {
    const file = (props.torrent.files ?? []).find((f: any) => {
      const basename = String(f.name ?? '').replace(/\\/g, '/').split('/').pop() ?? ''
      return basename.toLowerCase() === ep.filename?.toLowerCase()
    })
    return {
      ...ep,
      progress: file != null ? Math.round((file.progress ?? 0) * 100) : null,
      priority: file?.priority ?? 1,
    }
  })
})

const badge = computed(() => ({
  downloading: { label: 'Téléchargement', class: 'pill-active' },
  seeding    : { label: 'Terminé',        class: 'pill-ok' },
  paused     : { label: 'En pause',       class: 'pill-neutral' },
  checking   : { label: 'Vérification',   class: 'pill-wait' },
  error      : { label: 'Erreur',         class: 'pill-err' },
  unknown    : { label: 'État inconnu',   class: 'pill-wait' },
} as Record<string, { label: string; class: string }>)[props.torrent.state] ?? { label: 'Inconnu', class: 'pill-muted' })
</script>
