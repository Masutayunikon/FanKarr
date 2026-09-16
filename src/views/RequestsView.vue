<template>
  <div class="px-4 md:px-10 pt-[26px] pb-12">
    <div class="max-w-[1100px] flex flex-col gap-[18px]">

      <header data-tour="requests-header" class="flex items-center justify-between gap-x-4 gap-y-3 flex-wrap min-h-11">
        <div class="flex items-baseline gap-3.5 flex-wrap">
          <h1 class="page-title tracking-[0.01em]">{{ auth.isAdmin ? 'Demandes' : 'Mes demandes' }}</h1>
          <span class="text-[13px] text-muted">{{ counts.all }} au total · {{ counts.pending }} en attente</span>
        </div>

        <div v-if="auth.isAdmin" class="flex items-center gap-2.5">
          <button
              v-if="approvableCount > 0"
              @click="approveAllWithTorrents"
              :disabled="bulkBusy"
              class="h-[38px] pointer-coarse:h-11 px-4 rounded-full border border-accent/35 text-accent text-body font-bold flex items-center gap-2 hover:bg-accent-muted transition-colors disabled:opacity-50"
          >
            <Loader v-if="bulkBusy" :size="15" class="animate-spin" />
            <Check v-else :size="15" :stroke-width="2.25" />
            Approuver et télécharger ({{ approvableCount }})
          </button>
          <div ref="headerMenuRef" class="relative">
            <button @click="headerMenuOpen = !headerMenuOpen" class="btn-icon pointer-fine:h-[38px] pointer-fine:w-[38px]" aria-label="Plus d'actions" aria-haspopup="menu" :aria-expanded="headerMenuOpen">
              <Ellipsis :size="17" />
            </button>
            <div v-if="headerMenuOpen" class="menu absolute right-0 top-full mt-1.5 w-52 z-20" role="menu">
              <button role="menuitem" class="menu-item text-err hover:text-err" :disabled="requests.length === 0" @click="headerMenuOpen = false; removeAll()">
                <Trash2 :size="14" /> Tout supprimer
              </button>
            </div>
          </div>
        </div>

        <RouterLink v-else to="/series" class="h-[38px] pointer-coarse:h-11 px-[18px] rounded-full border border-border text-primary text-body font-semibold flex items-center gap-[9px] hover:bg-hover transition-colors">
          <Plus :size="15" /> Demander une série
        </RouterLink>
      </header>

      <div class="chip-row">
        <button
            v-for="f in visibleFilters" :key="f.value"
            @click="activeFilter = f.value"
            class="chip"
            :class="{ 'is-active': activeFilter === f.value }"
            :aria-pressed="activeFilter === f.value"
        >
          {{ f.label }}<span class="chip-count" :class="{ 'text-accent! font-bold': f.value === 'pending' && counts.pending > 0 && activeFilter !== 'pending' }">{{ counts[f.value] }}</span>
        </button>
      </div>

      <div v-if="loading" class="flex items-center gap-2 text-muted text-body py-8">
        <div class="w-4 h-4 border border-border border-t-accent rounded-full animate-spin" />
        Chargement…
      </div>

      <div v-else-if="filtered.length === 0" class="card flex flex-col items-center gap-2 py-12 text-center">
        <p class="font-display text-xl font-bold text-primary">Aucune demande{{ activeFilter !== 'all' ? ' avec ce statut' : '' }}</p>
        <p class="text-body text-muted">
          {{ auth.isAdmin ? "Les demandes des invités (depuis FanKarr ou le plugin Jellyfin) s'afficheront ici." : 'Ouvrez une fiche série pour demander ce qui vous manque.' }}
        </p>
      </div>

      <div v-else class="flex flex-col gap-3.5">
        <article
            v-for="req in filtered" :key="req.id"
            class="card px-[18px] py-4 flex flex-col sm:flex-row gap-4"
        >
          <div class="flex gap-4 flex-1 min-w-0">
            <RouterLink :to="`/series/${req.serieId}`" class="shrink-0">
              <img
                  v-if="posterOf(req.serieId)"
                  :src="posterOf(req.serieId)!"
                  :alt="titleOf(req)"
                  class="w-14 h-[84px] object-cover rounded-[5px]"
                  :class="{ 'grayscale-[0.7] brightness-[0.8]': req.status === 'rejected' }"
              />
              <span v-else class="w-14 h-[84px] rounded-[5px] bg-hover flex items-center justify-center text-muted"><Tv :size="18" /></span>
            </RouterLink>

            <div class="flex-1 min-w-0 flex flex-col gap-[9px]">
              <div class="flex items-center gap-x-2.5 gap-y-1 flex-wrap">
                <RouterLink :to="`/series/${req.serieId}`" class="text-base font-bold hover:text-accent transition-colors truncate" :class="req.status === 'rejected' ? 'text-secondary' : 'text-primary'">
                  {{ titleOf(req) }}
                </RouterLink>
                <span class="pill h-[22px] px-2.5" :class="statusPill(req.status).class">{{ statusPill(req.status).label }}</span>
                <span class="sm:ml-auto text-meta text-muted">{{ dateLabel(req) }}</span>
              </div>

              <span class="text-body" :class="req.status === 'rejected' ? 'text-muted' : 'text-secondary'">{{ scopeLine(req) }}</span>

              <div v-if="auth.isAdmin && (req.status === 'pending' || req.status === 'approved')" class="flex items-center gap-2 flex-wrap">
                <span
                    v-for="r in req.requesters" :key="r.userId"
                    class="flex items-center gap-[7px] h-[26px] pl-1 pr-2.5 rounded-full bg-hover text-meta text-secondary"
                    :title="`Demande envoyée ${formatRelative(r.requestedAt)}`"
                >
                  <span class="w-[18px] h-[18px] rounded-full bg-border text-primary text-[10px] font-bold flex items-center justify-center">{{ r.username.charAt(0).toUpperCase() }}</span>
                  {{ r.username }}<span v-if="req.requesters.length > 1 && requesterScope(r)" class="text-muted">· {{ requesterScope(r) }}</span>
                </span>
                <span v-if="req.status === 'pending' && req.hasTorrents === false" class="flex items-center gap-[7px] text-meta text-err">
                  <TriangleAlert :size="14" :stroke-width="2" /> Aucun torrent disponible : l'approbation ne lancera pas de téléchargement.
                </span>
              </div>

              <p v-if="auth.isAdmin && req.status === 'approved'" class="text-meta text-secondary">
                {{ req.hasTorrents === false ? 'Approuvée sans torrent : rien n\'a été téléchargé.' : 'Téléchargement lancé à l\'approbation.' }}
                <RouterLink to="/activity" class="text-muted hover:text-primary transition-colors">Voir l'activité</RouterLink>
              </p>

              <p v-if="!auth.isAdmin && req.status !== 'rejected'" class="text-meta text-muted">{{ guestStatusLine[req.status] }}</p>

              <p v-if="req.status === 'rejected'" class="text-meta text-err">
                {{ req.rejectionMessage ? `Motif : ${req.rejectionMessage}` : 'Refusée sans motif.' }}
              </p>
            </div>
          </div>

          <div v-if="auth.isAdmin" class="flex max-sm:items-center flex-col max-sm:flex-row gap-2 shrink-0 sm:w-52">
            <button
                v-if="req.status === 'pending' || req.status === 'rejected'"
                @click="approve(req)"
                :disabled="busy[req.id]"
                class="h-9 max-sm:h-11 max-sm:flex-1 max-sm:min-w-0 px-3 rounded-full text-[13px] flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                :class="req.status === 'pending' && req.hasTorrents !== false
                  ? 'bg-accent text-on-accent font-bold hover:bg-accent-hover'
                  : 'border border-border text-primary font-semibold hover:bg-hover'"
            >
              <Check v-if="req.status === 'pending' && req.hasTorrents !== false" :size="15" :stroke-width="2.25" />
              {{ req.status === 'rejected' ? 'Approuver finalement' : req.hasTorrents === false ? 'Approuver sans télécharger' : 'Approuver et télécharger' }}
            </button>
            <button
                v-else-if="req.status === 'approved'"
                @click="complete(req)"
                :disabled="busy[req.id]"
                class="h-9 max-sm:h-11 max-sm:flex-1 rounded-full border border-border text-primary text-[13px] font-semibold hover:bg-hover transition-colors disabled:opacity-50"
            >Marquer comme disponible</button>
            <RouterLink
                v-else
                :to="`/series/${req.serieId}`"
                class="h-9 max-sm:h-11 max-sm:flex-1 rounded-full border border-border text-primary text-[13px] font-semibold hover:bg-hover transition-colors flex items-center justify-center"
            >Voir la série</RouterLink>

            <div class="flex gap-2 shrink-0">
              <button
                  v-if="req.status === 'pending' || req.status === 'approved'"
                  @click="rejectTarget = req"
                  class="flex-1 h-[34px] max-sm:flex-none max-sm:w-11 max-sm:h-11 rounded-full border border-border-light text-secondary text-meta font-medium hover:text-err hover:border-err/30 transition-colors flex items-center justify-center"
                  aria-label="Refuser la demande"
              ><X :size="16" class="sm:hidden" /><span class="max-sm:hidden">Refuser</span></button>
              <button
                  v-else
                  @click="remove(req)"
                  class="flex-1 h-[34px] max-sm:flex-none max-sm:w-11 max-sm:h-11 rounded-full border border-border-light text-secondary text-meta font-medium hover:text-err hover:border-err/30 transition-colors flex items-center justify-center"
                  aria-label="Supprimer la demande"
              ><Trash2 :size="15" class="sm:hidden" /><span class="max-sm:hidden">Supprimer</span></button>

              <div class="relative" @click.stop>
                <button
                    @click="cardMenu = cardMenu === req.id ? null : req.id"
                    class="w-[34px] h-[34px] max-sm:w-11 max-sm:h-11 rounded-full border border-border-light text-muted flex items-center justify-center hover:text-primary hover:bg-hover transition-colors"
                    aria-label="Plus d'actions" aria-haspopup="menu" :aria-expanded="cardMenu === req.id"
                >
                  <Ellipsis :size="15" />
                </button>
                <div v-if="cardMenu === req.id" class="menu absolute right-0 top-full mt-1.5 w-52 z-20" role="menu">
                  <RouterLink v-if="req.status !== 'completed'" :to="`/series/${req.serieId}`" role="menuitem" class="menu-item">
                    <Tv :size="14" /> Voir la série
                  </RouterLink>
                  <button v-if="req.status === 'completed'" role="menuitem" class="menu-item" @click="cardMenu = null; rejectTarget = req">
                    <X :size="14" /> Refuser
                  </button>
                  <button v-if="req.status === 'pending' || req.status === 'approved'" role="menuitem" class="menu-item text-err hover:text-err" @click="cardMenu = null; remove(req)">
                    <Trash2 :size="14" /> Supprimer
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="flex flex-col max-sm:flex-row gap-2 shrink-0 sm:w-[190px]">
            <RouterLink
                :to="`/series/${req.serieId}`"
                class="h-9 max-sm:h-11 max-sm:flex-1 rounded-full border border-border text-primary text-[13px] font-semibold hover:bg-hover transition-colors flex items-center justify-center"
            >Voir la série</RouterLink>
            <button
                v-if="req.status === 'pending'"
                @click="withdraw(req)"
                :disabled="busy[req.id]"
                class="h-[34px] max-sm:h-11 max-sm:flex-1 rounded-full border border-border-light text-secondary text-meta font-medium hover:text-err hover:border-err/30 transition-colors disabled:opacity-50"
            >Annuler ma demande</button>
            <button
                v-else-if="req.status === 'rejected'"
                @click="requestAgain(req)"
                :disabled="busy[req.id]"
                class="h-[34px] max-sm:h-11 max-sm:flex-1 rounded-full border border-border-light text-secondary text-meta font-medium hover:text-primary hover:bg-hover transition-colors disabled:opacity-50"
            >Demander à nouveau</button>
          </div>
        </article>
      </div>
    </div>

    <RejectRequestModal
        v-if="rejectTarget"
        :serie-name="titleOf(rejectTarget)"
        @close="rejectTarget = null"
        @confirm="confirmReject"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'
