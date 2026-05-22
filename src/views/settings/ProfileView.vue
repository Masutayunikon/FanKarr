<template>
  <div class="flex flex-col gap-6">

    <!-- ── Informations du compte ────────────────────────────── -->
    <section class="flex flex-col gap-4">
      <div>
        <h2 class="text-base font-semibold text-primary">Mon compte</h2>
        <p class="text-sm text-muted mt-1">Informations associées à votre compte FanKarr.</p>
      </div>

      <div class="settings-card flex flex-col gap-3">
        <div>
          <label class="settings-label mb-1">Nom d'utilisateur</label>
          <p class="text-sm text-primary font-mono bg-shell px-3 py-2 rounded-lg border border-border w-fit">
            {{ auth.username }}
          </p>
        </div>
        <div>
          <label class="settings-label mb-1">Rôle</label>
          <span class="text-xs px-2 py-0.5 rounded-full font-medium"
            :class="auth.isAdmin ? 'bg-violet-500/20 text-violet-300' : 'bg-blue-500/20 text-blue-300'">
            {{ auth.isAdmin ? 'Administrateur' : 'Utilisateur' }}
          </span>
        </div>
      </div>
    </section>

    <!-- ── Changer de mot de passe ───────────────────────────── -->
    <section class="flex flex-col gap-4">
      <div>
        <h2 class="text-base font-semibold text-primary">Changer le mot de passe</h2>
        <p class="text-sm text-muted mt-1">Votre nouveau mot de passe doit faire au moins 6 caractères.</p>
      </div>

      <div class="settings-card flex flex-col gap-4">
        <div>
          <label class="settings-label mb-1.5">Mot de passe actuel</label>
          <input v-model="currentPassword" type="password" class="settings-input" placeholder="••••••••" />
        </div>
        <div>
          <label class="settings-label mb-1.5">Nouveau mot de passe</label>
          <input v-model="newPassword" type="password" class="settings-input" placeholder="••••••••" />
        </div>
        <div>
          <label class="settings-label mb-1.5">Confirmer le nouveau mot de passe</label>
          <input v-model="confirmPassword" type="password" class="settings-input" placeholder="••••••••" />
        </div>

        <div class="flex items-center gap-3 flex-wrap">
          <button @click="changePassword" :disabled="changingPwd" class="btn-primary">
            {{ changingPwd ? 'Modification…' : 'Modifier le mot de passe' }}
          </button>
          <span v-if="pwdSuccess" class="text-xs text-green-400">Mot de passe modifié.</span>
          <span v-if="pwdError"   class="text-xs text-red-400">{{ pwdError }}</span>
        </div>
      </div>
    </section>

    <!-- ── Token API personnel ──────────────────────────────── -->
    <section class="flex flex-col gap-4">
      <div>
        <h2 class="text-base font-semibold text-primary">Token API personnel</h2>
        <p class="text-sm text-muted mt-1">
          Utilisez ce token pour accéder à l'API FanKarr depuis des applications tierces
          (ex : plugin Jellyfin).
        </p>
      </div>

      <div class="settings-card flex flex-col gap-3">
        <div class="flex items-center gap-2">
          <code class="flex-1 text-xs bg-shell px-3 py-2 rounded-lg border border-border text-muted font-mono truncate">
            {{ showToken ? myToken : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••' }}
          </code>
          <button @click="showToken = !showToken" class="btn-ghost text-xs shrink-0">
            {{ showToken ? 'Masquer' : 'Afficher' }}
          </button>
          <button @click="copyToken" class="btn-ghost text-xs shrink-0">
            {{ tokenCopied ? 'Copié !' : 'Copier' }}
          </button>
        </div>
        <button @click="regenerateToken" class="btn-ghost text-xs text-red-400 hover:text-red-300 w-fit">
          Regénérer le token
        </button>
        <p class="text-xs text-muted">
          Authentification via header :
          <code class="bg-shell px-1.5 py-0.5 rounded text-xs">Authorization: Bearer &lt;token&gt;</code>
        </p>
      </div>
    </section>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore }   from '@/stores/auth'

const auth = useAuthStore()


// ── Mot de passe ──────────────────────────────────────────────
const currentPassword = ref('')
const newPassword     = ref('')
const confirmPassword = ref('')
const changingPwd     = ref(false)
const pwdSuccess      = ref(false)
const pwdError        = ref<string | null>(null)

async function changePassword() {
  pwdError.value   = null
  pwdSuccess.value = false

  if (!currentPassword.value || !newPassword.value) {
    pwdError.value = 'Tous les champs sont requis.'; return
  }
  if (newPassword.value !== confirmPassword.value) {
    pwdError.value = 'Les mots de passe ne correspondent pas.'; return
  }
  if (newPassword.value.length < 6) {
    pwdError.value = 'Le mot de passe doit faire au moins 6 caractères.'; return
  }

  changingPwd.value = true
  const res = await fetch('/api/auth/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ currentPassword: currentPassword.value, newPassword: newPassword.value }),
  })
  const data = await res.json()
  if (res.ok) {
    pwdSuccess.value  = true
    currentPassword.value = ''
    newPassword.value     = ''
    confirmPassword.value = ''
    setTimeout(() => { pwdSuccess.value = false }, 3000)
  } else {
    pwdError.value = data.error ?? 'Erreur lors du changement de mot de passe'
  }
  changingPwd.value = false
}

// ── Token API ─────────────────────────────────────────────────
const myToken     = ref('')
const showToken   = ref(false)
const tokenCopied = ref(false)

async function loadMyToken() {
  const res = await fetch('/api/auth/me', { credentials: 'include' })
  if (res.ok) {
    const d = await res.json()
    myToken.value = d.apiToken ?? ''
  }
}

onMounted(loadMyToken)

async function copyToken() {
  await navigator.clipboard.writeText(myToken.value)
  tokenCopied.value = true
  setTimeout(() => { tokenCopied.value = false }, 2000)
}

async function regenerateToken() {
  if (!confirm('Regénérer le token ? L\'ancien token sera immédiatement invalidé.')) return
  const res = await fetch('/api/auth/regenerate-token', {
    method: 'POST', credentials: 'include',
  })
  if (res.ok) {
    const d = await res.json()
    myToken.value = d.apiToken
  }
}
</script>
