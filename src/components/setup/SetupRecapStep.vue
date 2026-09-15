<template>
  <div class="flex flex-col gap-6">

    <ul class="card p-0 divide-y divide-border">
      <li v-for="row in rows" :key="row.label" class="flex items-center gap-3 px-4 py-3">
        <span class="w-6 h-6 rounded-full flex items-center justify-center shrink-0" :class="stateClass[row.state]">
          <span v-if="row.state === 'loading'" class="w-3 h-3 border border-border border-t-accent rounded-full animate-spin" />
          <Check v-else-if="row.state === 'ok'" :size="13" />
          <TriangleAlert v-else-if="row.state === 'warn'" :size="12" />
          <X v-else-if="row.state === 'error'" :size="13" />
          <Minus v-else :size="13" />
        </span>
        <div class="flex-1 min-w-0">
          <p class="text-sm text-primary">{{ row.label }}</p>
          <p class="text-meta text-muted truncate" :title="row.value">{{ row.value }}</p>
        </div>
        <button @click="context.goto(row.step)" class="btn-ghost btn-sm shrink-0">Modifier</button>
      </li>
    </ul>

    <div class="flex flex-col sm:flex-row gap-2">
      <button @click="done(true)" :disabled="finishing || !settings.mediaPath" class="btn-primary">
        <Compass :size="15" />
        {{ context.relaunch ? 'Revoir la visite guidée' : 'Terminer avec la visite guidée' }}
      </button>
      <button @click="done(false)" :disabled="finishing || !settings.mediaPath" class="btn-secondary">
        {{ context.relaunch ? 'Fermer' : 'Terminer sans la visite' }}
      </button>
    </div>
    <p v-if="!context.relaunch" class="text-meta text-muted -mt-3">
      La visite guidée présente les écrans principaux en une minute. Vous pourrez la relancer avec le bouton « ? ».
    </p>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, inject, onMounted } from 'vue'
import { Check, Compass, Minus, TriangleAlert, X } from 'lucide-vue-next'
import { checkPaths, setupContextKey, type SetupSettings, type SetupStepId } from './setup'
import { plural } from '@/utils/format'

type RowState = 'loading' | 'ok' | 'warn' | 'error' | 'neutral'
interface Row { label: string; value: string; state: RowState; step: SetupStepId }

const props = defineProps<{ settings: SetupSettings; isDocker: boolean; defaultPath: string }>()

const context   = inject(setupContextKey)!
const finishing = ref(false)

const stateClass: Record<RowState, string> = {
  loading: 'bg-hover',
  ok     : 'bg-ok/15 text-ok',
  warn   : 'bg-accent-muted text-accent',
  error  : 'bg-err/15 text-err',
  neutral: 'bg-hover text-muted',
}

const modeLabel = { hardlink: 'Hardlink', copy: 'Copier', move: 'Déplacer' }

const row = (label: string, step: SetupStepId, value = '…', state: RowState = 'loading'): Row => ({ label, step, value, state })

const rows = reactive({
  paths   : row('Dossiers', 'paths'),
  mode    : row("Mode d'import", 'paths'),
  client  : row('Client torrent', 'client'),
  import  : row('Import automatique', 'import',
      props.settings.autoImport ? 'Activé' : 'Désactivé : import manuel depuis la page Activité',
      props.settings.autoImport ? 'ok' : 'neutral'),
  nfo     : row('Fichiers NFO et images', 'import', props.settings.nfoSupport ? 'Activés' : 'Désactivés', 'neutral'),
  jellyfin: row('Jellyfin', 'media-server'),
  plex    : row('Plex', 'media-server', context.plexOpened ? 'Assistant ouvert, non vérifié' : 'Non configuré', 'neutral'),
  catalog : row('Catalogue Fankai', 'catalog'),
})

function set(target: Row, value: string, state: RowState) {
  target.value = value
  target.state = state
}

async function getJson(url: string, init?: RequestInit) {
  const res = await fetch(url, { credentials: 'include', ...init })
  if (!res.ok) throw new Error(String(res.status))
  return res.json()
}

async function loadPaths() {
  const s   = props.settings
  const res = s.mediaPath ? await checkPaths(s.mediaPath, s.completePath) : null
  if (!res) {
    set(rows.paths, 'Médiathèque non configurée', 'error')
  } else {
    set(rows.paths,
        `Médiathèque : ${s.mediaPath} · ${s.completePath ? `Téléchargements : ${s.completePath}` : 'dossier des téléchargements non renseigné'}`,
        !res.ok ? 'error' : s.completePath ? 'ok' : 'warn')
  }

  const h = res?.hardlink
  if (s.organizeMode !== 'hardlink') set(rows.mode, modeLabel[s.organizeMode], 'ok')
  else if (h?.tested && h.ok)        set(rows.mode, 'Hardlink · testé avec succès', 'ok')
  else if (h?.tested)                set(rows.mode, `Hardlink · ${h.message}`, 'warn')
  else                               set(rows.mode, 'Hardlink · non testé', 'neutral')
}

async function loadClients() {
  try {
    const clients: { uuid: string; name: string }[] = await getJson('/api/torrent-clients')
    if (clients.length === 0) {
      set(rows.client, 'Aucun client : les téléchargements sont impossibles', 'warn')
      return
    }
    const online = await Promise.all(clients.map(c =>
      getJson(`/api/torrent-clients/${c.uuid}/healthcheck`).then(d => !!d.online).catch(() => false)
    ))
    const up = online.filter(Boolean).length
    set(rows.client,
        `${clients.map(c => c.name).join(', ')} · ${up}/${clients.length} joignable${clients.length > 1 ? 's' : ''}`,
        up === clients.length ? 'ok' : 'warn')
  } catch {
    set(rows.client, 'Impossible de vérifier', 'warn')
  }
}

async function loadJellyfin() {
  try {
    const { jellyfinUrl, hasToken } = await getJson('/api/jellyfin/settings')
    if (!jellyfinUrl || !hasToken) {
      set(rows.jellyfin, 'Non configuré', 'neutral')
      return
    }
    const test = await getJson('/api/jellyfin/test', { method: 'POST' })
    if (test.ok) set(rows.jellyfin, `${jellyfinUrl} · Jellyfin ${test.version ?? ''}`.trim(), 'ok')
    else         set(rows.jellyfin, `${jellyfinUrl} · ${test.error ?? 'connexion impossible'}`, 'error')
  } catch {
    set(rows.jellyfin, 'Impossible de vérifier', 'warn')
  }
}

async function loadCatalog() {
  try {
    const { count, empty } = await getJson('/api/torrents/status')
    if (empty) set(rows.catalog, 'Catalogue vide', 'warn')
    else       set(rows.catalog, plural(count, 'série disponible', 'séries disponibles'), 'ok')
  } catch {
    set(rows.catalog, 'Impossible de vérifier', 'warn')
  }
}

async function done(withTour: boolean) {
  finishing.value = true
  try { await context.finish(withTour) }
  finally { finishing.value = false }
}

onMounted(() => {
  loadPaths()
  loadClients()
  loadJellyfin()
  loadCatalog()
})
</script>
