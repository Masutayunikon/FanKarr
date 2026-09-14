<template>
  <div class="flex flex-col gap-4">

    <Teleport defer to="#settings-actions">
      <button @click="load" :disabled="loading" class="btn-icon pointer-fine:h-[38px] pointer-fine:w-[38px]" title="Actualiser" aria-label="Actualiser">
        <RefreshCw :size="15" :class="{ 'animate-spin': loading }" />
      </button>
      <button @click="scan" :disabled="scanning" class="btn-secondary pointer-fine:h-[38px]">
        <Loader v-if="scanning" :size="15" class="animate-spin" />
        <ScanSearch v-else :size="15" />
        {{ scanning ? 'Analyse…' : 'Analyser la médiathèque' }}
      </button>
    </Teleport>

    <!-- ── Nommage ────────────────────────────────────────────── -->
    <SettingsSection title="Nommage">
      <template #description>
        FanKarr renomme les fichiers d’après le catalogue Fankai, en
        <span class="text-secondary">{{ nfoSupport ? 'mode NFO' : 'mode formaté' }}</span>.
      </template>

      <div class="flex items-center gap-5 flex-wrap sm:flex-nowrap">
        <div class="flex-1 min-w-0 flex flex-col gap-[3px]">
          <span class="text-sm font-medium text-primary">Renommer tous les fichiers</span>
          <span class="text-meta text-muted">
            <template v-if="loading">Analyse des fichiers importés…</template>
            <template v-else-if="totalNeedsRename > 0">{{ totalNeedsRename }} épisode{{ totalNeedsRename > 1 ? 's ne portent' : ' ne porte' }} pas le nom attendu, sur {{ seriesNeedingRename }} série{{ seriesNeedingRename > 1 ? 's' : '' }}.</template>
            <template v-else>Tous les fichiers portent le nom attendu.</template>
          </span>
        </div>
        <button @click="renameAll()" :disabled="renamingAll || totalNeedsRename === 0" class="btn-secondary btn-sm pointer-fine:h-[34px] shrink-0">
          {{ renamingAll ? 'Renommage…' : totalNeedsRename > 0 ? `Renommer les ${totalNeedsRename}` : 'Renommer' }}
        </button>
      </div>
      <p v-if="renameResult" class="text-meta flex items-center gap-2" :class="renameResult.errors.length > 0 ? 'text-err' : 'text-ok'">
        {{ renameResult.done }} fichier{{ renameResult.done > 1 ? 's' : '' }} renommé{{ renameResult.done > 1 ? 's' : '' }}<template v-if="renameResult.errors.length > 0"> · {{ renameResult.errors.length }} erreur{{ renameResult.errors.length > 1 ? 's' : '' }}</template>
        <button @click="renameResult = null" class="text-muted hover:text-primary" aria-label="Masquer"><X :size="13" /></button>
      </p>

      <div class="h-px bg-hover" />
      <div class="flex items-center gap-5 flex-wrap sm:flex-nowrap">
        <div class="flex-1 min-w-0 flex flex-col gap-[3px]">
          <span class="text-sm font-medium text-primary">Renommer les dossiers de série</span>
          <span class="text-meta text-muted">
            <template v-if="staleFolders.length === 0">Chaque dossier porte le titre de sa série.</template>
            <template v-else>{{ staleFolders.length }} dossier{{ staleFolders.length > 1 ? 's diffèrent' : ' diffère' }} du titre de la série : {{ staleFolders.map(f => `« ${f.current.map(basename).join(', ')} »`).join(', ') }}.</template>
          </span>
        </div>
        <button @click="renameFolders" :disabled="renamingFolders || staleFolders.length === 0" class="btn-secondary btn-sm pointer-fine:h-[34px] shrink-0">
          {{ renamingFolders ? 'Renommage…' : staleFolders.length > 1 ? `Renommer les ${staleFolders.length} dossiers` : 'Renommer le dossier' }}
        </button>
      </div>

      <div class="h-px bg-hover" />
      <div class="flex items-center gap-5 flex-wrap sm:flex-nowrap">
        <div class="flex-1 min-w-0 flex flex-col gap-[3px]">
          <span class="text-sm font-medium text-primary">Forcer la mise à jour des correspondances</span>
          <span class="text-meta text-muted">Recharge le catalogue en ignorant les caches, migre les identifiants d'épisodes, puis renomme les fichiers importés.</span>
        </div>
        <button @click="forceMetadataRefresh" :disabled="forcingRefresh" class="btn-secondary btn-sm pointer-fine:h-[34px] shrink-0">
          {{ forcingRefresh ? 'Rechargement…' : 'Forcer' }}
        </button>
      </div>
    </SettingsSection>

    <!-- ── Métadonnées ────────────────────────────────────────── -->
    <SettingsSection title="Métadonnées" description="Fichiers NFO et images pour Kodi, Infuse ou Plex.">
      <div class="flex items-center gap-5 flex-wrap sm:flex-nowrap">
        <div class="flex-1 min-w-0 flex flex-col gap-[3px]">
          <span class="text-sm font-medium text-primary">Vérifier les NFO</span>
          <span class="text-meta text-muted">
            <template v-if="!nfoSupport">Compare les NFO locaux avec GitLab. Activez d'abord les NFO dans Gestion des médias.</template>
            <template v-else-if="lastNfoUpdate">Compare les NFO locaux avec GitLab. Dernière mise à jour : {{ lastNfoUpdate.serieTitle }}, {{ formatRelative(lastNfoUpdate.updatedAt) }}.</template>
            <template v-else>Compare les NFO locaux avec GitLab et télécharge ceux qui ont changé. Vérification automatique toutes les heures.</template>
          </span>
        </div>
        <button @click="checkNfo" :disabled="checkingNfo || !nfoSupport" class="btn-secondary btn-sm pointer-fine:h-[34px] shrink-0">
          {{ checkingNfo ? 'Lancement…' : 'Vérifier' }}
        </button>
      </div>
      <div class="h-px bg-hover" />
      <div class="flex items-center gap-5 flex-wrap sm:flex-nowrap">
        <div class="flex-1 min-w-0 flex flex-col gap-[3px]">
          <span class="text-sm font-medium text-err">Purger les NFO</span>
          <span class="text-meta text-muted">Supprime tous les fichiers .nfo, .png, .jpg et .tbn des dossiers de séries. Les vidéos ne sont pas touchées.</span>
        </div>
        <button @click="purgeNfo" :disabled="purgingNfo" class="btn-danger btn-sm pointer-fine:h-[34px] shrink-0">
          {{ purgingNfo ? 'Suppression…' : 'Purger' }}
        </button>
      </div>
    </SettingsSection>

    <!-- ── Cohérence de la bibliothèque ───────────────────────── -->
    <SettingsSection title="Cohérence de la bibliothèque" description="Ce que FanKarr croit avoir importé, comparé à ce qui est réellement sur le disque.">
      <div class="flex items-baseline gap-x-7 gap-y-2 flex-wrap">
        <span class="flex items-baseline gap-[9px]"><span class="font-display text-[30px] font-bold text-primary">{{ trackedFiles.toLocaleString('fr-FR') }}</span><span class="text-meta text-muted">fichier{{ trackedFiles > 1 ? 's' : '' }} suivi{{ trackedFiles > 1 ? 's' : '' }}</span></span>
        <span class="flex items-baseline gap-[9px]"><span class="font-display text-[30px] font-bold" :class="orphans.length > 0 ? 'text-accent' : 'text-primary'">{{ orphans.length }}</span><span class="text-meta text-muted">entrée{{ orphans.length > 1 ? 's' : '' }} orpheline{{ orphans.length > 1 ? 's' : '' }}</span></span>
        <span v-if="missingFiles > 0" class="flex items-baseline gap-[9px]"><span class="font-display text-[30px] font-bold text-err">{{ missingFiles }}</span><span class="text-meta text-muted">fichier{{ missingFiles > 1 ? 's' : '' }} introuvable{{ missingFiles > 1 ? 's' : '' }}</span></span>
        <span v-if="lastScan" class="flex items-baseline gap-[9px]"><span class="font-display text-[30px] font-bold text-primary">{{ sinceScan }}</span><span class="text-meta text-muted">depuis le dernier scan</span></span>
      </div>

      <div class="h-px bg-hover" />
      <div class="flex items-center gap-5 flex-wrap sm:flex-nowrap">
        <div class="flex-1 min-w-0 flex flex-col gap-[3px]">
          <span class="text-sm font-medium text-primary">Nettoyer les orphelins</span>
          <span class="text-meta text-muted">
            <template v-if="orphans.length === 0">Aucune entrée suivie hors du catalogue.</template>
            <template v-else>Retire du suivi les {{ orphans.length }} épisodes qui n’existent plus dans le catalogue. Aucun fichier n’est supprimé.</template>
          </span>
          <button v-if="orphans.length > 0" @click="orphansOpen = !orphansOpen" class="text-meta text-secondary hover:text-primary w-fit flex items-center gap-1 mt-0.5">
            {{ orphansOpen ? 'Masquer le détail' : 'Voir le détail' }}
            <ChevronDown :size="13" class="transition-transform" :class="{ 'rotate-180': orphansOpen }" />
          </button>
        </div>
        <button @click="removeOrphans()" :disabled="removingOrphans || orphans.length === 0" class="btn-secondary btn-sm pointer-fine:h-[34px] shrink-0">
          {{ removingOrphans ? '…' : 'Nettoyer' }}
        </button>
      </div>
      <div v-if="orphansOpen && orphans.length > 0" class="flex flex-col rounded-field bg-main border border-border-light">
        <div v-for="o in orphans" :key="`${o.hash}:${o.episode_id}`" class="flex items-center gap-3 px-3.5 py-2 border-b border-hover last:border-b-0">
          <span class="text-meta text-muted tabular-nums shrink-0 w-16">
            {{ o.season != null && o.episode != null ? `S${pad(o.season)}E${pad(o.episode)}` : `#${o.episode_id}` }}
          </span>
          <span class="flex-1 min-w-0 text-meta text-secondary truncate" :title="o.dest_path ?? ''">{{ o.dest_path ?? '—' }}</span>
          <span v-if="!o.file_exists" class="pill pill-err h-5 px-2 text-[10.5px] shrink-0">Introuvable</span>
          <button @click="removeOrphans([o.episode_id])" :disabled="removingOrphans" class="btn-ghost btn-sm h-7 shrink-0">Retirer</button>
        </div>
      </div>

      <div class="h-px bg-hover" />
      <div class="flex items-center gap-5 flex-wrap sm:flex-nowrap">
        <div class="flex-1 min-w-0 flex flex-col gap-[3px]">
          <span class="text-sm font-medium text-primary">Migrer les identifiants</span>
          <span class="text-meta text-muted">À lancer après un renommage de série côté Fankai, quand les identifiants d’épisodes ont changé.</span>
        </div>
        <button @click="migrateIds" :disabled="migrating" class="btn-secondary btn-sm pointer-fine:h-[34px] shrink-0">
          {{ migrating ? 'Migration…' : 'Migrer' }}
        </button>
      </div>
    </SettingsSection>

    <!-- ── Fichiers importés, série par série ──────────────────── -->
    <section class="bg-card rounded-card">
      <div class="flex items-center justify-between gap-4 flex-wrap px-5 pt-4 pb-3.5">
        <div class="flex flex-col gap-0.5">
          <h3 class="card-title">Fichiers importés <span class="font-normal text-muted">· {{ series.length }} série{{ series.length > 1 ? 's' : '' }}</span></h3>
          <p class="text-meta text-muted">Nom actuel et nom attendu de chaque épisode, avec renommage et désimport au cas par cas.</p>
        </div>
        <button
            v-if="totalNeedsRename > 0"
            @click="showOnlyNeedsRename = !showOnlyNeedsRename"
            class="chip"
            :class="{ 'is-active': showOnlyNeedsRename }"
            :aria-pressed="showOnlyNeedsRename"
        >À renommer<span class="chip-count">{{ seriesNeedingRename }}</span></button>
      </div>

      <div v-if="loading" class="flex items-center justify-center gap-2 py-12 text-muted text-body border-t border-hover">
        <div class="w-4 h-4 border border-border border-t-accent rounded-full animate-spin" />
        Chargement…
      </div>

      <div v-else-if="series.length === 0" class="flex flex-col items-center gap-1.5 py-12 text-center border-t border-hover">
        <p class="text-body text-primary">Aucune série importée</p>
        <p class="text-meta text-muted">Importez des séries depuis l’Activité ou par l’import manuel d’une fiche série.</p>
      </div>

      <div v-for="serie in filteredSeries" :key="serie.serie_id" class="border-t border-hover">
        <div class="flex items-center gap-3 px-5 py-3 flex-wrap">
          <button
              @click="toggleSerie(serie.serie_id)"
              class="w-7 h-7 -ml-1 rounded-full flex items-center justify-center text-muted hover:text-primary hover:bg-hover transition-colors shrink-0"
              :aria-expanded="!collapsed.has(serie.serie_id)"
              :aria-label="collapsed.has(serie.serie_id) ? 'Déplier' : 'Replier'"
          >
            <ChevronUp :size="15" class="transition-transform" :class="collapsed.has(serie.serie_id) ? 'rotate-180' : ''" />
          </button>
          <RouterLink :to="`/series/${serie.serie_id}`" class="text-sm font-medium text-primary hover:text-accent transition-colors truncate">{{ serie.serie_title }}</RouterLink>
          <span class="text-meta text-muted">{{ serie.total }} épisode{{ serie.total > 1 ? 's' : '' }}</span>
          <span v-if="serie.needs_rename > 0" class="pill pill-wait h-5 px-2 text-[11px]">{{ serie.needs_rename }} à renommer</span>
          <span v-if="missingIn(serie) > 0" class="pill pill-err h-5 px-2 text-[11px]">{{ missingIn(serie) }} introuvable{{ missingIn(serie) > 1 ? 's' : '' }}</span>
          <span v-else-if="serie.needs_rename === 0" class="flex items-center gap-1 text-meta text-ok"><Check :size="13" /> À jour</span>
          <div class="flex items-center gap-1.5 ml-auto">
            <button v-if="serie.needs_rename > 0" @click="renameAll(serie.serie_id)" :disabled="renamingAll" class="btn-secondary btn-sm h-7 px-3">Tout renommer</button>
            <button @click="unimportSerie(serie, false)" :disabled="renamingAll" class="btn-ghost btn-sm h-7 px-3">Désimporter</button>
            <button @click="unimportSerie(serie, true)" :disabled="renamingAll" class="btn-danger btn-sm h-7 px-3">Supprimer les fichiers</button>
          </div>
        </div>

        <div v-if="!collapsed.has(serie.serie_id)" class="pb-2">
          <div
              v-for="ep in serie.episodes"
              :key="ep.episode_id"
              class="flex items-center gap-3 px-5 py-2 border-t border-hover/60 flex-wrap sm:flex-nowrap"
          >
            <span class="text-meta text-muted tabular-nums shrink-0 w-16">
              S{{ String(ep.season_number).padStart(2,'0') }}E{{ String(ep.episode_number).padStart(2,'0') }}
            </span>
            <div class="flex-1 min-w-0">
              <p class="text-body text-primary truncate">{{ ep.title }}</p>
              <div class="flex items-center gap-1.5 mt-0.5 min-w-0">
                <span class="text-xs text-muted truncate" :title="ep.current_name">{{ ep.current_name }}</span>
                <template v-if="ep.needs_rename">
                  <ArrowRight :size="11" class="shrink-0 text-accent" />
                  <span class="text-xs text-accent truncate" :title="ep.expected_name">{{ ep.expected_name }}</span>
                </template>
              </div>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <span v-if="!ep.file_exists" class="pill pill-err h-5 px-2 text-[10.5px]">Introuvable</span>
              <Check v-else-if="!ep.needs_rename" :size="14" class="text-ok mx-1" />
              <button v-else @click="renameSingle(ep, serie)" :disabled="renamingEp[ep.episode_id]" class="pill pill-wait h-7 px-3 hover:bg-accent-muted transition-colors">
                {{ renamingEp[ep.episode_id] ? '…' : 'Renommer' }}
              </button>
              <button @click="unimportEp(ep, false)" :disabled="renamingEp[ep.episode_id]" class="btn-ghost btn-sm h-7 px-3">Désimporter</button>
              <button @click="unimportEp(ep, true)" :disabled="renamingEp[ep.episode_id]" class="btn-danger btn-sm h-7 px-3">Supprimer</button>
            </div>
          </div>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowRight, Check, ChevronDown, ChevronUp, Loader, RefreshCw, ScanSearch, X } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
