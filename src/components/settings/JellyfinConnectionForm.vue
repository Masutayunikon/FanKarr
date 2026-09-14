<template>
  <div class="flex flex-col gap-4">
    <div class="grid md:grid-cols-2 gap-4">
      <div class="flex flex-col gap-[7px]">
        <label for="jellyfin-url" class="field-label">Adresse du serveur</label>
        <input id="jellyfin-url" v-model="jellyfinUrl" type="url" class="field" placeholder="http://jellyfin:8096" />
        <p class="text-xs text-muted">Adresse joignable depuis FanKarr (réseau local ou Docker).</p>
      </div>
      <div class="flex flex-col gap-[7px]">
        <label for="jellyfin-token" class="field-label">Clé API administrateur</label>
        <input id="jellyfin-token" v-model="jellyfinAdminToken" type="password" class="field" autocomplete="off"
          :placeholder="hasToken ? '•••••••••••••••••••• (configurée)' : 'Tableau de bord → Clés API'" />
        <p class="text-xs text-muted">Dans Jellyfin : Tableau de bord → Clés API → Créer une clé.</p>
      </div>
    </div>

    <div class="flex items-center gap-2.5 flex-wrap">
      <button @click="save" :disabled="saving" class="btn-primary pointer-fine:h-[38px]">
        {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
      </button>
      <button @click="testConnection" :disabled="testing" class="btn-secondary pointer-fine:h-[38px]">
        {{ testing ? 'Test…' : 'Tester la connexion' }}
      </button>
      <span v-if="testResult" class="pill" :class="testResult.ok ? 'pill-ok' : 'pill-err'">
        <Check v-if="testResult.ok" :size="12" :stroke-width="2.5" />
        <TriangleAlert v-else :size="12" :stroke-width="2.25" />
        {{ testResult.ok ? `Connecté · Jellyfin ${testResult.version}` : testResult.error }}
      </span>
      <span v-if="saved" class="text-meta text-ok flex items-center gap-1.5"><Check :size="14" /> Enregistré</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Check, TriangleAlert } from 'lucide-vue-next'

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