import { onClickOutside } from '@vueuse/core'
import { Check, Ellipsis, Loader, Plus, Trash2, TriangleAlert, Tv, X } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useSeriesStore } from '@/stores/series'
import { useRequestsStore } from '@/stores/requests'
import { useToast } from '@/composables/useToast'
import { formatRelative, plural } from '@/utils/format'
import { mergedEpisodes, mergedSeasons, seasonsLabel, type Requester, type SerieRequest } from '@/utils/requests'
import RejectRequestModal from '@/components/requests/RejectRequestModal.vue'

const auth        = useAuthStore()
const seriesStore = useSeriesStore()
const reqStore    = useRequestsStore()
const { add: toast } = useToast()

const loading  = ref(true)
const requests = ref<SerieRequest[]>([])
const busy     = reactive<Record<string, boolean>>({})
const bulkBusy = ref(false)

const activeFilter = ref<'all' | 'pending' | 'approved' | 'completed' | 'rejected'>('all')
const filters = [
  { value: 'all',       label: 'Toutes'      },
  { value: 'pending',   label: 'En attente'  },
  { value: 'approved',  label: 'Approuvées'  },
  { value: 'completed', label: 'Disponibles' },
  { value: 'rejected',  label: 'Refusées'    },
] as const

const counts = computed(() => ({
  all      : requests.value.length,
  pending  : requests.value.filter(r => r.status === 'pending').length,
  approved : requests.value.filter(r => r.status === 'approved').length,
  completed: requests.value.filter(r => r.status === 'completed').length,
  rejected : requests.value.filter(r => r.status === 'rejected').length,
}))

