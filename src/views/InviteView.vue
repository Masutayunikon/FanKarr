<template>
  <div class="relative min-h-screen bg-main flex items-center justify-center px-4 py-10 overflow-hidden">
    <div class="dot-grid [--dot-grid-angle:160deg] [--dot-grid-fade:45%]" />
    <div class="relative w-full max-w-sm">

      <div class="flex items-center justify-center gap-3 mb-8">
        <FankarrLogo class="w-9 h-9" />
        <span class="font-display text-[30px] font-bold text-primary tracking-[0.01em]">FanKarr</span>
      </div>

      <div v-if="status === 'loading'" class="card px-7 py-8 text-center text-body text-muted">
        Vérification du lien…
      </div>

      <div v-else-if="status === 'invalid'" class="card px-7 py-8 flex flex-col items-center gap-3 text-center">
        <span class="w-11 h-11 rounded-full bg-err/10 text-err flex items-center justify-center"><TriangleAlert :size="20" /></span>
        <p class="font-display text-xl font-bold text-primary">Lien invalide</p>
        <p class="text-body text-muted">{{ invalidReason }}</p>
      </div>

      <div v-else-if="status === 'done'" class="card px-7 py-8 flex flex-col items-center gap-3 text-center">
        <span class="w-11 h-11 rounded-full bg-ok/10 text-ok flex items-center justify-center"><Check :size="20" :stroke-width="2.5" /></span>
        <p class="font-display text-xl font-bold text-primary">Compte créé</p>
        <p class="text-body text-muted">Vous pouvez maintenant vous connecter.</p>
        <RouterLink to="/auth" class="btn-primary w-full h-11 mt-1">Se connecter</RouterLink>
      </div>

      <div v-else class="card px-7 py-7 flex flex-col gap-5 shadow-[0_24px_60px_rgb(0_0_0/0.4)]">
        <div class="flex flex-col gap-1">
          <p class="tag-label text-accent">Invitation FanKarr</p>
          <h1 class="font-display text-[26px] font-bold text-primary leading-tight">Créer un compte</h1>
          <p v-if="note" class="text-meta text-muted">{{ note }}</p>
        </div>

        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-[7px]">
            <label for="invite-username" class="field-label">Nom d'utilisateur</label>
            <input id="invite-username" v-model="username" type="text" class="field" @keyup.enter="submit" />
          </div>
          <div class="flex flex-col gap-[7px]">
            <label for="invite-password" class="field-label">Mot de passe</label>
            <input id="invite-password" v-model="password" type="password" placeholder="••••••••" class="field" @keyup.enter="submit" />
          </div>
          <div class="flex flex-col gap-[7px]">
            <label for="invite-confirm" class="field-label">Confirmer le mot de passe</label>
            <input id="invite-confirm" v-model="confirm" type="password" placeholder="••••••••" class="field" @keyup.enter="submit" />
          </div>

          <p v-if="error" class="text-meta text-err" role="alert">{{ error }}</p>

          <button @click="submit" :disabled="submitting" class="btn-primary w-full h-11 mt-1">
            {{ submitting ? 'Création…' : 'Créer le compte' }}
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { Check, TriangleAlert } from 'lucide-vue-next'
import FankarrLogo from '@/components/FankarrLogo.vue'

const route = useRoute()
const code  = route.params.code as string

type Status = 'loading' | 'ready' | 'invalid' | 'done'

const status        = ref<Status>('loading')
const invalidReason = ref('')
const note          = ref<string | null>(null)

const username   = ref('')
const password   = ref('')
const confirm    = ref('')
const error      = ref<string | null>(null)
const submitting = ref(false)

onMounted(async () => {
  const res  = await fetch(`/api/invites/${code}/info`)
  const data = await res.json()
  if (!res.ok || !data.valid) {
    invalidReason.value = data.reason ?? "Ce lien d'invitation n'est pas valide. Demandez-en un nouveau à l'administrateur."
    status.value = 'invalid'
    return
  }
  note.value   = data.note
  status.value = 'ready'
})

async function submit() {
  error.value = null
  if (!username.value || !password.value || !confirm.value) {
    error.value = 'Tous les champs sont requis.'; return
  }
  if (password.value !== confirm.value) {
    error.value = 'Les mots de passe ne correspondent pas.'; return
  }

  submitting.value = true
  const res  = await fetch(`/api/invites/${code}/register`, {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify({ username: username.value, password: password.value }),
  })
  const data = await res.json().catch(() => ({}))
  submitting.value = false

  if (!res.ok) { error.value = data.error ?? 'Impossible de créer le compte.'; return }
  status.value = 'done'
}
</script>
