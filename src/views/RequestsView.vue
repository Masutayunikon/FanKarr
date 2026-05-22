<template>
  <div class="px-4 md:px-8 py-8 max-w-4xl">

    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-lg font-semibold text-primary">Demandes</h1>
        <p class="text-sm text-muted mt-0.5">
          {{ auth.isAdmin ? 'Toutes les demandes des utilisateurs.' : 'Vos demandes de séries.' }}
        </p>
      </div>
      <!-- Filtres statuts -->
      <div class="flex items-center gap-1">
        <button
            v-for="f in filters" :key="f.value"
            @click="activeFilter = f.value"
            class="px-3 py-1.5 rounded-lg text-xs transition"
            :class="activeFilter === f.value
              ? 'bg-accent text-white'
              : 'text-muted hover:text-primary hover:bg-hover'"
        >
          {{ f.label }}
          <span v-if="counts[f.value]" class="ml-1 opacity-70">({{ counts[f.value] }})</span>
        </button>
      </div>
    </div>

    <!-- Statistiques (admin) -->
    <div v-if="auth.isAdmin" class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <div class="settings-card flex flex-col gap-1">
        <span class="text-xs text-muted">En attente</span>
        <span class="text-2xl font-semibold text-yellow-400">{{ counts.pending }}</span>
      </div>
      <div class="settings-card flex flex-col gap-1">
        <span class="text-xs text-muted">Approuvées</span>
        <span class="text-2xl font-semibold text-blue-400">{{ counts.approved }}</span>
      </div>
      <div class="settings-card flex flex-col gap-1">
        <span class="text-xs text-muted">Disponibles</span>
        <span class="text-2xl font-semibold text-green-400">{{ counts.completed }}</span>
      </div>
      <div class="settings-card flex flex-col gap-1">
        <span class="text-xs text-muted">Refusées</span>
        <span class="text-2xl font-semibold" :class="counts.rejected > 0 ? 'text-red-400' : 'text-muted'">{{ counts.rejected }}</span>
      </div>
    </div>

    <!-- Liste -->
    <div v-if="loading" class="flex items-center gap-2 text-muted text-sm py-8">
      <div class="w-4 h-4 border border-border border-t-accent rounded-full animate-spin" />
      Chargement…
    </div>

    <div v-else-if="filtered.length === 0" class="settings-card text-sm text-muted py-8 text-center">
      Aucune demande {{ activeFilter !== 'all' ? `avec ce statut` : '' }}.
    </div>

    <div v-else class="flex flex-col gap-3">
      <div
          v-for="req in filtered" :key="req.id"
          class="settings-card flex flex-col gap-3"
      >
        <div class="flex items-start justify-between gap-4 flex-wrap">
          <!-- Infos série -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <RouterLink :to="`/series/${req.serieId}`" class="text-sm font-semibold text-primary hover:text-accent transition truncate">
                {{ req.serieName }}
              </RouterLink>
              <span class="text-xs px-2 py-0.5 rounded border shrink-0" :class="statusClass(req.status)">
                {{ statusLabel(req.status) }}
              </span>
            </div>
            <!-- Saisons / épisodes fusionnés -->
            <p class="text-xs text-muted mt-1">
              <template v-if="mergedEpisodes(req).length > 0">
                {{ mergedEpisodes(req).length }} épisode{{ mergedEpisodes(req).length > 1 ? 's' : '' }} spécifique{{ mergedEpisodes(req).length > 1 ? 's' : '' }}
                <template v-if="mergedSeasons(req).length > 0"> · Saisons : {{ mergedSeasons(req).map((s: number) => s === 0 ? 'SP' : `S${s}`).join(', ') }}</template>
              </template>
              <template v-else-if="mergedSeasons(req).length === 0">Toutes les saisons</template>
              <template v-else>Saisons : {{ mergedSeasons(req).map((s: number) => s === 0 ? 'SP' : `S${s}`).join(', ') }}</template>
            </p>
            <!-- Message de refus -->
            <p v-if="req.rejectionMessage" class="text-xs text-red-400 mt-1">
              Refus : {{ req.rejectionMessage }}
            </p>
          </div>

          <!-- Actions admin -->
          <div v-if="auth.isAdmin" class="flex items-center gap-1 shrink-0">
            <button
                v-if="req.status === 'pending' || req.status === 'rejected'"
                @click="approve(req)"
                class="btn-ghost text-xs text-blue-400 hover:text-blue-300"
            >Approuver</button>
            <button
                v-if="req.status === 'approved'"
                @click="complete(req)"
                class="btn-ghost text-xs text-green-400 hover:text-green-300"
            >Marquer disponible</button>
            <button
                v-if="req.status !== 'rejected'"
                @click="openRejectModal(req)"
                class="btn-ghost text-xs text-red-400 hover:text-red-300"
            >Refuser</button>
            <button @click="remove(req)" class="btn-ghost text-xs text-muted hover:text-red-400">Supprimer</button>
          </div>
        </div>

        <!-- Requesters (admin) -->
        <div v-if="auth.isAdmin && req.requesters.length > 0" class="flex flex-wrap gap-2">
          <div v-for="r in req.requesters" :key="r.userId"
               class="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-shell border border-border text-xs">
            <span class="w-4 h-4 rounded-full bg-border flex items-center justify-center text-[9px] font-semibold text-muted shrink-0">
              {{ r.username[0].toUpperCase() }}
            </span>
            <span class="text-muted">{{ r.username }}</span>
            <span v-if="r.episodes?.length > 0" class="text-muted/60">
              ({{ r.episodes.length }} ep.)
            </span>
            <span v-else-if="r.seasons.length > 0" class="text-muted/60">
              ({{ r.seasons.map((s: number) => s === 0 ? 'SP' : `S${s}`).join(', ') }})
            </span>
          </div>
        </div>

        <p class="text-[11px] text-muted">Demandé {{ formatRelative(req.createdAt) }}</p>
      </div>
    </div>

    <!-- Modal refus -->
    <Teleport to="body">
      <div v-if="rejectModal" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4" @click.self="rejectModal = null">
        <div class="settings-card w-full max-w-sm flex flex-col gap-4 p-6">
          <p class="text-sm font-semibold text-primary">Refuser la demande</p>
          <p class="text-xs text-muted truncate">{{ rejectModal.serieName }}</p>
          <div>
            <label class="settings-label mb-1.5">Message de refus (optionnel)</label>
            <input v-model="rejectMessage" type="text" class="settings-input" placeholder="Raison du refus…" @keyup.enter="confirmReject" />
          </div>
          <div class="flex gap-2 justify-end">
            <button @click="rejectModal = null" class="btn-ghost">Annuler</button>
            <button @click="confirmReject" class="px-4 py-2 rounded-lg border border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20 transition text-xs">
              Refuser
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