import { formatRelative } from '@/utils/format'
import SettingsSection from '@/components/settings/SettingsSection.vue'

const { add: toast } = useToast()

// ─── State ────────────────────────────────────────────────────
const loading     = ref(true)
const renamingAll = ref(false)
const purgingNfo  = ref(false)
const forcingRefresh = ref(false)
const series      = ref<any[]>([])
const nfoSupport  = ref(false)
const collapsed   = ref<Set<number>>(new Set())
const renamingEp  = ref<Record<number, boolean>>({})
const renameResult = ref<{ done: number; errors: any[] } | null>(null)
const showOnlyNeedsRename = ref(false)
const orphans     = ref<{ hash: string; episode_id: number; season: number | null; episode: number | null; dest_path: string | null; file_exists: boolean }[]>([])
const removingOrphans = ref(false)
const orphansOpen     = ref(false)
const staleFolders    = ref<{ serie_id: number; serie_title: string; expected: string; current: string[] }[]>([])
const renamingFolders = ref(false)
const lastScan        = ref<{ at: string; found: number; added: number } | null>(null)
const scanning        = ref(false)
const checkingNfo     = ref(false)
const lastNfoUpdate   = ref<{ serieTitle: string; updatedAt: string } | null>(null)
const migrating       = ref(false)

