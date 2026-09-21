<template>
  <div class="flex flex-col gap-4">

    <SettingsSection title="Compte" description="Le nom d'utilisateur sert à la connexion et apparaît sur vos demandes.">
      <div class="flex items-center gap-[18px]">
        <span class="w-16 h-16 rounded-full bg-hover text-accent flex items-center justify-center font-display text-[28px] font-bold shrink-0">
          {{ auth.username?.charAt(0).toUpperCase() }}
        </span>
        <div class="flex-1 min-w-0 flex flex-col gap-[5px]">
          <div class="flex items-center gap-2.5 flex-wrap">
            <span class="text-[17px] font-bold text-primary">{{ auth.username }}</span>
            <span class="pill" :class="auth.isAdmin ? 'pill-wait' : 'pill-neutral'">{{ auth.isAdmin ? 'Administrateur' : 'Invité' }}</span>
          </div>
          <span v-if="me" class="text-meta text-muted">
            <template v-if="me.createdAt">Compte créé le {{ formatDate(me.createdAt) }}</template>
            <template v-if="me.createdAt && me.lastLoginAt"> · </template>
            <template v-if="me.lastLoginAt">dernière connexion {{ formatRelative(me.lastLoginAt) }}</template>
          </span>
        </div>
      </div>
    </SettingsSection>

    <SettingsSection
        v-if="me?.hasPassword === false"
        title="Mot de passe"
        description="Vous vous connectez avec votre compte Jellyfin. Le mot de passe se change dans Jellyfin."
    />

    <SettingsSection v-else title="Mot de passe" description="Au moins 6 caractères.">
      <div class="grid sm:grid-cols-3 gap-4">
        <div class="flex flex-col gap-[7px]">
          <label for="pwd-current" class="field-label">Mot de passe actuel</label>
          <input id="pwd-current" v-model="currentPassword" type="password" class="field" placeholder="••••••••" autocomplete="current-password" />
        </div>
        <div class="flex flex-col gap-[7px]">
          <label for="pwd-new" class="field-label">Nouveau mot de passe</label>
          <input id="pwd-new" v-model="newPassword" type="password" class="field" placeholder="••••••••" autocomplete="new-password" />
        </div>
        <div class="flex flex-col gap-[7px]">
          <label for="pwd-confirm" class="field-label">Confirmer le nouveau mot de passe</label>
          <input id="pwd-confirm" v-model="confirmPassword" type="password" class="field" placeholder="••••••••" autocomplete="new-password" @keyup.enter="changePassword" />
        </div>
      </div>
      <div class="flex items-center gap-3.5 flex-wrap">
        <button @click="changePassword" :disabled="changingPwd" class="btn-secondary pointer-fine:h-[38px]">
          {{ changingPwd ? 'Modification…' : 'Changer le mot de passe' }}
        </button>
        <span v-if="pwdSuccess" class="text-meta text-ok flex items-center gap-1.5"><Check :size="14" /> Mot de passe modifié.</span>
        <span v-else-if="pwdError" class="text-meta text-err">{{ pwdError }}</span>
        <span v-else class="text-meta text-muted">Les autres sessions ouvertes resteront connectées.</span>
      </div>
    </SettingsSection>

    <div class="grid lg:grid-cols-[1fr_1.1fr] gap-4 items-start">
      <SettingsSection title="Apparence" description="Couleur d'accent de l'interface. Ce choix ne s'applique qu'à ce navigateur.">
        <ThemePicker />
      </SettingsSection>

      <div data-tour="profile-token">
        <SettingsSection title="Jeton d'API" description="Pour les applications tierces qui lisent la médiathèque ou envoient des demandes, comme le plugin Jellyfin.">
          <div class="flex items-center gap-2.5 flex-wrap">
            <code class="flex-1 min-w-[180px] field font-sans truncate" :title="showToken ? myToken : undefined">
              {{ showToken ? myToken : maskedToken }}
            </code>
            <button @click="showToken = !showToken" class="btn-icon pointer-fine:h-[38px] pointer-fine:w-[38px]" :aria-label="showToken ? 'Masquer le jeton' : 'Afficher le jeton'" :title="showToken ? 'Masquer' : 'Afficher'">
              <EyeOff v-if="showToken" :size="15" />
              <Eye v-else :size="15" />
            </button>
            <button @click="copyToken" class="btn-secondary pointer-fine:h-[38px]">
              <Check v-if="tokenCopied" :size="15" class="text-ok" />
              <Copy v-else :size="15" />
              {{ tokenCopied ? 'Copié' : 'Copier' }}
            </button>
            <button @click="regenerateToken" class="btn-secondary pointer-fine:h-[38px]">
              <RefreshCw :size="15" /> Régénérer
            </button>
          </div>
          <p class="text-xs text-muted">
            Régénérer le jeton déconnecte immédiatement les applications qui utilisent l'ancien.
            Authentification par l'en-tête <code class="px-1.5 py-0.5 rounded bg-main text-secondary">Authorization: Bearer &lt;jeton&gt;</code>.
          </p>
        </SettingsSection>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Check, Copy, Eye, EyeOff, RefreshCw } from 'lucide-vue-next'
import { useAuthStore }          from '@/stores/auth'
import { copyToClipboard }       from '@/composables/useClipboard'
import { formatRelative }        from '@/utils/format'
import ThemePicker               from '@/components/settings/ThemePicker.vue'
import SettingsSection           from '@/components/settings/SettingsSection.vue'

const auth = useAuthStore()

const me = ref<{ createdAt?: string; lastLoginAt?: string | null; hasPassword?: boolean } | null>(null)

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ── Mot de passe ──
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
    pwdError.value = 'Le mot de passe doit contenir au moins 6 caractères.'; return
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
    pwdError.value = data.error ?? 'Impossible de changer le mot de passe.'
  }
  changingPwd.value = false
}

// ── Jeton d'API ──
const myToken     = ref('')
const showToken   = ref(false)
const tokenCopied = ref(false)

const maskedToken = computed(() => myToken.value
  ? `${myToken.value.slice(0, 4)}${'•'.repeat(24)}${myToken.value.slice(-4)}`
  : '•'.repeat(32))

async function loadMe() {
  const res = await fetch('/api/auth/me', { credentials: 'include' })
  if (res.ok) {
    const d = await res.json()
    myToken.value = d.apiToken ?? ''
    me.value = { createdAt: d.createdAt, lastLoginAt: d.lastLoginAt, hasPassword: d.hasPassword }
  }
}

onMounted(loadMe)

async function copyToken() {
  try {
    await copyToClipboard(myToken.value)
    tokenCopied.value = true
    setTimeout(() => { tokenCopied.value = false }, 2000)
  } catch {}
}

async function regenerateToken() {
  if (!confirm('Régénérer le jeton ? L\'ancien sera immédiatement invalidé.')) return
  const res = await fetch('/api/auth/regenerate-token', {
    method: 'POST', credentials: 'include',
  })
  if (res.ok) {
    const d = await res.json()
    myToken.value = d.apiToken
  }
}
</script>