// L'invité ne voit « Approuvées » que s'il en a
const visibleFilters = computed(() => filters.filter(f => auth.isAdmin || f.value !== 'approved' || counts.value.approved > 0))

// En attente d'abord, puis les plus récentes
const filtered = computed(() => {
  const order: Record<string, number> = { pending: 0, approved: 1, completed: 2, rejected: 3 }
  const list = activeFilter.value === 'all' ? [...requests.value] : requests.value.filter(r => r.status === activeFilter.value)
  return list.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9) || b.updatedAt.localeCompare(a.updatedAt))
})

const approvableCount = computed(() => requests.value.filter(r => r.status === 'pending' && r.hasTorrents).length)

// ── Présentation ──
const seriesById = computed(() => new Map(seriesStore.series.map(s => [s.id, s])))
const posterOf   = (id: number) => seriesById.value.get(id)?.poster_image ?? null
const titleOf    = (req: SerieRequest) => seriesById.value.get(req.serieId)?.title ?? req.serieName

function statusPill(status: string) {
  if (status === 'approved' && !auth.isAdmin) return { label: 'Bientôt là', class: 'pill-active' }
  return ({
    pending  : { label: 'En attente', class: 'pill-wait' },
    approved : { label: 'Approuvée',  class: 'pill-neutral' },
    completed: { label: 'Disponible', class: 'pill-ok' },
    rejected : { label: 'Refusée',    class: 'pill-err' },
  } as Record<string, { label: string; class: string }>)[status] ?? { label: status, class: 'pill-neutral' }
}

