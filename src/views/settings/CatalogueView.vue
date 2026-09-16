<template>
  <div class="flex flex-col gap-4">

    <Teleport defer to="#settings-actions">
      <button @click="update" :disabled="updating" class="btn-secondary pointer-fine:h-[38px]">
        <RefreshCw :size="15" :class="{ 'animate-spin': updating }" />
        {{ updating ? 'Synchronisation…' : 'Synchroniser maintenant' }}
      </button>
    </Teleport>

    <div v-if="!loaded" class="flex items-center justify-center gap-2 py-16 text-muted text-body">
      <div class="w-4 h-4 border border-border border-t-accent rounded-full animate-spin" />
    </div>

    <template v-else>

      <div v-if="status.empty" class="rounded-card border border-accent/30 bg-accent/5 px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div class="flex items-start gap-3.5">
          <TriangleAlert :size="18" :stroke-width="1.75" class="text-accent shrink-0 mt-0.5" />
          <div class="flex flex-col gap-1">
            <p class="card-title text-accent">Données manquantes</p>
            <p class="text-meta text-secondary">
              {{ status.exists ? 'Le catalogue est vide.' : 'Aucun catalogue trouvé.' }}
              Synchronisez le catalogue pour utiliser FanKarr.
            </p>
          </div>
        </div>
        <button @click="update" :disabled="updating" class="btn-primary">
          {{ updating ? 'Synchronisation…' : 'Synchroniser' }}
        </button>
      </div>

      <SettingsSection title="Sources" description="Les séries et les torrents viennent du scraper GitHub. L'API Fankai complète les séries qui n'y figurent pas encore.">
        <div class="flex items-center gap-5 flex-wrap sm:flex-nowrap">
          <div class="flex-1 min-w-0 flex flex-col gap-[3px]">
            <span class="flex items-center gap-2.5 text-sm font-medium text-primary">
              Scraper GitHub
              <span class="pill h-5 px-[9px] text-[11px]" :class="status.empty ? 'pill-err' : 'pill-ok'">{{ status.empty ? 'Vide' : 'Chargé' }}</span>
            </span>
            <span class="text-meta text-muted">
              {{ status.empty ? 'Aucune donnée chargée' : plural(status.count, 'série disponible', 'séries disponibles') }}<template v-if="status.syncedAt"> · synchronisé {{ formatRelative(status.syncedAt) }}</template>
            </span>
          </div>
          <span class="text-meta text-muted shrink-0">Données gardées en cache 1 h</span>
        </div>
        <div class="h-px bg-hover" />
        <div class="flex items-center gap-5 flex-wrap sm:flex-nowrap">
          <div class="flex-1 min-w-0 flex flex-col gap-[3px]">
            <span class="text-sm font-medium text-primary">API Fankai</span>
            <span class="text-meta text-muted">
              <template v-if="apiOnlyCount > 0">{{ plural(apiOnlyCount, 'série vient', 'séries viennent') }} uniquement de l'API : fiche et images, mais pas de torrents.</template>
              <template v-else>Fournit les titres à jour et les séries absentes du scraper.</template>
            </span>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Surveillance RSS" description="Les nouveaux épisodes des séries surveillées sont envoyés automatiquement au client. Vérification toutes les 6 heures.">
        <template #actions>
          <button @click="runRss" :disabled="runningRss || watched.length === 0" class="btn-secondary btn-sm pointer-fine:h-[34px]">
            <Loader v-if="runningRss" :size="14" class="animate-spin" />
            <RefreshCw v-else :size="14" />
            {{ runningRss ? 'Vérification…' : 'Vérifier maintenant' }}
          </button>
        </template>

        <div class="flex items-baseline gap-[9px]">
          <span class="font-display text-[30px] font-bold text-primary">{{ watched.length }}</span>
          <span class="text-meta text-muted">{{ watched.length > 1 ? 'séries surveillées' : 'série surveillée' }}</span>
        </div>
        <div v-if="watched.length > 0" class="flex items-center gap-2 flex-wrap">
          <RouterLink
              v-for="s in visibleWatched" :key="s.serieId"
              :to="`/series/${s.serieId}`"
              class="h-[26px] px-2.5 rounded-full bg-hover text-meta text-secondary hover:text-primary transition-colors flex items-center"
          >{{ s.serieName }}</RouterLink>
          <button v-if="watched.length > visibleWatched.length" @click="showAllWatched = true" class="text-meta text-muted hover:text-primary">
            + {{ plural(watched.length - visibleWatched.length, 'autre') }}
          </button>
        </div>
        <p v-else class="text-meta text-muted">Activez la surveillance depuis une fiche série ou en sélectionnant plusieurs séries dans la médiathèque.</p>
      </SettingsSection>

      <SettingsSection
          v-if="syncOrphans.length > 0"
          :title="`Séries surveillées disparues du catalogue · ${syncOrphans.length}`"
          description="Ces séries n'existent plus dans le catalogue (supprimées ou recréées sous un autre nom). Réactivez la surveillance sur la nouvelle fiche si besoin."
      >
        <div class="flex flex-col rounded-field bg-main border border-border-light">
          <div v-for="s in syncOrphans" :key="s.serieId" class="flex items-center gap-3 px-3.5 py-2 border-b border-hover last:border-b-0">
            <span class="flex-1 min-w-0 text-body text-primary truncate">{{ s.serieName }}</span>
            <span class="text-meta text-muted shrink-0 tabular-nums">#{{ s.serieId }}</span>
            <button @click="removeSyncOrphan(s.serieId)" class="btn-ghost btn-sm h-7 shrink-0">Retirer</button>
          </div>
        </div>
      </SettingsSection>

    </template>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { Loader, RefreshCw, TriangleAlert } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
