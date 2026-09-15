<template>
  <div class="flex flex-col gap-4">

    <Teleport defer to="#settings-actions">
      <button @click="checkForUpdates" :disabled="checking" class="btn-secondary pointer-fine:h-[38px]">
        <RefreshCw :size="15" :class="{ 'animate-spin': checking }" />
        {{ checking ? 'Vérification…' : 'Vérifier les mises à jour' }}
      </button>
    </Teleport>

    <SettingsSection title="Version">
      <div class="flex items-center gap-5 flex-wrap sm:flex-nowrap">
        <div class="flex-1 min-w-0 flex flex-col gap-[3px]">
          <span class="flex items-center gap-2.5 text-sm font-medium text-primary flex-wrap">
            FanKarr {{ currentVersion || '…' }}
            <span v-if="latestVersion && updateAvailable" class="pill pill-wait h-5 px-[9px] text-[11px]">{{ latestVersion }} disponible</span>
            <span v-else-if="latestVersion" class="pill pill-ok h-5 px-[9px] text-[11px]">À jour</span>
          </span>
          <span class="text-meta text-muted">
            <template v-if="debug">Serveur démarré il y a {{ uptime }} · </template>mises à jour vérifiées toutes les 6 h
          </span>
        </div>
        <a :href="releaseUrl" target="_blank" rel="noopener" class="btn-secondary btn-sm pointer-fine:h-[34px] shrink-0">
          Notes de version <ExternalLink :size="13" />
        </a>
      </div>
    </SettingsSection>

    <SettingsSection title="Diagnostic" description="État du serveur, utile pour signaler un bug.">
      <template #actions>
        <button @click="fetchDebug" class="btn-ghost btn-sm"><RefreshCw :size="13" /> Actualiser</button>
      </template>
      <div v-if="debug" class="grid grid-cols-2 md:grid-cols-5 gap-x-6 gap-y-4">
        <div v-for="d in diagnostics" :key="d.label" class="flex flex-col gap-0.5">
          <span class="font-display text-2xl font-bold" :class="d.accent ? 'text-accent' : 'text-primary'">{{ d.value }}</span>
          <span class="text-meta text-muted">{{ d.label }}</span>
        </div>
      </div>
      <p v-else class="text-meta text-muted">Chargement…</p>
    </SettingsSection>

    <SettingsSection title="Développement">
      <template #actions>
        <span v-if="saved" class="text-meta text-ok flex items-center gap-1.5"><Check :size="14" /> Enregistré</span>
      </template>
      <SettingsToggle
          v-model="devMode"
          label="Mode développeur"
          description="Affiche aussi ce diagnostic en bas de l'accueil."
      />
    </SettingsSection>

    <SettingsSection title="Assistant et visite guidée">
      <div class="flex items-center gap-5 flex-wrap sm:flex-nowrap">
        <div class="flex-1 min-w-0 flex flex-col gap-[3px]">
          <span class="text-sm font-medium text-primary">Assistant de configuration</span>
          <span class="text-meta text-muted">Reprend pas à pas les dossiers, le client torrent, Jellyfin ou Plex et le catalogue. La configuration actuelle est conservée.</span>
        </div>
        <div class="flex gap-2.5 shrink-0 flex-wrap">
          <button @click="tour.start()" class="btn-ghost btn-sm pointer-fine:h-[34px]">Revoir la visite</button>
          <RouterLink to="/setup" class="btn-secondary btn-sm pointer-fine:h-[34px]">Relancer l'assistant</RouterLink>
        </div>
      </div>
    </SettingsSection>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { Check, ExternalLink, RefreshCw } from 'lucide-vue-next'
import SettingsToggle from '@/components/settings/SettingsToggle.vue'
import SettingsSection from '@/components/settings/SettingsSection.vue'
import { useTourStore } from '@/stores/tour'

const tour    = useTourStore()

const devMode = ref(false)
const saved   = ref(false)
let saveTimer: ReturnType<typeof setTimeout> | null = null
let loaded    = false

// ── Version ──
const GITHUB_REPO     = 'masutayunikon/FanKarr'
const currentVersion  = ref('')
const latestVersion   = ref('')
const releaseUrl      = ref(`https://github.com/${GITHUB_REPO}/releases/latest`)
const checking        = ref(false)

const updateAvailable = computed(() => {
  if (!latestVersion.value || !currentVersion.value || currentVersion.value === 'dev') return false
  const parse = (v: string) => v.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0)
  const l = parse(latestVersion.value), c = parse(currentVersion.value)
  for (let i = 0; i < Math.max(l.length, c.length); i++) {
    if ((l[i] ?? 0) !== (c[i] ?? 0)) return (l[i] ?? 0) > (c[i] ?? 0)
  }
  return false
})

async function checkForUpdates() {
  checking.value = true
  try {
    const vRes = await fetch('/api/version', { credentials: 'include' })
    if (vRes.ok) currentVersion.value = (await vRes.json()).version
    const gRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github.v3+json' },
    })
    if (gRes.ok) {
      const release = await gRes.json()
      latestVersion.value = release.tag_name ?? ''
      releaseUrl.value    = release.html_url ?? releaseUrl.value
    }
  } catch {} finally {
    checking.value = false
  }
}

// ── Diagnostic ──
const debug = ref<any>(null)

async function fetchDebug() {
  const res = await fetch('/api/debug/stats', { credentials: 'include' })
  if (res.ok) debug.value = await res.json()
}

// « 4 h 37 min »
const uptime = computed(() => {
  const s = debug.value?.uptimeSeconds ?? 0
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60)
  return d > 0 ? `${d} j ${h} h` : h > 0 ? `${h} h ${m} min` : `${m} min`
})

const diagnostics = computed(() => debug.value ? [
  { label: `mémoire utilisée sur ${debug.value.memory.heapTotal} Mo`, value: `${debug.value.memory.heapUsed} Mo` },
  { label: 'mémoire système (RSS)', value: `${debug.value.memory.rss} Mo` },
  { label: 'fichiers suivis',       value: debug.value.organized.trackedFiles.toLocaleString('fr-FR') },
  { label: `entrées en cache (gardées ${debug.value.cache.ttlHours} h)`, value: debug.value.cache.entries },
  { label: "tâche d'import",        value: debug.value.worker.running ? 'Active' : 'Inactive', accent: debug.value.worker.running },
] : [])

onMounted(async () => {
  checkForUpdates()
  fetchDebug()
  const res = await fetch('/api/settings', { credentials: 'include' })
  if (res.ok) {
    const s = await res.json()
    devMode.value = s.devMode ?? false
  }
  loaded = true
})

watch(devMode, async (val) => {
  if (!loaded) return
  await fetch('/api/settings', {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body   : JSON.stringify({ devMode: val }),
  })
  saved.value = true
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => { saved.value = false }, 2000)
})
</script>