function dateLabel(req: SerieRequest) {
  if (req.status === 'pending')  return `demandée ${formatRelative(req.createdAt)}`
  if (req.status === 'approved') return `approuvée ${formatRelative(req.updatedAt)}`
  if (req.status === 'rejected') return `refusée ${formatRelative(req.updatedAt)}`
  return `ajoutée ${formatRelative(req.updatedAt)}`
}

// « Saisons 3 et 4 · 8 épisodes demandés », « 2 épisodes demandés », « Saison 3 · demandée par marco »
function scopeLine(req: SerieRequest) {
  const episodes = mergedEpisodes(req)
  const parts = [episodes.length > 0 ? plural(episodes.length, 'épisode demandé', 'épisodes demandés') : seasonsLabel(mergedSeasons(req))]
  if (episodes.length === 0 && req.episodeCount && req.status === 'pending') parts.push(plural(req.episodeCount, 'épisode demandé', 'épisodes demandés'))
  if (auth.isAdmin) {
    if (req.status !== 'pending') parts.push(`demandée par ${req.requesters.map(r => r.username).join(', ')}`)
  } else if (req.requesters.length > 1) {
    parts.push("demandée aussi par quelqu'un d'autre")
  }
  return parts.join(' · ')
}

function requesterScope(r: Requester) {
  if ((r.episodes ?? []).length > 0) return plural(r.episodes.length, 'ép.', 'ép.')
  return r.seasons.map(s => s === 0 ? 'Spéciaux' : `S${s}`).join(', ')
}

const guestStatusLine: Record<string, string> = {
  pending  : "L'administrateur n'a pas encore répondu.",
  approved : 'Demande approuvée : la série arrive bientôt.',
  completed: 'Prête à regarder dans la médiathèque.',
}

