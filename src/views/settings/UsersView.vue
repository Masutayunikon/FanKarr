<template>
  <div class="flex flex-col gap-4">

    <Teleport defer to="#settings-actions">
      <button @click="openCreateInvite" class="btn-primary pointer-fine:h-[38px]">
        <Plus :size="15" :stroke-width="2.25" /> Créer une invitation
      </button>
    </Teleport>

    <!-- ── Comptes ────────────────────────────────────────────── -->
    <section class="bg-card rounded-card">
      <div class="flex items-center justify-between gap-4 flex-wrap px-5 pt-4 pb-3.5 border-b border-hover">
        <h3 class="card-title">Comptes <span class="font-normal text-muted">· {{ users.length }}</span></h3>
        <div class="flex items-center gap-3 flex-wrap">
          <span class="text-meta text-muted hidden sm:inline">Le jeton sert à l'API publique et aux applications tierces.</span>
          <button @click="openCreateUser" class="btn-secondary btn-sm"><UserPlus :size="14" /> Créer un compte</button>
        </div>
      </div>

      <div class="hidden md:grid grid-cols-[minmax(0,1fr)_150px_150px_210px_40px] items-center h-[34px] px-5 border-b border-hover tag-label tracking-[0.12em]">
        <span>Utilisateur</span><span>Rôle</span><span>Dernier accès</span><span>Jeton API</span><span />
      </div>

      <p v-if="users.length === 0" class="text-body text-muted px-5 py-5">Aucun utilisateur.</p>

      <div
          v-for="u in users" :key="u.id"
          class="grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_150px_150px_210px_40px] items-center gap-x-3 gap-y-2 px-5 py-3 md:py-0 md:min-h-[58px] border-b border-hover last:border-b-0"
      >
        <div class="flex items-center gap-3 min-w-0">
          <span class="w-8 h-8 rounded-full bg-hover flex items-center justify-center font-display text-[15px] font-bold shrink-0" :class="u.role === 'admin' ? 'text-accent' : 'text-secondary'">
            {{ u.username.charAt(0).toUpperCase() }}
          </span>
          <div class="flex flex-col gap-px min-w-0">
            <span class="text-sm font-semibold text-primary truncate">{{ u.username }}</span>
            <span class="text-xs text-muted truncate">{{ userSubtitle(u) }}</span>
          </div>
        </div>

        <span class="pill w-fit order-3 md:order-none" :class="u.role === 'admin' ? 'pill-wait' : 'pill-neutral'">
          {{ u.role === 'admin' ? 'Administrateur' : 'Invité' }}
        </span>
        <span class="text-[13px] text-secondary order-4 md:order-none">
          <span class="md:hidden text-muted">Dernier accès : </span>{{ u.lastLoginAt ? formatRelative(u.lastLoginAt) : 'jamais' }}
        </span>
        <div class="flex items-center gap-2.5 min-w-0 order-5 md:order-none col-span-2 md:col-span-1">
          <span class="text-meta text-muted truncate">{{ maskToken(u.apiToken) }}</span>
          <button @click="copyToken(u)" class="text-meta text-secondary hover:text-primary transition-colors shrink-0">
            {{ copied === `token-${u.id}` ? 'Copié' : 'Copier' }}
          </button>
        </div>

        <div class="relative justify-self-end order-2 md:order-none" @click.stop>
          <button
              @click="userMenu = userMenu === u.id ? null : u.id"
              class="w-[30px] h-[30px] rounded-full flex items-center justify-center text-muted hover:text-primary hover:bg-hover transition-colors"
              :aria-label="`Actions pour ${u.username}`" aria-haspopup="menu" :aria-expanded="userMenu === u.id"
          >
            <Ellipsis :size="16" />
          </button>
          <div v-if="userMenu === u.id" class="menu absolute right-0 top-full mt-1.5 w-48 z-20" role="menu">
            <button role="menuitem" class="menu-item" @click="userMenu = null; openEditUser(u)"><Pencil :size="14" /> Modifier</button>
            <button
                role="menuitem"
                class="menu-item text-err hover:text-err"
                :disabled="u.id === currentUserId"
                :title="u.id === currentUserId ? 'Vous ne pouvez pas supprimer votre propre compte' : undefined"
                @click="userMenu = null; confirmDelete(u)"
            ><Trash2 :size="14" /> Supprimer</button>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Invitations ────────────────────────────────────────── -->
    <section class="bg-card rounded-card">
      <div class="flex items-center justify-between gap-4 flex-wrap px-5 pt-4 pb-3.5 border-b border-hover">
        <h3 class="card-title">Invitations <span class="font-normal text-muted">· {{ activeInvites }} lien{{ activeInvites > 1 ? 's' : '' }} actif{{ activeInvites > 1 ? 's' : '' }}</span></h3>
        <span class="text-meta text-muted">Un lien crée un compte à chaque utilisation, dans la limite fixée.</span>
      </div>

      <p v-if="invites.length === 0" class="text-body text-muted px-5 py-5">Aucun lien d'invitation. Créez-en un pour inviter quelqu'un.</p>

      <div
          v-for="inv in invites" :key="inv.code"
          class="flex items-center gap-4 flex-wrap sm:flex-nowrap px-5 py-3.5 border-b border-hover last:border-b-0"
      >
        <span class="w-8 h-8 rounded-full border border-dashed flex items-center justify-center shrink-0 text-muted" :class="isInvalid(inv) ? 'border-border-light opacity-60' : 'border-border'">
          <Link2 :size="15" />
        </span>
        <div class="flex-1 min-w-0 flex flex-col gap-[3px]">
          <span class="text-body truncate" :class="isInvalid(inv) ? 'text-muted' : 'text-primary'">
            <template v-if="inv.note">{{ inv.note }} · </template>{{ inviteUrl(inv.code).replace(/^https?:\/\//, '') }}
          </span>
          <span class="text-meta text-muted">
            <template v-if="isExhausted(inv)">utilisations épuisées ({{ inv.uses }}/{{ inv.maxUses }})</template>
            <template v-else-if="isExpired(inv)">expirée {{ formatRelative(inv.expiresAt!) }}</template>
            <template v-else>
              créée {{ formatRelative(inv.createdAt) }} · {{ inv.uses }}/{{ inv.maxUses ?? '∞' }} utilisation{{ (inv.maxUses ?? 2) > 1 ? 's' : '' }}
              · {{ inv.expiresAt ? `expire ${formatFuture(inv.expiresAt)}` : 'sans expiration' }}
            </template>
          </span>
        </div>
        <button v-if="!isInvalid(inv)" @click="copyInvite(inv.code)" class="btn-secondary btn-sm">
          <Check v-if="copied === inv.code" :size="14" class="text-ok" />
          <Copy v-else :size="14" />
          {{ copied === inv.code ? 'Lien copié' : 'Copier le lien' }}
        </button>
        <button
            @click="deleteInvite(inv.code)"
            class="w-8 h-8 rounded-full border border-border-light text-muted flex items-center justify-center hover:text-err hover:border-err/30 transition-colors"
            title="Révoquer le lien" aria-label="Révoquer le lien"
        >
          <Trash2 :size="14" />
        </button>
      </div>
    </section>

    <!-- ── Téléchargement auto ────────────── -->
    <SettingsSection
        title="Téléchargement automatique"
        description="Quand une demande est approuvée, lancer automatiquement le téléchargement pour les utilisateurs sélectionnés."
    >
      <template #actions>
        <span v-if="autoDownloadSaved" class="text-meta text-ok flex items-center gap-1.5"><Check :size="14" /> Enregistré</span>
      </template>

      <SettingsToggle
          :model-value="autoDownloadAll"
          @update:model-value="setAutoDownloadAll"
          label="Tous les utilisateurs"
          description="Chaque approbation déclenche un téléchargement, quel que soit le demandeur."
      />

      <template v-if="!autoDownloadAll">
        <div class="h-px bg-hover" />
        <div v-for="u in users" :key="u.id" class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="w-6 h-6 rounded-full bg-hover flex items-center justify-center font-display text-xs font-bold shrink-0" :class="u.role === 'admin' ? 'text-accent' : 'text-secondary'">{{ u.username.charAt(0).toUpperCase() }}</span>
            <span class="text-body text-primary truncate">{{ u.username }}</span>
            <span class="text-meta text-muted">{{ u.role === 'admin' ? 'Administrateur' : 'Invité' }}</span>
          </div>
          <button
              type="button" role="switch"
              :aria-checked="autoDownloadUserIds.includes(u.id)"
              :aria-label="`Téléchargement automatique pour ${u.username}`"
              @click="toggleAutoDownloadUser(u.id)"
              class="switch"
          ><span class="switch-knob" /></button>
        </div>
        <p v-if="users.length === 0" class="text-meta text-muted">Aucun utilisateur.</p>
      </template>
    </SettingsSection>

    <!-- ── Modal créer/modifier utilisateur ───────────────────── -->
    <Teleport to="body">
      <div v-if="userModal" class="modal-backdrop" @click.self="userModal = null">
        <div class="modal max-w-sm" role="dialog" aria-modal="true" aria-labelledby="user-modal-title">
          <h3 id="user-modal-title" class="card-title">
            {{ userModal.mode === 'create' ? 'Créer un compte' : 'Modifier le compte' }}
          </h3>

          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-[7px]">
              <label for="user-name" class="field-label">Identifiant</label>
              <input id="user-name" v-model="userModal.username" type="text" class="field" placeholder="nom d'utilisateur" autocomplete="off" />
            </div>
            <div class="flex flex-col gap-[7px]">
              <label for="user-pwd" class="field-label">{{ userModal.mode === 'create' ? 'Mot de passe' : 'Nouveau mot de passe' }}</label>
              <input id="user-pwd" v-model="userModal.password" type="password" class="field" autocomplete="new-password"
                :placeholder="userModal.mode === 'edit' ? 'Laisser vide pour ne pas changer' : '••••••••'" />
            </div>
            <div class="flex flex-col gap-[7px]">
              <span class="field-label">Rôle</span>
              <div class="segmented w-fit">
                <button type="button" class="segmented-item" :class="{ 'is-active': userModal.role === 'user' }" @click="userModal.role = 'user'">Invité</button>
                <button type="button" class="segmented-item" :class="{ 'is-active': userModal.role === 'admin' }" @click="userModal.role = 'admin'">Administrateur</button>
              </div>
            </div>
          </div>

          <p v-if="userModal.error" class="text-meta text-err">{{ userModal.error }}</p>

          <div class="flex gap-2.5 justify-end">
            <button @click="userModal = null" class="btn-ghost">Annuler</button>
            <button @click="submitUserModal" :disabled="userModal.loading" class="btn-primary">
              {{ userModal.loading ? '…' : userModal.mode === 'create' ? 'Créer' : 'Enregistrer' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Modal créer invitation ─────────────────────────────── -->
    <Teleport to="body">
      <div v-if="inviteModal" class="modal-backdrop" @click.self="inviteModal = null">
        <div class="modal max-w-sm" role="dialog" aria-modal="true" aria-labelledby="invite-modal-title">
          <h3 id="invite-modal-title" class="card-title">Créer une invitation</h3>

          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-[7px]">
              <label for="invite-note" class="field-label">Note (facultative)</label>
              <input id="invite-note" v-model="inviteModal.note" type="text" class="field" placeholder="Pour qui est ce lien ?" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="flex flex-col gap-[7px]">
                <label for="invite-uses" class="field-label">Utilisations max</label>
                <input id="invite-uses" v-model.number="inviteModal.maxUses" type="number" min="1" class="field" placeholder="∞" />
              </div>
              <div class="flex flex-col gap-[7px]">
                <label for="invite-hours" class="field-label">Expire dans (heures)</label>
                <input id="invite-hours" v-model.number="inviteModal.expiresInHours" type="number" min="1" class="field" placeholder="∞" />
              </div>
            </div>
            <p class="text-xs text-muted">Laisser un champ vide pour ne pas fixer de limite.</p>
          </div>

          <p v-if="inviteModal.error" class="text-meta text-err">{{ inviteModal.error }}</p>

          <div class="flex gap-2.5 justify-end">
            <button @click="inviteModal = null" class="btn-ghost">Annuler</button>
            <button @click="submitInviteModal" :disabled="inviteModal.loading" class="btn-primary">
              {{ inviteModal.loading ? '…' : 'Créer le lien' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Check, Copy, Ellipsis, Link2, Pencil, Plus, Trash2, UserPlus } from 'lucide-vue-next'
import { useAuthStore }    from '@/stores/auth'
import { copyToClipboard } from '@/composables/useClipboard'
import { formatRelative, plural } from '@/utils/format'
import SettingsSection from '@/components/settings/SettingsSection.vue'
import SettingsToggle  from '@/components/settings/SettingsToggle.vue'

interface User {
  id          : string
  username    : string
  role        : 'admin' | 'user'
  apiToken    : string
  createdAt   : string
  lastLoginAt?: string | null
}

interface Invite {
  code         : string
  createdBy    : string
  createdAt    : string
  expiresAt    : string | null
  maxUses      : number | null
  uses         : number
  note?        : string
}

const auth          = useAuthStore()
const currentUserId = computed(() => auth.userId)  // pas de suppression de son propre compte

const users   = ref<User[]>([])
const invites = ref<Invite[]>([])
const copied  = ref<string | null>(null)
const pendingByUser = ref<Map<string, number>>(new Map())
const userMenu = ref<string | null>(null)

// ── Téléchargement auto des demandes ──────────────────────────
const autoDownloadAll     = ref(false)
const autoDownloadUserIds = ref<string[]>([])
const autoDownloadSaved   = ref(false)
let   autoDownloadTimer: ReturnType<typeof setTimeout> | null = null

// ── Modals ────────────────────────────────────────────────────
const userModal = ref<{
  mode    : 'create' | 'edit'
  id?     : string
  username: string
  password: string
  role    : 'admin' | 'user'
  error   : string | null
  loading : boolean
} | null>(null)

const inviteModal = ref<{
  note?         : string
  maxUses?      : number
  expiresInHours?: number
  error         : string | null
  loading       : boolean
} | null>(null)

// ── Chargement ────────────────────────────────────────────────
async function loadUsers() {
  const res = await fetch('/api/users', { credentials: 'include' })
  if (res.ok) users.value = await res.json()
}

async function loadInvites() {
  const res = await fetch('/api/invites', { credentials: 'include' })
  if (res.ok) invites.value = await res.json()
}

async function loadPendingRequests() {
  const res = await fetch('/api/requests', { credentials: 'include' })
  if (!res.ok) return
  const counts = new Map<string, number>()
  for (const r of await res.json())
    if (r.status === 'pending')
      for (const q of r.requesters) counts.set(q.userId, (counts.get(q.userId) ?? 0) + 1)
  pendingByUser.value = counts
}

async function loadAutoDownloadSetting() {
  const res = await fetch('/api/settings', { credentials: 'include' })
  if (!res.ok) return
  const s = await res.json()
  const val = s.requestAutoDownloadUsers ?? []
  if (val === 'all') {
    autoDownloadAll.value     = true
    autoDownloadUserIds.value = []
  } else {
    autoDownloadAll.value     = false
    autoDownloadUserIds.value = Array.isArray(val) ? val : []
  }
}

async function saveAutoDownloadSetting() {
  const value = autoDownloadAll.value ? 'all' : autoDownloadUserIds.value
  await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ requestAutoDownloadUsers: value }),
  })
  autoDownloadSaved.value = true
  if (autoDownloadTimer) clearTimeout(autoDownloadTimer)
  autoDownloadTimer = setTimeout(() => { autoDownloadSaved.value = false }, 2000)
}

function setAutoDownloadAll(value: boolean) {
  autoDownloadAll.value = value
  if (autoDownloadAll.value) autoDownloadUserIds.value = []
  saveAutoDownloadSetting()
}

function toggleAutoDownloadUser(userId: string) {
  const idx = autoDownloadUserIds.value.indexOf(userId)
  if (idx >= 0) autoDownloadUserIds.value.splice(idx, 1)
  else autoDownloadUserIds.value.push(userId)
  saveAutoDownloadSetting()
}

const closeUserMenu = () => { userMenu.value = null }

onMounted(() => {
  loadUsers(); loadInvites(); loadAutoDownloadSetting(); loadPendingRequests()
  document.addEventListener('click', closeUserMenu)
})
onUnmounted(() => document.removeEventListener('click', closeUserMenu))

// ── Users ─────────────────────────────────────────────────────
function openCreateUser() {
  userModal.value = { mode: 'create', username: '', password: '', role: 'user', error: null, loading: false }
}

function openEditUser(u: User) {
  userModal.value = { mode: 'edit', id: u.id, username: u.username, password: '', role: u.role, error: null, loading: false }
}

async function submitUserModal() {
  if (!userModal.value) return
  const m = userModal.value
  m.error   = null
  m.loading = true

  if (!m.username) { m.error = 'Identifiant requis'; m.loading = false; return }
  if (m.mode === 'create' && !m.password) { m.error = 'Mot de passe requis'; m.loading = false; return }

  const url    = m.mode === 'create' ? '/api/users' : `/api/users/${m.id}`
  const method = m.mode === 'create' ? 'POST' : 'PATCH'
  const body: Record<string, any> = { username: m.username, role: m.role }
  if (m.password) body.password = m.password

  const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body) })
  const data = await res.json()

  if (!res.ok) { m.error = data.error; m.loading = false; return }
  userModal.value = null
  loadUsers()
}