import { useSeriesStore } from '@/stores/series'
import { formatRelative, plural } from '@/utils/format'
import SettingsSection from '@/components/settings/SettingsSection.vue'

const { add: toast } = useToast()
const seriesStore = useSeriesStore()

const updating = ref(false)
const loaded   = ref(false)
const status   = ref<{ exists: boolean; count: number; empty: boolean; syncedAt?: string | null }>({ exists: false, count: 0, empty: true })
const syncOrphans = ref<{ serieId: number; serieName: string }[]>([])
const watched     = ref<{ serieId: number; serieName: string }[]>([])
const runningRss  = ref(false)
const showAllWatched = ref(false)
const visibleWatched = computed(() => showAllWatched.value ? watched.value : watched.value.slice(0, 8))
const apiOnlyCount = computed(() => Math.max(0, seriesStore.series.length - status.value.count))

onMounted(async () => {
  fetchSyncOrphans()
  fetchWatched()
  if (seriesStore.series.length === 0) seriesStore.fetchSeries()
  const res = await fetch('/api/torrents/status', { credentials: 'include' })
  if (res.ok) status.value = await res.json()
  loaded.value = true
})

async function fetchWatched() {
  try {
    const res = await fetch('/api/rss-sync', { credentials: 'include' })
    if (res.ok) watched.value = (await res.json()).sort((a: any, b: any) => a.serieName.localeCompare(b.serieName, 'fr'))
  } catch {}
}

async function fetchSyncOrphans() {
  try {
    const res = await fetch('/api/rss-sync/orphans', { credentials: 'include' })
    if (res.ok) syncOrphans.value = (await res.json()).orphans ?? []
  } catch {}
}

async function removeSyncOrphan(serieId: number) {
  try {
    const res = await fetch(`/api/rss-sync/${serieId}`, { method: 'DELETE', credentials: 'include' })
    if (!res.ok) { toast('Impossible de retirer la surveillance', 'error'); return }
    syncOrphans.value = syncOrphans.value.filter(s => s.serieId !== serieId)
    watched.value     = watched.value.filter(s => s.serieId !== serieId)
    toast('Surveillance retirée', 'success')
  } catch {
    toast('Impossible de contacter le serveur', 'error')
  }
}

async function runRss() {
  runningRss.value = true
  try {
    const res  = await fetch('/api/rss-sync/run', { method: 'POST', credentials: 'include' })
    const data = await res.json()
    if (!res.ok) { toast(data.error ?? 'Impossible de vérifier les séries surveillées', 'error'); return }
    toast(data.sent > 0 ? `${plural(data.sent, 'épisode envoyé', 'épisodes envoyés')} au client` : 'Aucun nouvel épisode', data.errors > 0 ? 'error' : 'success')
  } catch {
    toast('Impossible de contacter le serveur', 'error')
  } finally {
    runningRss.value = false
  }
}

async function update() {
  updating.value = true
  try {
    const res = await fetch('/api/update', { method: 'POST', credentials: 'include' })
    if (res.ok) {
      const { count } = await res.json()
      status.value = { exists: true, count, empty: count === 0, syncedAt: new Date().toISOString() }
      toast(`Catalogue synchronisé : ${plural(count, 'série')}`, 'success')
      fetchSyncOrphans()
    } else {
      const { error } = await res.json()
      toast(error ?? 'Impossible de synchroniser le catalogue', 'error')
    }
  } catch {
    toast('Impossible de contacter le serveur', 'error')
  } finally {
    updating.value = false
  }
}
</script>
