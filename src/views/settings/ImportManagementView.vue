<template>
  <div class="flex flex-col gap-6 px-4 md:px-8 py-6 max-w-4xl">

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-base font-semibold text-primary">Gestion des imports</h2>
        <p class="text-xs text-muted mt-0.5">
          Visualisez et renommez vos fichiers importés selon le mode actuel
          <span class="ml-1 px-1.5 py-0.5 rounded text-[10px]"
                :class="nfoSupport ? 'bg-accent/10 text-accent' : 'bg-hover text-muted'">
            {{ nfoSupport ? 'Mode NFO' : 'Mode Formaté' }}
          </span>
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button @click="load" :disabled="loading" class="btn-secondary">
          <svg width="13" height="13" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none"
               :class="loading ? 'animate-spin' : ''">
            <path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-6.36-2.64M3 12a9 9 0 0 1 9-9 9 9 0 0 1 6.36 2.64"/>
            <polyline points="16 5 21 5 21 10"/>
          </svg>
          Actualiser
        </button>
        <button
            v-if="totalNeedsRename > 0"
            @click="renameAll()"
            :disabled="renamingAll"
            class="btn-primary"
        >
          {{ renamingAll ? 'Renommage…' : `Tout renommer (${totalNeedsRename})` }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center gap-2 py-16 text-muted text-sm">
      <div class="w-4 h-4 border border-border border-t-accent rounded-full animate-spin" />
      Chargement…
    </div>

    <!-- Vide -->
    <div v-else-if="series.length === 0" class="settings-card flex flex-col items-center gap-2 py-16 text-center">
      <p class="text-sm text-muted">Aucune série importée</p>
      <p class="text-xs text-muted">Importez des séries depuis la page Activité ou via l'import manuel.</p>
    </div>

    <!-- Résultat rename all -->
    <div v-if="renameResult" class="settings-card flex items-center justify-between gap-3">
      <p class="text-xs" :class="renameResult.errors.length > 0 ? 'text-yellow-500' : 'text-green-400'">
        {{ renameResult.done }} fichier{{ renameResult.done > 1 ? 's' : '' }} renommé{{ renameResult.done > 1 ? 's' : '' }}
        <span v-if="renameResult.errors.length > 0"> · {{ renameResult.errors.length }} erreur{{ renameResult.errors.length > 1 ? 's' : '' }}</span>
      </p>
      <button @click="renameResult = null" class="text-xs text-muted hover:text-primary">✕</button>
    </div>

    <!-- Liste séries -->
    <div v-else class="flex flex-col gap-3">
      <div
          v-for="serie in filteredSeries"
          :key="serie.serie_id"
          class="settings-card flex flex-col gap-0"
      >
        <!-- Header série -->
        <div class="flex items-center justify-between py-1">
          <div class="flex items-center gap-2.5">
            <button @click="toggleSerie(serie.serie_id)" class="text-muted hover:text-primary transition-colors">
              <svg width="13" height="13" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none"
                   class="transition-transform" :class="collapsed.has(serie.serie_id) ? '' : 'rotate-180'">
                <polyline points="18 15 12 9 6 15"/>
              </svg>
            </button>
            <p class="text-sm font-medium text-primary">{{ serie.serie_title }}</p>
            <span class="text-xs text-muted">{{ serie.total }} épisode{{ serie.total > 1 ? 's' : '' }}</span>
            <span v-if="serie.needs_rename > 0"
                  class="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
              {{ serie.needs_rename }} à renommer
            </span>
            <span v-else class="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">
              ✓ À jour
            </span>
          </div>
          <button
              v-if="serie.needs_rename > 0"
              @click="renameAll(serie.serie_id)"
              :disabled="renamingAll"
              class="text-xs text-accent hover:underline"
          >
            Tout renommer
          </button>
        </div>

        <!-- Liste épisodes -->
        <div v-if="!collapsed.has(serie.serie_id)" class="flex flex-col divide-y divide-border/50 mt-2 -mx-4 px-4">
          <div
              v-for="ep in serie.episodes"
              :key="ep.episode_id"
              class="flex items-center gap-3 py-2.5"
          >
            <!-- Numéro -->
            <span class="text-xs text-muted font-mono shrink-0 w-14">
              S{{ String(ep.season_number).padStart(2,'0') }}E{{ String(ep.episode_number).padStart(2,'0') }}
            </span>

            <!-- Noms -->
            <div class="flex-1 min-w-0">
              <p class="text-xs text-primary truncate">{{ ep.title }}</p>
              <div class="flex items-center gap-1.5 mt-0.5">
                <span class="text-[11px] font-mono text-muted truncate max-w-xs">{{ ep.current_name }}</span>
                <template v-if="ep.needs_rename">
                  <svg width="10" height="10" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" class="shrink-0 text-yellow-400">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                  <span class="text-[11px] font-mono text-yellow-400 truncate max-w-xs">{{ ep.expected_name }}</span>
                </template>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-2 shrink-0">
              <span v-if="!ep.needs_rename" class="text-[10px] text-green-400">✓</span>
              <button
                  v-else
                  @click="renameSingle(ep)"
                  :disabled="renamingEp[ep.episode_id]"
                  class="text-xs px-2 py-1 rounded-lg border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 transition-colors"
              >
                {{ renamingEp[ep.episode_id] ? '…' : 'Renommer' }}
              </button>
              <button
                  @click="unimportEp(ep, false)"
                  :disabled="renamingEp[ep.episode_id]"
                  class="text-xs px-2 py-1 rounded-lg border border-border text-muted hover:text-primary transition-colors"
              >
                Désimporter
              </button>
              <button
                  @click="unimportEp(ep, true)"
                  :disabled="renamingEp[ep.episode_id]"
                  class="text-xs px-2 py-1 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from '@/composables/useToast'

const { add: toast } = useToast()

// ─── State ────────────────────────────────────────────────────
const loading     = ref(true)
const renamingAll = ref(false)
const series      = ref<any[]>([])
const nfoSupport  = ref(false)
const collapsed   = ref<Set<number>>(new Set())
const renamingEp  = ref<Record<number, boolean>>({})
const renameResult = ref<{ done: number; errors: any[] } | null>(null)
const showOnlyNeedsRename = ref(false)

// ─── Computed ──────────────────────────────────────────────────
const totalNeedsRename = computed(() => series.value.reduce((acc, s) => acc + s.needs_rename, 0))

const filteredSeries = computed(() =>
    showOnlyNeedsRename.value ? series.value.filter(s => s.needs_rename > 0) : series.value
)

// ─── Actions ──────────────────────────────────────────────────
async function load() {
  loading.value = true
  try {
    const res = await fetch('/api/organized-summary', { credentials: 'include' })
    if (!res.ok) { toast('Erreur chargement', 'error'); return }
    const data = await res.json()
    series.value     = data.series ?? []
    nfoSupport.value = data.nfo_support ?? false
    // Replier les séries sans rename par défaut
    collapsed.value = new Set(series.value.filter(s => s.needs_rename === 0).map((s: any) => s.serie_id))
  } finally {
    loading.value = false
  }
}

function toggleSerie(id: number) {
  if (collapsed.value.has(id)) collapsed.value.delete(id)
  else collapsed.value.add(id)
  // Forcer la réactivité
  collapsed.value = new Set(collapsed.value)
}

async function renameAll(serieId?: number) {
  renamingAll.value = true
  renameResult.value = null
  try {
    const res = await fetch('/api/rename-all', {
      method     : 'POST',
      headers    : { 'Content-Type': 'application/json' },
      credentials: 'include',
      body       : JSON.stringify(serieId ? { serie_id: serieId } : {}),
    })
    const data = await res.json()
    renameResult.value = { done: data.done, errors: data.errors ?? [] }
    if (data.done > 0) await load()
  } catch {
    toast('Impossible de contacter le serveur', 'error')
  } finally {
    renamingAll.value = false
  }
}

async function renameSingle(ep: any) {
  renamingEp.value[ep.episode_id] = true
  try {
    const res = await fetch('/api/rename-episode', {
      method     : 'POST',
      headers    : { 'Content-Type': 'application/json' },
      credentials: 'include',
      body       : JSON.stringify({ episode_id: ep.episode_id, torrent_hash: ep.torrent_hash }),
    })
    const data = await res.json()
    if (!res.ok) { toast(data.error ?? 'Erreur', 'error'); return }
    toast(`Renommé : ${data.new_name}`, 'success')
    await load()
  } catch {
    toast('Impossible de contacter le serveur', 'error')
  } finally {
    renamingEp.value[ep.episode_id] = false
  }
}

async function unimportEp(ep: any, deleteFile: boolean) {
  renamingEp.value[ep.episode_id] = true
  try {
    // On cherche le serie_id depuis la liste
    const serie = series.value.find(s => s.episodes.some((e: any) => e.episode_id === ep.episode_id))
    if (!serie) return
    const res = await fetch(`/api/organized/${serie.serie_id}/${ep.episode_id}?deleteFile=${deleteFile}`, {
      method     : 'DELETE',
      credentials: 'include',
    })
    if (!res.ok) { const d = await res.json(); toast(d.error ?? 'Erreur', 'error'); return }
    toast(deleteFile ? 'Fichier supprimé ✓' : 'Désimporté ✓', 'success')
    await load()
  } catch {
    toast('Impossible de contacter le serveur', 'error')
  } finally {
    renamingEp.value[ep.episode_id] = false
  }
}

onMounted(load)
</script>