async function confirmDelete(u: User) {
  if (!confirm(`Supprimer l'utilisateur "${u.username}" ?`)) return
  await fetch(`/api/users/${u.id}`, { method: 'DELETE', credentials: 'include' })
  loadUsers()
}

function userSubtitle(u: User) {
  const pending = pendingByUser.value.get(u.id) ?? 0
  const parts: string[] = []
  if (u.id === currentUserId.value) parts.push('vous')
  if (pending > 0) parts.push(`${plural(pending, 'demande')} en attente`)
  if (parts.length === 0) parts.push(`créé le ${formatDate(u.createdAt)}`)
  return parts.join(' · ')
}

function maskToken(token: string) {
  return token ? `${token.slice(0, 4)}••••••••••${token.slice(-4)}` : '—'
}

async function copyToken(u: User) {
  try {
    await copyToClipboard(u.apiToken)
    copied.value = `token-${u.id}`
    setTimeout(() => { copied.value = null }, 2000)
  } catch {}
}

// ── Invites ───────────────────────────────────────────────────
const activeInvites = computed(() => invites.value.filter(inv => !isInvalid(inv)).length)

function openCreateInvite() {
  inviteModal.value = { note: '', maxUses: 1, expiresInHours: 24, error: null, loading: false }
}

async function submitInviteModal() {
  if (!inviteModal.value) return
  const m = inviteModal.value
  m.error = null; m.loading = true

  const body: Record<string, any> = {}
  if (m.note)           body.note           = m.note
  if (m.maxUses)        body.maxUses        = m.maxUses
  if (m.expiresInHours) body.expiresInHours = m.expiresInHours

  const res  = await fetch('/api/invites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body) })
  const data = await res.json()

  if (!res.ok) { m.error = data.error; m.loading = false; return }
  inviteModal.value = null
  loadInvites()
}

async function deleteInvite(code: string) {
  if (!confirm('Révoquer ce lien d\'invitation ?')) return
  await fetch(`/api/invites/${code}`, { method: 'DELETE', credentials: 'include' })
  loadInvites()
}

function inviteUrl(code: string) {
  return `${window.location.origin}/invite/${code}`
}

async function copyInvite(code: string) {
  try {
    await copyToClipboard(inviteUrl(code))
    copied.value = code
    setTimeout(() => { copied.value = null }, 2000)
  } catch {}
}

// ── Helpers ───────────────────────────────────────────────────
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

// « dans 5 j », « dans 3 h »
function formatFuture(iso: string) {
  const diff = new Date(iso).getTime() - Date.now()
  const h = Math.round(diff / 3_600_000)
  return h < 24 ? `dans ${Math.max(1, h)} h` : `dans ${Math.round(h / 24)} j`
}

function isExpired(inv: Invite) {
  return inv.expiresAt !== null && new Date(inv.expiresAt) < new Date()
}

function isExhausted(inv: Invite) {
  return inv.maxUses !== null && inv.uses >= inv.maxUses
}

function isInvalid(inv: Invite) {
  return isExpired(inv) || isExhausted(inv)
}
</script>
