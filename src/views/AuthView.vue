<template>
  <div class="relative min-h-screen bg-main flex items-center justify-center px-4 py-10 overflow-hidden">
    <div class="dot-grid [--dot-grid-angle:160deg] [--dot-grid-fade:45%]" />
    <div class="relative w-full max-w-sm">

      <div class="flex items-center justify-center gap-3 mb-8">
        <FankarrLogo class="w-9 h-9" />
        <span class="font-display text-[30px] font-bold text-primary tracking-[0.01em]">FanKarr</span>
      </div>

      <div class="card px-7 py-7 flex flex-col gap-5 shadow-[0_24px_60px_rgb(0_0_0/0.4)]">
        <div class="flex flex-col gap-1">
          <p v-if="isSetup" class="tag-label text-accent">Premier lancement</p>
          <h1 class="font-display text-[26px] font-bold text-primary leading-tight">
            {{ isSetup ? 'Créer le compte administrateur' : 'Connexion' }}
          </h1>
        </div>

        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-[7px]">
            <label for="auth-username" class="field-label">Nom d'utilisateur</label>
            <input id="auth-username" v-model="username" type="text" placeholder="admin" class="field" @keyup.enter="submit" />
          </div>
          <div class="flex flex-col gap-[7px]">
            <label for="auth-password" class="field-label">Mot de passe</label>
            <input id="auth-password" v-model="password" type="password" placeholder="••••••••" class="field" @keyup.enter="submit" />
          </div>
          <div v-if="isSetup">
            <label class="field-label mb-1.5">Confirmer le mot de passe</label>
            <input v-model="confirm" type="password" placeholder="••••••••" class="field" @keyup.enter="submit" />
          </div>

          <p v-if="error" class="text-meta text-err" role="alert">{{ error }}</p>

          <button @click="submit" :disabled="submitting" class="btn-primary w-full h-11 mt-1">
            {{ submitting ? (isSetup ? 'Création…' : 'Connexion…') : isSetup ? 'Créer le compte' : 'Se connecter' }}
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import FankarrLogo from '@/components/FankarrLogo.vue'

const router = useRouter()
const auth   = useAuthStore()

const username   = ref('')
const password   = ref('')
const confirm    = ref('')
const error      = ref<string | null>(null)
const submitting = ref(false)

const isSetup = computed(() => !auth.setup)

async function submit() {
  error.value = null
  if (!username.value || !password.value) { error.value = 'Tous les champs sont requis.'; return }
  if (isSetup.value && password.value.length < 6) { error.value = 'Le mot de passe doit contenir au moins 6 caractères.'; return }
  if (isSetup.value && password.value !== confirm.value) { error.value = 'Les mots de passe ne correspondent pas.'; return }

  submitting.value = true
  const err = isSetup.value
      ? await auth.setupAccount(username.value, password.value)
      : await auth.login(username.value, password.value)
  submitting.value = false

  if (err) { error.value = err; return }
  await router.push('/')
}
</script>