const basename = (p: string) => p.split(/[\\/]/).pop() ?? p

const pad = (n: number) => String(n).padStart(2, '0')

// ─── Computed ──────────────────────────────────────────────────
const totalNeedsRename = computed(() => series.value.reduce((acc, s) => acc + s.needs_rename, 0))
const seriesNeedingRename = computed(() => series.value.filter(s => s.needs_rename > 0).length)
const trackedFiles = computed(() => series.value.reduce((acc, s) => acc + s.total, 0) + orphans.value.length)
const missingIn    = (serie: any) => serie.episodes.filter((e: any) => !e.file_exists).length
const missingFiles = computed(() => series.value.reduce((acc, s) => acc + missingIn(s), 0))

// « 3 h », « 12 min », « 2 j »
const sinceScan = computed(() => {
  if (!lastScan.value) return ''
  const m = Math.max(0, Math.floor((Date.now() - new Date(lastScan.value.at).getTime()) / 60_000))
  return m < 60 ? `${m} min` : m < 1440 ? `${Math.floor(m / 60)} h` : `${Math.floor(m / 1440)} j`
})

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
    orphans.value    = data.orphans ?? []
    // Replier les séries sans rename par défaut
    collapsed.value = new Set(series.value.filter(s => s.needs_rename === 0).map((s: any) => s.serie_id))
  } finally {
    loading.value = false
  }
  loadStatus()
}

