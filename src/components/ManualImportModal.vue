<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="$emit('close')">
      <div class="bg-card border border-border rounded-card w-full max-w-3xl flex flex-col shadow-[0_24px_60px_rgb(0_0_0/0.55)] max-h-[85vh]" role="dialog" aria-modal="true" aria-labelledby="manual-import-title">

        <!-- En-tête -->
        <div class="flex items-start justify-between gap-4 px-6 py-4 border-b border-hover shrink-0">
          <div class="min-w-0 flex flex-col gap-1">
            <h3 id="manual-import-title" class="font-display text-xl font-bold text-primary">Import manuel <span class="font-sans text-body font-normal text-muted">— {{ serieName }}</span></h3>
            <p class="text-meta text-muted truncate" :title="serieFolder">{{ serieFolder }}</p>
          </div>
          <button @click="$emit('close')" class="btn-icon btn-sm border-transparent" aria-label="Fermer"><X :size="16" /></button>
        </div>

        <!-- Chargement -->
        <div v-if="scanning" class="flex flex-col items-center justify-center gap-3 py-16 text-muted">
          <div class="w-5 h-5 border border-border border-t-accent rounded-full animate-spin" />
          <p class="text-body">Scan du dossier…</p>
        </div>

        <!-- Dossier vide / introuvable -->
        <div v-else-if="!scanning && items.length === 0 && !scanError" class="flex flex-col items-center gap-3 py-16 text-center px-6">
          <p class="text-body text-primary">{{ folderMissing ? 'Ce dossier n\'existe pas encore.' : 'Aucun fichier vidéo trouvé dans ce dossier.' }}</p>
          <p class="text-meta text-muted">
            {{ folderMissing ? 'Créez' : 'Placez vos fichiers dans' }} <span class="text-secondary break-all">{{ serieFolder }}</span>{{ folderMissing ? ', placez-y vos fichiers' : '' }} puis réessayez.
          </p>
          <button @click="scan" class="btn-secondary btn-sm mt-2"><RefreshCw :size="14" /> Rescanner</button>
        </div>

        <!-- Erreur -->
        <div v-else-if="scanError" class="flex flex-col items-center gap-3 py-16 text-center px-6">
          <p class="text-body text-err">{{ scanError }}</p>
          <button @click="scan" class="btn-secondary btn-sm">Réessayer</button>
        </div>

        <!-- Liste des fichiers -->
        <template v-else-if="items.length > 0 && step !== 'done'">

          <div class="flex items-center justify-between px-6 py-3 border-b border-hover shrink-0 gap-3 flex-wrap">
            <p class="text-meta text-muted">
              <span class="text-primary font-bold">{{ items.length }}</span> fichier{{ items.length > 1 ? 's' : '' }}
              <span v-if="alreadyImportedCount > 0"> · <span class="text-ok">{{ alreadyImportedCount }} déjà importé{{ alreadyImportedCount > 1 ? 's' : '' }}</span></span>
              · <span class="text-accent">{{ newMatchedCount }} nouveau{{ newMatchedCount > 1 ? 'x' : '' }}</span>
              <span v-if="unmatchedCount > 0"> · {{ unmatchedCount }} non associé{{ unmatchedCount > 1 ? 's' : '' }}</span>
            </p>
            <button @click="scan" class="text-meta text-secondary hover:text-primary transition-colors flex items-center gap-1.5"><RefreshCw :size="13" /> Rescanner</button>
          </div>

          <div class="overflow-y-auto flex-1 px-6 py-3 flex flex-col gap-2">
            <div
                v-for="(item, i) in items"
                :key="item.file.path"
                class="flex items-center gap-3 px-3.5 py-3 rounded-field border transition-colors flex-wrap sm:flex-nowrap"
                :class="item.alreadyImported
                  ? 'border-ok/25 bg-ok/5'
                  : item.episode_id
                    ? 'border-accent/30 bg-accent/5'
                    : 'border-border-light bg-main'"
            >
              <span
                  class="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                  :class="item.alreadyImported ? 'bg-ok/15 text-ok' : item.episode_id ? 'bg-accent-muted text-accent' : 'bg-hover text-muted'"
              >
                <Check v-if="item.alreadyImported || item.episode_id" :size="12" :stroke-width="3" />
                <Minus v-else :size="12" :stroke-width="3" />
              </span>

              <div class="flex-1 min-w-0">
                <p class="text-body text-primary truncate" :title="item.file.name">{{ item.file.name }}</p>
                <p class="text-xs text-muted mt-0.5">
                  {{ formatSize(item.file.size) }}
                  <span v-if="item.alreadyImported" class="text-ok"> · déjà importé</span>
                  <span v-else-if="item.willRename" class="text-accent"> · sera renommé</span>
                </p>
              </div>

              <select
                  v-model="item.episode_id"
                  class="field py-2 text-meta w-full sm:w-auto sm:max-w-[280px] shrink-0"
                  @change="onEpisodeChange(i)"
                  :aria-label="`Épisode associé à ${item.file.name}`"
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

          <div class="flex items-center justify-between gap-4 px-6 py-4 border-t border-hover shrink-0 flex-wrap">
            <p v-if="importError" class="text-meta text-err">{{ importError }}</p>
            <p v-else class="text-meta text-muted">
              Les fichiers de ce dossier seront <span class="text-accent">renommés sur place</span>.
            </p>
            <div class="flex gap-2.5">
              <button @click="$emit('close')" class="btn-ghost">Annuler</button>
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
        <div v-else-if="step === 'done'" class="flex flex-col items-center gap-4 px-6 py-10 text-center overflow-y-auto">
          <span
              class="w-12 h-12 rounded-full flex items-center justify-center"
              :class="importResult.errors.length === 0 ? 'bg-ok/10 text-ok' : 'bg-err/10 text-err'"
          >
            <Check v-if="importResult.errors.length === 0" :size="22" :stroke-width="2.5" />
            <TriangleAlert v-else :size="22" :stroke-width="2" />
          </span>
          <div class="flex flex-col gap-1">
            <p class="font-display text-xl font-bold text-primary">Import terminé</p>
            <p class="text-body text-secondary">
              {{ importResult.done }} fichier{{ importResult.done > 1 ? 's' : '' }} importé{{ importResult.done > 1 ? 's' : '' }}
              <span v-if="importResult.errors.length > 0" class="text-err">
                · {{ importResult.errors.length }} erreur{{ importResult.errors.length > 1 ? 's' : '' }}
              </span>
            </p>
          </div>
          <div v-if="importResult.errors.length > 0" class="w-full text-left rounded-field border border-err/25 bg-err/5 px-4 py-3">
            <p class="tag-label text-err mb-1.5">Erreurs</p>
            <p v-for="e in importResult.errors" :key="e.file" class="text-meta text-secondary mb-1 break-words">
              <span class="text-primary">{{ e.file }}</span> — {{ e.error }}
            </p>
          </div>
          <div class="flex gap-2.5">
            <button @click="backToList" class="btn-secondary">Voir les fichiers</button>
            <button @click="$emit('close')" class="btn-primary">Fermer</button>
          </div>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from '@/composables/useToast'
