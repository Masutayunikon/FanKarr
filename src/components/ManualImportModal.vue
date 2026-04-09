<template>
  <Teleport to="body">
    <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" @click.self="$emit('close')">
      <div class="bg-card border border-border rounded-xl w-full max-w-3xl flex flex-col" style="max-height: 85vh">

        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h3 class="text-sm font-semibold text-primary">Import manuel — {{ serieName }}</h3>
            <p class="text-xs text-muted mt-0.5">Associez vos fichiers existants aux épisodes du catalogue</p>
          </div>
          <button @click="$emit('close')" class="text-muted hover:text-primary transition-colors text-lg leading-none">✕</button>
        </div>

        <!-- Étape 1 : Choisir un dossier -->
        <div v-if="step === 'folder'" class="flex flex-col gap-4 px-6 py-5">
          <p class="text-sm text-secondary">Sélectionnez le dossier contenant vos fichiers vidéo :</p>
          <button
              @click="pickerOpen = true"
              class="settings-input text-left font-mono truncate"
              :class="selectedFolder ? 'text-primary' : 'text-muted'"
          >
            {{ selectedFolder || 'Choisir un dossier…' }}
          </button>
          <div class="flex gap-2">
            <button @click="scanFolder" :disabled="!selectedFolder || scanning" class="btn-primary">
              {{ scanning ? 'Scan…' : 'Scanner ce dossier' }}
            </button>
            <button @click="$emit('close')" class="btn-secondary">Annuler</button>
          </div>
        </div>

        <!-- Étape 2 : Matcher les fichiers -->
        <template v-else-if="step === 'match'">

          <!-- Toolbar -->
          <div class="flex items-center justify-between px-6 py-3 border-b border-border shrink-0 gap-3">
            <p class="text-xs text-muted">
              <span class="text-primary font-medium">{{ files.length }}</span> fichier{{ files.length > 1 ? 's' : '' }} trouvé{{ files.length > 1 ? 's' : '' }}
              · <span class="text-green-400">{{ matchedCount }} matché{{ matchedCount > 1 ? 's' : '' }}</span>
              <span v-if="unmatchedCount > 0"> · <span class="text-yellow-500">{{ unmatchedCount }} non matché{{ unmatchedCount > 1 ? 's' : '' }}</span></span>
            </p>
            <button @click="step = 'folder'" class="text-xs text-muted hover:text-primary transition-colors">← Changer de dossier</button>
          </div>

          <!-- Liste fichiers -->
          <div class="overflow-y-auto flex-1 px-6 py-3 flex flex-col gap-2">
            <div
                v-for="(item, i) in items"
                :key="item.file.path"
                class="flex items-center gap-3 p-3 rounded-lg border transition-colors"
                :class="item.episode_id
                  ? 'border-green-500/20 bg-green-500/5'
                  : 'border-border bg-shell'"
            >
              <!-- Icône état -->
              <div class="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                   :class="item.episode_id ? 'bg-green-500/15 text-green-400' : 'bg-border text-muted'">
                <svg v-if="item.episode_id" width="10" height="10" viewBox="0 0 12 12" stroke="currentColor" stroke-width="2.5" fill="none"><polyline points="2 6 5 9 10 3"/></svg>
                <svg v-else width="10" height="10" viewBox="0 0 12 12" stroke="currentColor" stroke-width="2" fill="none"><line x1="6" y1="2" x2="6" y2="7"/><circle cx="6" cy="9.5" r="0.5" fill="currentColor"/></svg>
              </div>

              <!-- Nom fichier -->
              <div class="flex-1 min-w-0">
                <p class="text-xs text-primary font-mono truncate">{{ item.file.name }}</p>
                <p class="text-[11px] text-muted mt-0.5">{{ formatSize(item.file.size) }}</p>
              </div>

              <!-- Sélecteur épisode -->
              <select
                  v-model="items[i].episode_id"
                  class="settings-input text-xs py-1 max-w-[260px] shrink-0"
                  @change="items[i].hash = getHashForEpisode(Number(items[i].episode_id))"
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
              Seuls les fichiers associés à un épisode seront importés.
            </p>
            <div class="flex gap-2">
              <button @click="$emit('close')" class="btn-secondary">Annuler</button>
              <button
                  @click="doImport"
                  :disabled="matchedCount === 0 || importing"
                  class="btn-primary"
              >
                {{ importing ? 'Import…' : `Importer ${matchedCount} fichier${matchedCount > 1 ? 's' : ''}` }}
              </button>
            </div>
          </div>

        </template>

        <!-- Étape 3 : Résultat -->
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

    <!-- Folder Picker -->
    <FolderPicker
        v-if="pickerOpen"
        :initial-path="selectedFolder || '/'"
        @select="onFolderSelect"
        @cancel="pickerOpen = false"
    />
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import FolderPicker from '@/components/FolderPicker.vue'
import { useToast } from '@/composables/useToast'

