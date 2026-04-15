<template>
  <div class="settings-card flex flex-col gap-3">

    <!-- Nom + état -->
    <div class="flex items-start justify-between gap-4">
      <div class="flex-1 min-w-0">
        <p class="text-sm text-primary font-medium truncate">{{ torrent.name }}</p>
        <div class="flex items-center gap-2 mt-1">
          <span class="text-[10px] px-2 py-0.5 rounded border" :class="stateBadge(torrent.state).class">{{ stateBadge(torrent.state).label }}</span>
          <span v-if="columns.client" class="text-xs text-muted">{{ torrent.client_name }}</span>
        </div>
      </div>
      <div class="text-right shrink-0">
        <p class="text-sm font-semibold text-primary">{{ clampedProgress }}%</p>
        <p v-if="columns.size" class="text-xs text-muted mt-0.5">{{ formatSize(torrent.downloaded) }} / {{ formatSize(torrent.size) }}</p>
      </div>
    </div>

    <!-- Barre de progression -->
    <div class="h-1 bg-border rounded-full overflow-hidden">
      <div class="h-full rounded-full transition-all duration-500"
           :class="torrent.state === 'seeding' || torrent.state === 'unknown' ? 'bg-green-500' : torrent.state === 'error' ? 'bg-red-500' : torrent.state === 'paused' ? 'bg-muted' : 'bg-accent'"
           :style="{ width: `${clampedProgress}%` }" />
    </div>

    <!-- Infos + actions -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3 text-xs text-muted">
        <span v-if="torrent.state === 'downloading'">↓ {{ formatSpeed(torrent.speed) }}</span>
        <span v-if="torrent.state === 'downloading' && torrent.eta > 0">ETA {{ formatEta(torrent.eta) }}</span>
        <template v-if="torrent.state === 'seeding'">
          <span class="text-green-500">Complété</span>
          <span v-if="columns.ratio" class="font-mono" :class="torrent.ratio >= 1 ? 'text-green-400' : torrent.ratio >= 0.5 ? 'text-yellow-500' : 'text-muted'">R {{ torrent.ratio?.toFixed(2) ?? '0.00' }}</span>
          <span v-if="columns.uploaded">↑ {{ formatSize(torrent.uploaded ?? 0) }}</span>
          <span v-if="columns.upspeed && torrent.upspeed > 0">{{ formatSpeed(torrent.upspeed) }}</span>
        </template>
        <span v-if="torrent.state === 'unknown'" class="text-yellow-500">État non remonté par le client</span>
      </div>

      <div class="flex items-center gap-2">

        <!-- Actions terminés -->
        <template v-if="torrent.state === 'seeding' || torrent.state === 'unknown'">
          <!-- Erreurs -->
          <div v-if="torrent.errorFiles?.length > 0" class="relative group/err">
            <span class="text-xs px-2 py-0.5 rounded border border-red-500/40 text-red-400 cursor-default">{{ torrent.errorFiles.length }} erreur{{ torrent.errorFiles.length > 1 ? 's' : '' }}</span>
            <div class="absolute bottom-full right-0 mb-2 hidden group-hover/err:block z-10 w-80">
              <div class="bg-card border border-red-500/30 rounded-lg p-3 text-xs shadow-xl">
                <p class="text-red-400 mb-2 font-medium">Fichiers en erreur</p>
                <div v-for="e in torrent.errorFiles" :key="e.file" class="mb-1.5 last:mb-0">
                  <p class="text-primary truncate">{{ e.file }}</p>
                  <p class="text-muted">{{ e.error }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Badge import -->
          <span class="text-xs px-2 py-0.5 rounded border"
                :class="torrent.organizeState === 'done' ? 'border-green-500/40 text-green-500' : torrent.organizeState === 'partial' ? 'border-yellow-500/40 text-yellow-500' : 'border-border text-muted'">
            {{ torrent.organizeState === 'done'
              ? `Importé (${torrent.organizeProgress?.done}/${torrent.organizeProgress?.total})`
              : torrent.organizeState === 'partial'
                ? `En cours (${torrent.organizeProgress?.done}/${torrent.organizeProgress?.total})`
                : 'Non importé' }}
          </span>

          <button v-if="torrent.organizeState !== 'done'" @click="emit('import', torrent)" :disabled="importing" class="btn-secondary text-xs py-1">
            {{ importing ? '...' : 'Importer' }}
          </button>
        </template>

        <!-- Bouton supprimer -->
        <div class="relative">
          <button
              @click="emit('toggle-confirm', torrent.hash)"
              :disabled="deleting"
              class="w-7 h-7 flex items-center justify-center rounded-lg border border-border text-muted hover:border-red-500/40 hover:text-red-400 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
            </svg>
          </button>
          <div v-if="showConfirmDelete" class="absolute bottom-full right-0 mb-2 bg-card border border-border rounded-xl p-3 z-10 w-52 shadow-xl">
            <p class="text-xs text-primary font-medium mb-2">
              {{ tab === 'active' ? 'Annuler ce téléchargement ?' : 'Supprimer ce torrent ?' }}
            </p>
            <label class="flex items-center gap-2 text-xs text-muted mb-3 cursor-pointer">
              <input type="checkbox" v-model="withFiles" class="accent-red-500" />
              Supprimer aussi les fichiers
            </label>
            <div class="flex gap-1.5">
              <button @click="emit('delete', torrent, withFiles)" :disabled="deleting" class="flex-1 text-xs py-1 px-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors">
                {{ deleting ? '...' : 'Confirmer' }}
              </button>
              <button @click="emit('toggle-confirm', null)" class="flex-1 text-xs py-1 px-2 rounded-lg border border-border text-muted hover:text-primary transition-colors">
                Annuler
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  torrent         : any
  tab             : 'active' | 'done'
  columns         : Record<string, boolean>
  importing       : boolean
  deleting        : boolean
  showConfirmDelete: boolean
}>()

const emit = defineEmits<{
  import        : [torrent: any]
  delete        : [torrent: any, withFiles: boolean]
  'toggle-confirm': [hash: string | null]
}>()

const withFiles = ref(false)

const clampedProgress = computed(() => Math.min(100, Math.max(0, props.torrent.progress ?? 0)))

function stateBadge(state: string) {
  return ({
    downloading: { label: 'Téléchargement', class: 'border-accent/40 text-accent' },
    seeding    : { label: 'Complété',       class: 'border-green-500/40 text-green-500' },
    paused     : { label: 'En pause',       class: 'border-border text-muted' },
    checking   : { label: 'Vérification',   class: 'border-yellow-500/40 text-yellow-500' },
    error      : { label: 'Erreur',         class: 'border-red-500/40 text-red-400' },
    unknown    : { label: 'État inconnu',   class: 'border-yellow-500/40 text-yellow-500' },
  } as Record<string, any>)[state] ?? { label: 'Inconnu', class: 'border-border text-muted' }
}
function formatSize(bytes: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}
function formatSpeed(bps: number) { return `${formatSize(bps)}/s` }
function formatEta(seconds: number): string {
  if (seconds < 0 || seconds > 86400 * 7) return '∞'
  const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60
  if (h > 0) return `${h}h${m.toString().padStart(2, '0')}m`
  if (m > 0) return `${m}m${s.toString().padStart(2, '0')}s`
  return `${s}s`
}
</script>