// ── Chargement ──
async function load() {
  const res = await fetch('/api/requests', { credentials: 'include' })
  if (res.ok) requests.value = await res.json()
  loading.value = false
  reqStore.refreshPending()
}

onMounted(() => {
  if (seriesStore.series.length === 0) seriesStore.fetchSeries()
  load()
  document.addEventListener('click', closeCardMenu)
})
onUnmounted(() => document.removeEventListener('click', closeCardMenu))

// ── Menus ──
const cardMenu       = ref<string | null>(null)
const headerMenuOpen = ref(false)
const headerMenuRef  = ref<HTMLElement | null>(null)
onClickOutside(headerMenuRef, () => { headerMenuOpen.value = false })
function closeCardMenu() { cardMenu.value = null }

// ── Actions admin ──
async function patch(req: SerieRequest, body: object): Promise<boolean> {
  busy[req.id] = true
  try {
    const res = await fetch(`/api/requests/${req.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify(body),
    })
    if (!res.ok) { toast((await res.json()).error ?? 'Impossible de mettre à jour la demande', 'error'); return false }
    return true
  } catch { toast('Impossible de contacter le serveur', 'error'); return false }
  finally { busy[req.id] = false }
}

async function approve(req: SerieRequest) {
  if (await patch(req, { action: 'approve' })) {
    toast(req.hasTorrents === false ? 'Demande approuvée, aucun torrent à télécharger' : 'Demande approuvée, téléchargement lancé', 'success')
    load()
  }
}

async function approveAllWithTorrents() {
  const targets = requests.value.filter(r => r.status === 'pending' && r.hasTorrents)
  if (!targets.length || !confirm(`Approuver ${plural(targets.length, 'demande')} et lancer les téléchargements ?`)) return
  bulkBusy.value = true
  let done = 0
  for (const req of targets) if (await patch(req, { action: 'approve' })) done++
  bulkBusy.value = false
  toast(done === targets.length
      ? `${plural(done, 'demande approuvée', 'demandes approuvées')}, téléchargements lancés`
      : `${plural(done, 'demande approuvée', 'demandes approuvées')} sur ${targets.length}`, done === targets.length ? 'success' : 'error')
  load()
}

async function complete(req: SerieRequest) {
  if (await patch(req, { action: 'complete' })) load()
}

async function remove(req: SerieRequest) {
  if (!confirm(`Supprimer la demande pour « ${titleOf(req)} » ?`)) return
  await fetch(`/api/requests/${req.id}`, { method: 'DELETE', credentials: 'include' })
  load()
}

async function removeAll() {
  const n = requests.value.length
  if (!n) return
  if (!confirm(n > 1 ? `Supprimer les ${n} demandes ?` : 'Supprimer la demande ?')) return
  await fetch('/api/requests', { method: 'DELETE', credentials: 'include' })
  load()
}

const rejectTarget = ref<SerieRequest | null>(null)
async function confirmReject(message: string) {
  const req = rejectTarget.value
  rejectTarget.value = null
  if (req && await patch(req, { action: 'reject', rejectionMessage: message || undefined })) load()
}

// ── Actions invité ──
async function withdraw(req: SerieRequest) {
  if (!confirm(`Annuler votre demande pour « ${titleOf(req)} » ?`)) return
  busy[req.id] = true
  try {
    const res = await fetch(`/api/requests/${req.id}/mine`, { method: 'DELETE', credentials: 'include' })
    if (!res.ok) { toast((await res.json()).error ?? "Impossible d'annuler la demande", 'error'); return }
    toast('Demande annulée', 'success')
    load()
  } catch { toast('Impossible de contacter le serveur', 'error') }
  finally { busy[req.id] = false }
}

async function requestAgain(req: SerieRequest) {
  const mine = req.requesters.find(r => r.userId === auth.userId)
  busy[req.id] = true
  try {
    const res = await fetch('/api/requests', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ serieId: req.serieId, serieName: req.serieName, seasons: mine?.seasons ?? [], episodes: mine?.episodes ?? [] }),
    })
    if (!res.ok) { toast((await res.json()).error ?? "Impossible d'envoyer la demande", 'error'); return }
    toast('Nouvelle demande envoyée', 'success')
    load()
  } catch { toast('Impossible de contacter le serveur', 'error') }
  finally { busy[req.id] = false }
}
</script>
