<template>
  <div class="min-h-screen bg-shell flex items-center justify-center px-4">
    <div class="w-full max-w-sm">

      <!-- Logo -->
      <div class="flex items-center justify-center gap-2.5 mb-8">
        <FankarrLogo class="w-8 h-8" />
        <span class="text-2xl font-bold text-primary tracking-wide">FanKarr</span>
      </div>

      <!-- Card -->
      <div class="settings-card p-8 flex flex-col gap-5">
        <div>
          <p class="text-xs text-accent font-medium mb-1">
            {{ isSetup ? 'Première connexion' : 'Connexion' }}
          </p>
          <h1 class="text-lg font-semibold text-primary">
            {{ isSetup ? 'Créer un compte' : 'Bon retour' }}
          </h1>
        </div>

        <div class="flex flex-col gap-4">
          <div>
            <label class="settings-label mb-1.5">Identifiant</label>
            <input v-model="username" type="text" placeholder="admin" class="settings-input" @keyup.enter="submit" />
          </div>
          <div>
            <label class="settings-label mb-1.5">Mot de passe</label>
            <input v-model="password" type="password" placeholder="••••••••" class="settings-input" @keyup.enter="submit" />
          </div>
          <div v-if="isSetup">
            <label class="settings-label mb-1.5">Confirmer</label>
            <input v-model="confirm" type="password" placeholder="••••••••" class="settings-input" @keyup.enter="submit" />
          </div>

          <p v-if="error" class="text-xs text-red-400">{{ error }}</p>

          <button @click="submit" :disabled="submitting" class="btn-primary w-full py-2.5 mt-1">
            {{ submitting ? '...' : isSetup ? 'Créer le compte' : 'Se connecter' }}
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
  if (!username.value || !password.value) { error.value = 'Tous les champs sont requis'; return }
  if (isSetup.value && password.value.length < 6) { error.value = 'Le mot de passe doit faire au moins 6 caractères'; return }
  if (isSetup.value && password.value !== confirm.value) { error.value = 'Les mots de passe ne correspondent pas'; return }

  submitting.value = true
  const err = isSetup.value
      ? await auth.setupAccount(username.value, password.value)
      : await auth.login(username.value, password.value)
  submitting.value = false

  if (err) { error.value = err; return }
  await router.push('/')
}
</script>