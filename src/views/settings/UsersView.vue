<template>
  <div class="flex flex-col gap-8">

    <!-- ── Utilisateurs ─────────────────────────────────────── -->
    <section class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-base font-semibold text-primary">Utilisateurs</h2>
          <p class="text-sm text-muted mt-1">Gérez les comptes ayant accès à FanKarr.</p>
        </div>
        <button @click="openCreateUser" class="btn-secondary">+ Créer</button>
      </div>

      <div v-if="users.length === 0" class="settings-card text-sm text-muted">
        Aucun utilisateur.
      </div>

      <div v-else class="flex flex-col gap-2">
        <div
            v-for="u in users" :key="u.id"
            class="settings-card flex items-center justify-between"
        >
          <div class="flex items-center gap-3">
            <span
                class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                :class="u.role === 'admin' ? 'bg-accent/20 text-accent' : 'bg-border text-muted'"
            >
              {{ u.username[0].toUpperCase() }}
            </span>
            <div>
              <p class="text-sm text-primary font-medium">{{ u.username }}</p>
              <p class="text-xs text-muted mt-0.5">
                {{ u.role === 'admin' ? 'Administrateur' : 'Utilisateur' }}
                · créé le {{ formatDate(u.createdAt) }}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <button @click="openEditUser(u)" class="btn-ghost text-xs text-blue-400 hover:text-blue-300">Modifier</button>
            <button
                @click="confirmDelete(u)"
                :disabled="u.id === currentUserId"
                class="btn-ghost text-xs text-red-400 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed"
            >Supprimer</button>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Invitations ──────────────────────────────────────── -->
    <section class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-base font-semibold text-primary">Invitations</h2>
          <p class="text-sm text-muted mt-1">Générez des liens pour permettre à de nouveaux utilisateurs de s'inscrire.</p>
        </div>
        <button @click="openCreateInvite" class="btn-secondary">+ Générer</button>
      </div>

      <div v-if="invites.length === 0" class="settings-card text-sm text-muted">
        Aucun lien d'invitation actif.
      </div>

      <div v-else class="flex flex-col gap-2">
        <div
            v-for="inv in invites" :key="inv.code"
            class="settings-card flex items-center justify-between gap-4"
            :class="{ 'opacity-50': isExpired(inv) || isExhausted(inv) }"
        >
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span v-if="isExpired(inv) || isExhausted(inv)" class="text-xs text-muted">[Invalide]</span>
              <span v-if="inv.note" class="text-sm text-primary font-medium truncate">{{ inv.note }}</span>
              <span v-else class="text-sm text-muted italic">Sans note</span>
            </div>
            <p class="text-xs text-muted">
              {{ inv.uses }}/{{ inv.maxUses ?? '∞' }} utilisations
              <template v-if="inv.expiresAt"> · expire {{ formatDate(inv.expiresAt) }}</template>
              <template v-else> · sans expiration</template>
            </p>
            <div class="flex items-center gap-2 mt-1.5">
              <code class="text-xs text-muted bg-shell px-2 py-0.5 rounded truncate max-w-xs">
                {{ inviteUrl(inv.code) }}
              </code>
              <button @click="copyInvite(inv.code)" class="btn-ghost text-xs shrink-0">
                {{ copied === inv.code ? 'Copié !' : 'Copier' }}
              </button>
            </div>
          </div>
          <button @click="deleteInvite(inv.code)" class="btn-ghost text-xs text-red-400 hover:text-red-300 shrink-0">
            Révoquer
          </button>
        </div>
      </div>
    </section>

    <!-- ── Modal créer/modifier utilisateur ─────────────────── -->
    <Teleport to="body">
      <div v-if="userModal" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4" @click.self="userModal = null">
        <div class="settings-card w-full max-w-sm flex flex-col gap-5 p-6">
          <h3 class="text-base font-semibold text-primary">
            {{ userModal.mode === 'create' ? 'Créer un utilisateur' : 'Modifier l\'utilisateur' }}
          </h3>

          <div class="flex flex-col gap-4">
            <div>
              <label class="settings-label mb-1.5">Identifiant</label>
              <input v-model="userModal.username" type="text" class="settings-input" placeholder="username" />
            </div>
            <div>
              <label class="settings-label mb-1.5">
                {{ userModal.mode === 'create' ? 'Mot de passe' : 'Nouveau mot de passe' }}
              </label>
              <input v-model="userModal.password" type="password" class="settings-input"
                :placeholder="userModal.mode === 'edit' ? 'Laisser vide pour ne pas changer' : '••••••••'" />
            </div>
            <div>
              <label class="settings-label mb-1.5">Rôle</label>
              <select v-model="userModal.role" class="settings-input">
                <option value="user">Utilisateur</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>
          </div>

          <p v-if="userModal.error" class="text-xs text-red-400">{{ userModal.error }}</p>

          <div class="flex gap-2 justify-end">
            <button @click="userModal = null" class="btn-ghost">Annuler</button>
            <button @click="submitUserModal" :disabled="userModal.loading" class="btn-primary">
              {{ userModal.loading ? '...' : userModal.mode === 'create' ? 'Créer' : 'Enregistrer' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Modal créer invitation ────────────────────────────── -->
    <Teleport to="body">
      <div v-if="inviteModal" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4" @click.self="inviteModal = null">
        <div class="settings-card w-full max-w-sm flex flex-col gap-5 p-6">
          <h3 class="text-base font-semibold text-primary">Générer une invitation</h3>

          <div class="flex flex-col gap-4">
            <div>
              <label class="settings-label mb-1.5">Note (optionnelle)</label>
              <input v-model="inviteModal.note" type="text" class="settings-input" placeholder="Pour qui est ce lien ?" />
            </div>
            <div>
              <label class="settings-label mb-1.5">Utilisations max</label>
              <input v-model.number="inviteModal.maxUses" type="number" min="1" class="settings-input" placeholder="1" />
              <p class="text-xs text-muted mt-1">Laisser vide pour illimité</p>
            </div>
            <div>
              <label class="settings-label mb-1.5">Expire dans (heures)</label>
              <input v-model.number="inviteModal.expiresInHours" type="number" min="1" class="settings-input" placeholder="24" />
              <p class="text-xs text-muted mt-1">Laisser vide pour pas d'expiration</p>
            </div>
          </div>

          <p v-if="inviteModal.error" class="text-xs text-red-400">{{ inviteModal.error }}</p>

          <div class="flex gap-2 justify-end">
            <button @click="inviteModal = null" class="btn-ghost">Annuler</button>
            <button @click="submitInviteModal" :disabled="inviteModal.loading" class="btn-primary">
              {{ inviteModal.loading ? '...' : 'Générer' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore }   from '@/stores/auth'

interface User {
  id       : string
  username : string
  role     : 'admin' | 'user'
  apiToken : string
  createdAt: string
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
const currentUserId = auth.username  // utilisé pour désactiver la suppression de soi-même

const users   = ref<User[]>([])
const invites = ref<Invite[]>([])
const copied  = ref<string | null>(null)

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

onMounted(() => { loadUsers(); loadInvites() })

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

// ── Invites ───────────────────────────────────────────────────
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
  await navigator.clipboard.writeText(inviteUrl(code))
  copied.value = code
  setTimeout(() => { copied.value = null }, 2000)
}

// ── Helpers ───────────────────────────────────────────────────
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function isExpired(inv: Invite) {
  return inv.expiresAt !== null && new Date(inv.expiresAt) < new Date()
}

function isExhausted(inv: Invite) {
  return inv.maxUses !== null && inv.uses >= inv.maxUses
}
</script>
