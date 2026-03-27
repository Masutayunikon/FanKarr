<template>
  <div class="flex flex-col gap-6">

    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-base font-semibold text-primary">Clients torrent</h2>
        <p class="text-sm text-muted mt-1">Gérez vos clients de téléchargement.</p>
      </div>
      <button @click="openAddModal" class="btn-secondary">+ Ajouter</button>
    </div>

    <!-- Liste vide -->
    <div v-if="clients.length === 0" class="settings-card text-sm text-muted">
      Aucun client configuré.
    </div>

    <!-- Liste clients -->
    <div v-else class="flex flex-col gap-2">
      <div
          v-for="client in clients"
          :key="client.uuid"
          class="settings-card flex items-center justify-between"
      >
        <div class="flex items-center gap-3">
          <span
              class="w-2 h-2 rounded-full shrink-0"
              :class="healthStatus[client.uuid] === true  ? 'bg-green-500' :
                    healthStatus[client.uuid] === false ? 'bg-red-500'   : 'bg-border'"
          />
          <div>
            <p class="text-sm text-primary font-medium">{{ client.name }}</p>
            <p class="text-xs text-muted mt-0.5">{{ clientLabel(client.type) }}</p>
          </div>
        </div>
        <div class="flex items-center gap-1">
          <button @click="testClient(client.uuid)" class="btn-ghost text-xs">Tester</button>
          <button @click="deleteClient(client.uuid)" class="btn-ghost text-xs text-red-400 hover:text-red-300">Supprimer</button>
        </div>
      </div>
    </div>

    <!-- Modal ajout -->
    <Teleport to="body">
      <div
          v-if="modal.open"
          class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4"
          @click.self="closeModal"
      >
        <div class="bg-card border border-border rounded-xl w-full max-w-md p-6 flex flex-col gap-4">

          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-primary">Ajouter un client</h3>
            <button @click="closeModal" class="text-muted hover:text-primary transition-colors">✕</button>
          </div>

          <div class="flex flex-col gap-3">
            <div>
              <label class="settings-label">Nom</label>
              <input v-model="modal.name" placeholder="Mon client torrent" class="settings-input" />
            </div>
            <div>
              <label class="settings-label">Type</label>
              <select v-model="modal.type" @change="onTypeChange" class="settings-input">
                <option value="">Choisir un type...</option>
                <option v-for="def in availableClients" :key="def.id" :value="def.id">{{ def.label }}</option>
              </select>
            </div>
            <div v-if="currentDefinition" v-for="field in currentDefinition.fields" :key="field.key">
              <label class="settings-label">{{ field.label }}</label>
              <input
                  v-model="modal.config[field.key]"
                  :type="field.type === 'password' ? 'password' : 'text'"
                  :placeholder="field.placeholder ?? ''"
                  class="settings-input"
              />
            </div>
          </div>

          <p v-if="!modal.tested && modal.type" class="text-xs text-muted">
            Testez la connexion avant d'enregistrer.
          </p>

          <div class="flex gap-2 pt-1">
            <button
                @click="saveClient"
                :disabled="modal.saving || !modal.tested"
                class="btn-primary"
            >
              {{ modal.saving ? '...' : 'Enregistrer' }}
            </button>
            <button
                @click="testNewClient"
                :disabled="modal.testing || !modal.type"
                class="btn-secondary"
            >
              {{ modal.testing ? '...' : modal.tested ? 'Testé ✓' : 'Tester' }}
            </button>
          </div>

        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from '@/composables/useToast'

const { add: toast } = useToast()

const clients          = ref<any[]>([])
const availableClients = ref<any[]>([])
const healthStatus     = ref<Record<string, boolean | null>>({})

const modal = ref({
  open   : false,
  name   : '',
  type   : '',
  config : {} as Record<string, string>,
  testing: false,
  saving : false,
  tested : false,
})

const currentDefinition = computed(() =>
    availableClients.value.find(d => d.id === modal.value.type) ?? null
)

function clientLabel(type: string) {
  return availableClients.value.find(d => d.id === type)?.label ?? type
}

onMounted(async () => {
  const [clientsRes, availRes] = await Promise.all([
    fetch('/api/torrent-clients',           { credentials: 'include' }),
    fetch('/api/torrent-clients/available', { credentials: 'include' }),
  ])
  if (clientsRes.ok) clients.value        = await clientsRes.json()
  if (availRes.ok)   availableClients.value = await availRes.json()
  for (const c of clients.value) refreshHealth(c.uuid)
})

async function refreshHealth(uuid: string) {
  healthStatus.value[uuid] = null
  try {
    const res = await fetch(`/api/torrent-clients/${uuid}/healthcheck`, { credentials: 'include' })
    healthStatus.value[uuid] = res.ok ? (await res.json()).online : false
  } catch {
    healthStatus.value[uuid] = false
  }
}

async function testClient(uuid: string) {
  const res = await fetch(`/api/torrent-clients/${uuid}/test`, { method: 'POST', credentials: 'include' })
  const { ok, message } = await res.json()
  toast(ok ? 'Connexion réussie ✓' : (message ?? 'Connexion échouée'), ok ? 'success' : 'error')
  healthStatus.value[uuid] = ok
}

async function deleteClient(uuid: string) {
  const res = await fetch(`/api/torrent-clients/${uuid}`, { method: 'DELETE', credentials: 'include' })
  if (res.ok) {
    clients.value = clients.value.filter(c => c.uuid !== uuid)
    delete healthStatus.value[uuid]
    toast('Client supprimé', 'success')
  } else {
    toast('Erreur lors de la suppression', 'error')
  }
}

function openAddModal() {
  modal.value = { open: true, name: '', type: '', config: {}, testing: false, saving: false, tested: false }
}

function closeModal() { modal.value.open = false }

function onTypeChange() {
  modal.value.config = {}
  modal.value.tested = false
  const def = currentDefinition.value
  if (def) {
    for (const field of def.fields) {
      if (field.default !== undefined) modal.value.config[field.key] = String(field.default)
    }
  }
}

async function testNewClient() {
  modal.value.testing = true
  modal.value.tested  = false
  try {
    const res = await fetch('/api/torrent-clients/test-config', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ type: modal.value.type, config: modal.value.config }),
    })
    const { ok, message } = await res.json()
    modal.value.tested = ok
    toast(ok ? 'Connexion réussie ✓' : (message ?? 'Connexion échouée'), ok ? 'success' : 'error')
  } catch {
    toast('Impossible de contacter le serveur', 'error')
  } finally {
    modal.value.testing = false
  }
}

async function saveClient() {
  if (!modal.value.tested) return
  modal.value.saving = true
  try {
    const res = await fetch('/api/torrent-clients', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({
        name  : modal.value.name || clientLabel(modal.value.type),
        type  : modal.value.type,
        config: modal.value.config,
      }),
    })
    if (res.ok) {
      const client = await res.json()
      clients.value.push(client)
      refreshHealth(client.uuid)
      closeModal()
      toast('Client enregistré ✓', 'success')
    } else {
      const { error } = await res.json()
      toast(error ?? "Erreur lors de l'enregistrement", 'error')
    }
  } finally {
    modal.value.saving = false
  }
}
</script>