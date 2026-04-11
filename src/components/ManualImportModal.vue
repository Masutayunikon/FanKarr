<template>
  <Teleport to="body">
    <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" @click.self="$emit('close')">
      <div class="bg-card border border-border rounded-xl w-full max-w-3xl flex flex-col" style="max-height: 85vh">

        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h3 class="text-sm font-semibold text-primary">Import manuel — {{ serieName }}</h3>
            <p class="text-xs text-muted font-mono mt-0.5 truncate">{{ serieFolder }}</p>
          </div>
          <button @click="$emit('close')" class="text-muted hover:text-primary transition-colors text-lg leading-none">✕</button>
        </div>

        <!-- Loading -->
        <div v-if="scanning" class="flex flex-col items-center justify-center gap-3 py-16 text-muted">
          <div class="w-5 h-5 border border-border border-t-accent rounded-full animate-spin" />
          <p class="text-sm">Scan du dossier…</p>
        </div>

        <!-- Dossier vide / introuvable -->
        <div v-else-if="!scanning && items.length === 0 && !scanError" class="flex flex-col items-center gap-3 py-16 text-center px-6">
          <p class="text-sm text-muted">Aucun fichier vidéo trouvé dans ce dossier.</p>
          <p class="text-xs text-muted">Placez vos fichiers dans <span class="font-mono text-primary">{{ serieFolder }}</span> puis réessayez.</p>
          <button @click="scan" class="btn-secondary mt-2">Rescanner</button>
        </div>

        <!-- Erreur -->
        <div v-else-if="scanError" class="flex flex-col items-center gap-3 py-16 text-center px-6">
          <p class="text-sm text-red-400">{{ scanError }}</p>
          <button @click="scan" class="btn-secondary">Réessayer</button>
        </div>

        <!-- Liste fichiers -->
        <template v-else-if="items.length > 0">

          <!-- Toolbar -->
          <div class="flex items-center justify-between px-6 py-3 border-b border-border shrink-0 gap-3">
            <p class="text-xs text-muted">
              <span class="text-primary font-medium">{{ items.length }}</span> fichier{{ items.length > 1 ? 's' : '' }}
              <span v-if="alreadyImportedCount > 0"> · <span class="text-blue-400">{{ alreadyImportedCount }} déjà importé{{ alreadyImportedCount > 1 ? 's' : '' }}</span></span>
              · <span class="text-green-400">{{ newMatchedCount }} nouveau{{ newMatchedCount > 1 ? 'x' : '' }}</span>
              <span v-if="unmatchedCount > 0"> · <span class="text-yellow-500">{{ unmatchedCount }} non associé{{ unmatchedCount > 1 ? 's' : '' }}</span></span>
            </p>
            <button @click="scan" class="text-xs text-muted hover:text-primary transition-colors">↺ Rescanner</button>
          </div>

          <!-- Fichiers -->
          <div class="overflow-y-auto flex-1 px-6 py-3 flex flex-col gap-2">
            <div
                v-for="(item, i) in items"
                :key="item.file.path"
                class="flex items-center gap-3 p-3 rounded-lg border transition-colors"
                :class="item.alreadyImported
                  ? 'border-blue-500/20 bg-blue-500/5'
                  : item.episode_id
                    ? 'border-green-500/20 bg-green-500/5'
                    : 'border-border bg-shell'"
            >
              <!-- Icône -->
              <div class="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                   :class="item.alreadyImported ? 'bg-blue-500/15 text-blue-400' :
                           item.episode_id ? 'bg-green-500/15 text-green-400' : 'bg-border text-muted'">
                <svg v-if="item.alreadyImported || item.episode_id" width="10" height="10" viewBox="0 0 12 12" stroke="currentColor" stroke-width="2.5" fill="none"><polyline points="2 6 5 9 10 3"/></svg>
                <svg v-else width="10" height="10" viewBox="0 0 12 12" stroke="currentColor" stroke-width="2" fill="none"><line x1="6" y1="2" x2="6" y2="7"/><circle cx="6" cy="9.5" r="0.5" fill="currentColor"/></svg>
              </div>

              <!-- Nom + taille -->
              <div class="flex-1 min-w-0">
                <p class="text-xs text-primary font-mono truncate">{{ item.file.name }}</p>
                <p class="text-[11px] text-muted mt-0.5">
                  {{ formatSize(item.file.size) }}
                  <span v-if="item.alreadyImported" class="text-blue-400 ml-1">— déjà importé</span>
                  <span v-else-if="item.willRename" class="text-accent ml-1">— sera renommé</span>
                </p>
              </div>

              <!-- Sélecteur épisode -->
              <select
                  v-model="items[i].episode_id"
                  class="settings-input text-xs py-1 max-w-[260px] shrink-0"
                  @change="onEpisodeChange(i)"
              >
                <option :value="null">— Non associé —</option>
                <optgroup v-for="season in seasons" :key="season.id" :label="season.season_number === 0 ? 'Spéciaux' : `Saison ${season.season_number}`">
                  <option
                      v-for="ep in season.episodes"
                      :key="ep.id"
                      :value="ep.id"
                      :disabled="isEpisodeAlreadyUsed(ep.id, i)"
                  >
                    E{{ String(ep.episode_number).padStart(2, '0') }} — {{ ep.title || `Épisode ${ep.episode_number}` }}
                    {{ isEpisodeOrganized(ep.id) ? '✓' : '' }}
                  </option>
                </optgroup>
              </select>

            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between px-6 py-4 border-t border-border shrink-0">
            <p v-if="importError" class="text-xs text-red-400">{{ importError }}</p>
            <p v-else class="text-xs text-muted">
              Les fichiers dans ce dossier seront <span class="text-accent">renommés sur place</span>.
            </p>
            <div class="flex gap-2">
              <button @click="$emit('close')" class="btn-secondary">Annuler</button>
              <button
                  @click="doImport"
                  :disabled="newMatchedCount === 0 || importing"
                  class="btn-primary"
              >
                {{ importing ? 'Import…' : `Importer ${newMatchedCount} fichier${newMatchedCount > 1 ? 's' : ''}` }}
              </button>
            </div>
          </div>

        </template>

        <!-- Résultat -->
        <div v-else-if="step === 'done'" class="flex flex-col items-center gap-4 px-6 py-10 text-center">
          <div class="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" stroke="#22c55e" stroke-width="2.5" fill="none"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div>
            <p class="text-sm font-semibold text-primary">Import terminé</p>
            <p class="text-xs text-muted mt-1">
              {{ importResult.done }} fichier{{ importResult.done > 1 ? 's' : '' }} importé{{ importResult.done > 1 ? 's' : '' }}
              <span v-if="importResult.errors.length > 0" class="text-red-400">
                · {{ importResult.errors.length }} erreur{{ importResult.errors.length > 1 ? 's' : '' }}
              </span>
            </p>
          </div>
          <div v-if="importResult.errors.length > 0" class="w-full text-left bg-red-500/5 border border-red-500/20 rounded-lg p-3">
            <p class="text-xs text-red-400 font-medium mb-1.5">Erreurs</p>
            <div v-for="e in importResult.errors" :key="e.file" class="text-xs text-muted mb-1">
              <span class="text-primary font-mono">{{ e.file }}</span> — {{ e.error }}
            </div>
          </div>
          <button @click="$emit('close'); $emit('imported')" class="btn-primary">Fermer</button>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from '@/composables/useToast'

