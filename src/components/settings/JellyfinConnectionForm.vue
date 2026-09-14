<template>
  <div class="settings-card flex flex-col gap-4">
    <div>
      <label class="settings-label mb-1.5">URL du serveur</label>
      <input v-model="jellyfinUrl" type="url" class="settings-input" placeholder="http://jellyfin:8096" />
      <p class="text-xs text-muted mt-1">URL accessible depuis FanKarr (réseau local ou Docker)</p>
    </div>
    <div>
      <label class="settings-label mb-1.5">Token admin Jellyfin</label>
      <input v-model="jellyfinAdminToken" type="password" class="settings-input"
        :placeholder="hasToken ? '••••••••••••••••••••• (configuré)' : 'Tableau de bord → Clés API'" />
      <p class="text-xs text-muted mt-1">
        Dans Jellyfin : Tableau de bord → Clés API → Créer une clé
      </p>
    </div>

    <div class="flex items-center gap-3 flex-wrap">
      <button @click="save" :disabled="saving" class="btn-primary">
        {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
      </button>
      <button @click="testConnection" :disabled="testing" class="btn-secondary">
        {{ testing ? 'Test…' : 'Tester la connexion' }}
      </button>
      <span v-if="testResult" class="text-xs" :class="testResult.ok ? 'text-green-400' : 'text-red-400'">
        {{ testResult.ok ? `Connecté — Jellyfin ${testResult.version}` : testResult.error }}
      </span>
      <span v-if="saved" class="text-xs text-green-400">Enregistré.</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface JellyfinTestResult { ok: boolean; version?: string; error?: string }

const emit = defineEmits<{
  change: [state: { jellyfinUrl: string; hasToken: boolean; test: JellyfinTestResult | null }]
}>()

const jellyfinUrl        = ref('')
const jellyfinAdminToken = ref('')
const hasToken           = ref(false)
const saving             = ref(false)
const saved              = ref(false)
const testing            = ref(false)
const testResult         = ref<JellyfinTestResult | null>(null)

function notify() {
  emit('change', { jellyfinUrl: jellyfinUrl.value, hasToken: hasToken.value, test: testResult.value })
}

onMounted(async () => {
  const res = await fetch('/api/jellyfin/settings', { credentials: 'include' })
  if (res.ok) {
    const d           = await res.json()
    jellyfinUrl.value = d.jellyfinUrl ?? ''
    hasToken.value    = d.hasToken ?? false
    notify()
  }
})

async function save() {
  saving.value = true
  saved.value  = false
  const body: Record<string, string> = { jellyfinUrl: jellyfinUrl.value }
  if (jellyfinAdminToken.value) body.jellyfinAdminToken = jellyfinAdminToken.value
  const res = await fetch('/api/jellyfin/settings', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
    body: JSON.stringify(body),
  })
  if (res.ok) {
    const d = await res.json()
    hasToken.value = d.hasToken
    jellyfinAdminToken.value = ''
    saved.value = true
    setTimeout(() => { saved.value = false }, 2000)
    notify()
    // Le test du serveur n'utilise que les valeurs enregistrées
    if (jellyfinUrl.value && hasToken.value) await testConnection()
  }
  saving.value = false
}

async function testConnection() {
  testing.value    = true
  testResult.value = null
  try {
    const res = await fetch('/api/jellyfin/test', { method: 'POST', credentials: 'include' })
    testResult.value = await res.json()
  } catch {
    testResult.value = { ok: false, error: 'Impossible de contacter le serveur' }
  }
  testing.value = false
  notify()
}
</script>