async function loadStatus() {
  try {
    const [folders, scanRes, nfo] = await Promise.all([
      fetch('/api/organized-folders', { credentials: 'include' }),
      fetch('/api/scan',              { credentials: 'include' }),
      fetch('/api/nfo-updates/recent', { credentials: 'include' }),
    ])
    if (folders.ok) staleFolders.value = await folders.json()
    if (scanRes.ok) lastScan.value = (await scanRes.json()).lastScan ?? null
    if (nfo.ok)     lastNfoUpdate.value = (await nfo.json()).find((n: any) => n.status === 'updated') ?? null
  } catch {}
}

async function scan() {
  scanning.value = true
  try {
    const res = await fetch('/api/scan', { method: 'POST', credentials: 'include' })
    const data = await res.json()
    if (!res.ok) { toast(data.error ?? "Erreur lors de l'analyse", 'error'); return }
    toast(data.added > 0 ? `${data.found} fichiers analysés — ${data.added} ajoutés` : `${data.found} fichiers analysés — rien de nouveau`, 'success')
    await load()
  } catch {
    toast('Impossible de contacter le serveur', 'error')
  } finally {
    scanning.value = false
  }
}

async function renameFolders() {
  const targets = staleFolders.value
  if (!targets.length) return
  const names = targets.map(f => `« ${basename(f.expected)} »`).join(', ')
  if (!confirm(`Déplacer le contenu vers ${names} ? Les fichiers existants ne sont jamais écrasés.`)) return
  renamingFolders.value = true
  let moved = 0
  try {
    for (const f of targets) {
      const res = await fetch(`/api/organized/${f.serie_id}/folder`, { method: 'POST', credentials: 'include' })
      const d = await res.json()
      if (!res.ok) { toast(`${f.serie_title} : ${d.error ?? 'erreur'}`, 'error'); continue }
      moved += d.moved ?? 0
    }
    if (moved > 0) toast(`${moved} fichier${moved > 1 ? 's' : ''} déplacé${moved > 1 ? 's' : ''} ✓`, 'success')
    await load()
  } catch {
    toast('Impossible de contacter le serveur', 'error')
  } finally {
    renamingFolders.value = false
  }
}