const { add: toast } = useToast()

const props = defineProps<{
  serieId    : number
  serieName  : string
  seasons    : any[]
  organized  : Record<string, any>
  initialPath: string
}>()

const emit = defineEmits<{
  close   : []
  imported: []
}>()

// ─── State ────────────────────────────────────────────────────
const step        = ref<'list' | 'done'>('list')
const scanning    = ref(false)
const importing   = ref(false)
const importError = ref('')
const scanError   = ref('')
const importResult = ref({ done: 0, errors: [] as { file: string; error: string }[] })

// Dossier de la série dans la médiathèque
const serieTitle  = computed(() =>
    props.serieName.replace(/:/g, ' -').replace(/[<>"/\\|?*]/g, '').replace(/\s+/g, ' ').trim()
)
const serieFolder = computed(() => `${props.initialPath}/${serieTitle.value}`)

interface FileItem {
  file           : { name: string; path: string; size: number }
  episode_id     : number | null
  hash           : string | null
  alreadyImported: boolean
  willRename     : boolean
}

const items = ref<FileItem[]>([])

// ─── Computed ──────────────────────────────────────────────────
const alreadyImportedCount = computed(() => items.value.filter(i => i.alreadyImported).length)
const newMatchedCount      = computed(() => items.value.filter(i => i.episode_id !== null && !i.alreadyImported).length)
const unmatchedCount       = computed(() => items.value.filter(i => i.episode_id === null).length)

// ─── Helpers ──────────────────────────────────────────────────
function isEpisodeOrganized(epId: number): boolean {
  return !!props.organized?.[String(epId)]
}

function isEpisodeAlreadyUsed(epId: number, currentIndex: number): boolean {
  return items.value.some((item, i) => i !== currentIndex && item.episode_id === epId)
}

function getHashForEpisode(episodeId: number): string | null {
  for (const season of props.seasons) {
    for (const ep of season.episodes) {
      if (ep.id !== episodeId) continue
      for (const p of ep.paths ?? []) {
        if (typeof p === 'object' && p.infohash) return p.infohash.toLowerCase()
      }
    }
  }
  return null
}

function buildOrganizedByPath(): Map<string, number> {
  const index = new Map<string, number>()
  for (const [epIdStr, entry] of Object.entries(props.organized)) {
    if (entry?.dest_path) index.set(entry.dest_path, Number(epIdStr))
  }
  return index
}

function autoMatch(filename: string): { episode_id: number | null; hash: string | null } {
  const nameNoExt = filename.replace(/\.[^.]+$/, '').toLowerCase()

  for (const season of props.seasons) {
    for (const ep of season.episodes) {
      const candidates = [
        ep.original_filename,
        ep.nfo_filename?.replace(/\.nfo$/, ''),
        ep.formatted_name?.replace(/[<>:"/\\|?*]/g, '').trim(),
      ].filter(Boolean).map((s: string) => s.toLowerCase().replace(/\.[^.]+$/, ''))

      if (candidates.some(c => c === nameNoExt || nameNoExt.startsWith(c + '.'))) {
        return { episode_id: ep.id, hash: getHashForEpisode(ep.id) }
      }
    }
  }

  // Fallback numéro d'épisode
  const numMatch = filename.match(/[.\s_-]0*(\d{1,3})[.\s_-]/i)
  if (numMatch) {
    const num = parseInt(numMatch[1], 10)
    for (const season of props.seasons) {
      const ep = season.episodes.find((e: any) => e.episode_number === num)
      if (ep) return { episode_id: ep.id, hash: getHashForEpisode(ep.id) }
    }
  }

  return { episode_id: null, hash: null }
}

function formatSize(bytes: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

function onEpisodeChange(i: number) {
  items.value[i].hash           = getHashForEpisode(Number(items.value[i].episode_id))
  items.value[i].alreadyImported = false
}

// ─── Actions ──────────────────────────────────────────────────
async function scan() {
  scanning.value  = true
  scanError.value = ''
  items.value     = []

  try {
    const res = await fetch(`/api/browse-files?path=${encodeURIComponent(serieFolder.value)}`, { credentials: 'include' })
    if (!res.ok) {
      const data = await res.json()
      scanError.value = data.error ?? 'Erreur lors du scan'
      return
    }
    const data = await res.json()
    const files: { name: string; path: string; size: number }[] = data.files ?? []

    const organizedByPath = buildOrganizedByPath()

    items.value = files.map(f => {
      // Vérifier si déjà importé via dest_path
      const existingEpId = organizedByPath.get(f.path) ?? null
      if (existingEpId) {
        return { file: f, episode_id: existingEpId, hash: getHashForEpisode(existingEpId), alreadyImported: true, willRename: false }
      }

      const match = autoMatch(f.name)
      return { file: f, ...match, alreadyImported: false, willRename: match.episode_id !== null }
    })
  } catch {
    scanError.value = 'Impossible de contacter le serveur'
  } finally {
    scanning.value = false
  }
}

async function doImport() {
  importing.value   = true
  importError.value = ''

  const payload = items.value
      .filter(i => i.episode_id !== null && !i.alreadyImported)
      .map(i => ({ file_path: i.file.path, episode_id: i.episode_id, hash: i.hash }))

  if (payload.length === 0) {
    importError.value = 'Aucun nouveau fichier à importer'
    importing.value   = false
    return
  }

  try {
    const res = await fetch('/api/manual-import', {
      method     : 'POST',
      headers    : { 'Content-Type': 'application/json' },
      credentials: 'include',
      body       : JSON.stringify({ serie_id: props.serieId, items: payload }),
    })
    const data = await res.json()
    if (!res.ok) { importError.value = data.error ?? 'Erreur inconnue'; return }
    importResult.value = { done: data.done, errors: data.errors ?? [] }
    step.value = 'done'
  } catch {
    importError.value = 'Impossible de contacter le serveur'
  } finally {
    importing.value = false
  }
}

onMounted(scan)
</script>