interface Requester { userId: string; username: string; seasons: number[]; episodes: number[]; requestedAt: string }
interface SerieRequest {
  id: string; serieId: number; serieName: string
  requesters: Requester[]; status: string
  rejectionMessage?: string; createdAt: string; updatedAt: string
}

const auth    = useAuthStore()
const loading = ref(true)
const requests = ref<SerieRequest[]>([])

const activeFilter = ref<string>('all')
const filters = [
  { value: 'all',       label: 'Toutes'    },
  { value: 'pending',   label: 'En attente' },
  { value: 'approved',  label: 'Approuvées' },
  { value: 'completed', label: 'Disponibles' },
  { value: 'rejected',  label: 'Refusées'   },
]

const counts = computed(() => ({
  all      : requests.value.length,
  pending  : requests.value.filter(r => r.status === 'pending').length,
  approved : requests.value.filter(r => r.status === 'approved').length,
  completed: requests.value.filter(r => r.status === 'completed').length,
  rejected : requests.value.filter(r => r.status === 'rejected').length,
}))

const filtered = computed(() =>
  activeFilter.value === 'all'
    ? requests.value
    : requests.value.filter(r => r.status === activeFilter.value)
)

async function load() {
  loading.value = true
  const res = await fetch('/api/requests', { credentials: 'include' })
  if (res.ok) requests.value = await res.json()
  loading.value = false
}

onMounted(load)

// ── Actions admin ─────────────────────────────────────────────
async function approve(req: SerieRequest) {
  const res = await fetch(`/api/requests/${req.id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
    body: JSON.stringify({ action: 'approve' }),
  })
  if (res.ok) load()
}

async function complete(req: SerieRequest) {
  const res = await fetch(`/api/requests/${req.id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
    body: JSON.stringify({ action: 'complete' }),
  })
  if (res.ok) load()
}

async function remove(req: SerieRequest) {
  if (!confirm(`Supprimer la demande pour "${req.serieName}" ?`)) return
  await fetch(`/api/requests/${req.id}`, { method: 'DELETE', credentials: 'include' })
  load()
}

const rejectModal   = ref<SerieRequest | null>(null)
const rejectMessage = ref('')
function openRejectModal(req: SerieRequest) { rejectModal.value = req; rejectMessage.value = '' }
async function confirmReject() {
  if (!rejectModal.value) return
  await fetch(`/api/requests/${rejectModal.value.id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
    body: JSON.stringify({ action: 'reject', rejectionMessage: rejectMessage.value || undefined }),
  })
  rejectModal.value = null
  load()
}

// ── Helpers ───────────────────────────────────────────────────
function mergedSeasons(req: SerieRequest): number[] {
  if (req.requesters.some(r => r.seasons.length === 0 && (r.episodes?.length ?? 0) === 0)) return []
  const all = new Set<number>()
  req.requesters.forEach(r => r.seasons.forEach(s => all.add(s)))
  return [...all].sort((a, b) => a - b)
}

function mergedEpisodes(req: SerieRequest): number[] {
  const all = new Set<number>()
  req.requesters.forEach(r => (r.episodes ?? []).forEach(e => all.add(e)))
  return [...all].sort((a, b) => a - b)
}

function statusLabel(s: string) {
  return { pending: 'En attente', approved: 'Approuvée', rejected: 'Refusée', completed: 'Disponible' }[s] ?? s
}
function statusClass(s: string) {
  return {
    pending  : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    approved : 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    rejected : 'bg-red-500/10 text-red-400 border-red-500/20',
    completed: 'bg-green-500/10 text-green-400 border-green-500/20',
  }[s] ?? ''
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), d = Math.floor(diff / 86400000)
  if (m < 1) return "à l'instant"
  if (m < 60) return `il y a ${m}min`
  if (h < 24) return `il y a ${h}h`
  return `il y a ${d}j`
}
</script>