import { Check, Minus, RefreshCw, TriangleAlert, X } from 'lucide-vue-next'
import { matchEpisodeFile } from '@/utils/episode-match'

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
const folderMissing = ref(false)
const importResult = ref({ done: 0, errors: [] as { file: string; error: string }[] })

// Dossier de la série dans la médiathèque
const serieTitle  = computed(() =>
    props.serieName.replace(/:/g, ' -').replace(/[<>"/\\|?*]/g, '').replace(/\s+/g, ' ').trim()
)
const serieFolder = computed(() => `${props.initialPath}/${serieTitle.value}`)

interface FileItem {
  file              : { name: string; path: string; size: number }
  episode_id        : number | null
  originalEpisodeId : number | null   // ep_id au moment du scan (immuable) — sert au serveur pour cleanup
  hash              : string | null
  alreadyImported   : boolean
  willRename        : boolean
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
  const episodeId = matchEpisodeFile(filename, props.seasons)
  return { episode_id: episodeId, hash: episodeId === null ? null : getHashForEpisode(episodeId) }
}

function formatSize(bytes: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

function onEpisodeChange(i: number) {
  const item    = items.value[i]
  if (!item) return
  const newEpId = item.episode_id   // v-model a déjà mis à jour la valeur

  item.hash            = getHashForEpisode(Number(newEpId))
  item.alreadyImported = false
  item.willRename      = newEpId !== null

  // Retirer les autres fichiers "déjà importés" pour ce même épisode :
  // l'utilisateur a choisi de les remplacer par ce fichier-ci.
  if (newEpId !== null) {
    items.value = items.value.filter(other =>
      other === item || !(other.episode_id === newEpId && other.alreadyImported)
    )
  }
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
    folderMissing.value = data.exists === false
    const files: { name: string; path: string; size: number }[] = data.files ?? []

    const organizedByPath = buildOrganizedByPath()

    items.value = files.map(f => {
      // Vérifier si déjà importé via dest_path
      const existingEpId = organizedByPath.get(f.path) ?? null
      if (existingEpId) {
        return { file: f, episode_id: existingEpId, originalEpisodeId: existingEpId, hash: getHashForEpisode(existingEpId), alreadyImported: true, willRename: false }
      }

      const match = autoMatch(f.name)
      return { file: f, ...match, originalEpisodeId: null, alreadyImported: false, willRename: match.episode_id !== null }
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
    if (!res.ok) {
      importError.value = data.error ?? 'Erreur inconnue'
      toast(data.error ?? 'Erreur lors de l\'import', 'error')
      return
    }

    importResult.value = { done: data.done, errors: data.errors ?? [] }

    if (data.done > 0) {
      toast(`${data.done} fichier${data.done > 1 ? 's' : ''} importé${data.done > 1 ? 's' : ''} ✓`, 'success')
    }
    if ((data.errors ?? []).length > 0) {
      toast(`${data.errors.length} fichier${data.errors.length > 1 ? 's' : ''} en erreur`, 'error')
    }

    // Notifier le parent immédiatement (rafraîchit organizedByEpisode + page série)
    emit('imported')

    step.value = 'done'
  } catch {
    importError.value = 'Impossible de contacter le serveur'
    toast('Impossible de contacter le serveur', 'error')
  } finally {
    importing.value = false
  }
}

function backToList() {
  step.value = 'list'
  scan()   // re-scan → les fichiers importés passent en "déjà importé"
}

onMounted(scan)
</script>