async function checkNfo() {
  checkingNfo.value = true
  try {
    const res = await fetch('/api/nfo-updates/check', { method: 'POST', credentials: 'include' })
    const data = await res.json()
    toast(res.ok ? 'Vérification des NFO lancée en arrière-plan' : (data.error ?? 'Erreur'), res.ok ? 'success' : 'error')
  } catch {
    toast('Impossible de contacter le serveur', 'error')
  } finally {
    checkingNfo.value = false
  }
}

async function migrateIds() {
  migrating.value = true
  try {
    const res = await fetch('/api/organize/migrate-ids', { method: 'POST', credentials: 'include' })
    const data = await res.json()
    if (!res.ok) { toast(data.error ?? 'Erreur lors de la migration', 'error'); return }
    toast(data.updated > 0 ? `${data.updated} identifiant${data.updated > 1 ? 's' : ''} migré${data.updated > 1 ? 's' : ''} ✓` : 'Aucun identifiant à migrer', 'success')
    if (data.updated > 0) await load()
  } catch {
    toast('Impossible de contacter le serveur', 'error')
  } finally {
    migrating.value = false
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

async function renameSingle(ep: any, serie: any) {
  renamingEp.value[ep.episode_id] = true
  try {
    const res = await fetch('/api/rename-episode', {
      method     : 'POST',
      headers    : { 'Content-Type': 'application/json' },
      credentials: 'include',
      body       : JSON.stringify({ serie_id: serie.serie_id, episode_id: ep.episode_id, torrent_hash: ep.torrent_hash }),
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

async function forceMetadataRefresh() {
  forcingRefresh.value = true
  try {
    const res = await fetch('/api/update', {
      method     : 'POST',
      headers    : { 'Content-Type': 'application/json' },
      credentials: 'include',
      body       : JSON.stringify({ force: true }),
    })
    const data = await res.json()
    if (!res.ok) { toast(data.error ?? 'Erreur lors du rechargement', 'error'); return }
    const parts = [`${data.count} séries rechargées`]
    if (data.migrated > 0) parts.push(`${data.migrated} ID(s) migré(s)`)
    if (data.deduped  > 0) parts.push(`${data.deduped} doublon(s) retiré(s)`)
    parts.push(`${data.renamed} fichier${data.renamed > 1 ? 's' : ''} renommé${data.renamed > 1 ? 's' : ''}`)
    toast(parts.join(' · ') + ' ✓', data.errors > 0 ? 'error' : 'success')
    await load()
  } catch {
    toast('Impossible de contacter le serveur', 'error')
  } finally {
    forcingRefresh.value = false
  }
}

async function purgeNfo() {
  if (!confirm('Supprimer tous les fichiers .nfo, .png, .jpg, .tbn dans les dossiers de la médiathèque ?')) return
  purgingNfo.value = true
  try {
    const res = await fetch('/api/purge-nfo', { method: 'POST', credentials: 'include' })
    const data = await res.json()
    if (!res.ok) { toast(data.error ?? 'Erreur', 'error'); return }
    toast(`${data.deleted} fichier${data.deleted > 1 ? 's' : ''} supprimé${data.deleted > 1 ? 's' : ''}${data.errors.length > 0 ? ` (${data.errors.length} erreur${data.errors.length > 1 ? 's' : ''})` : ''}`, data.errors.length > 0 ? 'error' : 'success')
  } catch {
    toast('Impossible de contacter le serveur', 'error')
  } finally {
    purgingNfo.value = false
  }
}

async function unimportSerie(serie: any, deleteFile: boolean) {
  if (!confirm(`Désimporter "${serie.serie_title}"${deleteFile ? ' et supprimer les fichiers' : ''} ?`)) return
  renamingAll.value = true
  try {
    const res = await fetch(`/api/organized/${serie.serie_id}?deleteFile=${deleteFile}`, {
      method: 'DELETE', credentials: 'include',
    })
    if (!res.ok) { const d = await res.json(); toast(d.error ?? 'Erreur', 'error'); return }
    const data = await res.json()
    toast(`${data.removed} épisode(s) désimporté(s) ✓`, 'success')
    await load()
  } catch {
    toast('Impossible de contacter le serveur', 'error')
  } finally {
    renamingAll.value = false
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

async function removeOrphans(episodeIds?: number[]) {
  if (!episodeIds && !confirm(`Retirer ${orphans.value.length} entrée(s) orpheline(s) du suivi ? Aucun fichier n'est supprimé.`)) return
  removingOrphans.value = true
  try {
    const res = await fetch('/api/organized-summary/orphans', {
      method     : 'DELETE',
      headers    : { 'Content-Type': 'application/json' },
      credentials: 'include',
      body       : JSON.stringify(episodeIds ? { episode_ids: episodeIds } : {}),
    })
    const data = await res.json()
    if (!res.ok) { toast(data.error ?? 'Erreur', 'error'); return }
    toast(`${data.removed} entrée${data.removed > 1 ? 's' : ''} retirée${data.removed > 1 ? 's' : ''} du suivi ✓`, 'success')
    await load()
  } catch {
    toast('Impossible de contacter le serveur', 'error')
  } finally {
    removingOrphans.value = false
  }
}

onMounted(load)
</script>