const { add: toast } = useToast()

const props = defineProps<{
  serieId  : number
  serieName: string
  seasons  : any[]
  organized: Record<string, any>  // episode_id → entry
}>()

const emit = defineEmits<{
  close   : []
  imported: []
}>()

// ─── State ────────────────────────────────────────────────────
const step          = ref<'folder' | 'match' | 'done'>('folder')
const pickerOpen    = ref(false)
const selectedFolder = ref('')
const scanning      = ref(false)
const importing     = ref(false)
const importError   = ref('')
const importResult  = ref({ done: 0, errors: [] as { file: string; error: string }[] })

interface FileItem {
  file      : { name: string; path: string; size: number }
  episode_id: number | null
  hash      : string | null
}

const files = ref<{ name: string; path: string; size: number }[]>([])
const items = ref<FileItem[]>([])

// ─── Computed ─────────────────────────────────────────────────
const matchedCount   = computed(() => items.value.filter(i => i.episode_id !== null).length)
const unmatchedCount = computed(() => items.value.filter(i => i.episode_id === null).length)

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

// Auto-match : on essaie de matcher par original_filename, nfo_filename, formatted_name
function autoMatch(filename: string): { episode_id: number | null; hash: string | null } {
  const lower = filename.toLowerCase()

  for (const season of props.seasons) {
    for (const ep of season.episodes) {
      const candidates = [
        ep.original_filename,
        ep.nfo_filename?.replace(/\.nfo$/, '.mkv'),
        ep.formatted_name ? ep.formatted_name.replace(/[<>:"/\\|?*]/g, '') + '.mkv' : null,
      ].filter(Boolean).map((s: string) => s.toLowerCase())

      if (candidates.some(c => c === lower || lower.includes(c.replace(/\.mkv$/, '')))) {
        const hash = getHashForEpisode(ep.id)
        return { episode_id: ep.id, hash }
      }
    }
  }

  // Fallback : match par numéro d'épisode dans le nom de fichier
  const numMatch = filename.match(/(?:e|ep|episode|épisode)[.\s_-]?0*(\d+)/i)
      ?? filename.match(/\b0*(\d{1,3})\b/)
  if (numMatch) {
    const num = parseInt(numMatch[1], 10)
    for (const season of props.seasons) {
      const ep = season.episodes.find((e: any) => e.episode_number === num)
      if (ep) {
        const hash = getHashForEpisode(ep.id)
        return { episode_id: ep.id, hash }
      }
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

// ─── Actions ──────────────────────────────────────────────────
function onFolderSelect(p: string) {
  selectedFolder.value = p
  pickerOpen.value     = false
}

async function scanFolder() {
  if (!selectedFolder.value) return
  scanning.value = true
  try {
    const res = await fetch(`/api/browse-files?path=${encodeURIComponent(selectedFolder.value)}`, { credentials: 'include' })
    if (!res.ok) { toast('Erreur lors du scan', 'error'); return }
    const data = await res.json()
    files.value = data.files ?? []

    items.value = files.value.map(f => {
      const match = autoMatch(f.name)
      return { file: f, ...match }
    })

    step.value = 'match'
  } catch {
    toast('Impossible de contacter le serveur', 'error')
  } finally {
    scanning.value = false
  }
}

async function doImport() {
  importing.value  = true
  importError.value = ''

  const payload = items.value
      .filter(i => i.episode_id !== null)
      .map(i => ({
        file_path  : i.file.path,
        episode_id : i.episode_id,
        hash       : i.hash,
      }))

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
</script>