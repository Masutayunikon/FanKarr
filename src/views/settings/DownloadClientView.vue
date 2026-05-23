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
          <button @click="editClient(client)" class="btn-ghost text-xs text-blue-400 hover:text-blue-300">Modifier</button>
          <button @click="deleteClient(client.uuid)" class="btn-ghost text-xs text-red-400 hover:text-red-300">Supprimer</button>
        </div>
      </div>
    </div>

    <!-- Tableau comparatif -->
    <div>
      <h3 class="text-sm font-semibold text-primary mb-1">Comparatif des clients</h3>
      <p class="text-xs text-muted mb-3">Fonctionnalités supportées par chaque client.</p>
      <div class="overflow-x-auto rounded-xl border border-border">
        <table class="w-full text-xs">
          <thead>
            <tr class="border-b border-border bg-shell">
              <th class="text-left px-4 py-2.5 text-muted font-medium whitespace-nowrap">Client</th>
              <th class="text-center px-3 py-2.5 text-muted font-medium whitespace-nowrap">Auth</th>
              <th class="text-center px-3 py-2.5 text-muted font-medium whitespace-nowrap">Sél. fichier</th>
              <th class="text-center px-3 py-2.5 text-muted font-medium whitespace-nowrap">Prog. fichier</th>
              <th class="text-center px-3 py-2.5 text-muted font-medium whitespace-nowrap">Upload .torrent</th>
              <th class="text-center px-3 py-2.5 text-muted font-medium whitespace-nowrap">Catégories</th>
              <th class="text-center px-3 py-2.5 text-muted font-medium whitespace-nowrap">Suppr. fichiers</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border/60">
            <tr v-for="row in clientMatrix" :key="row.id" class="hover:bg-hover/40 transition-colors">
              <!-- Client + version -->
              <td class="px-4 py-2.5">
                <div class="flex items-center gap-2">
                  <span class="w-1.5 h-1.5 rounded-full shrink-0"
                        :class="healthStatus[clients.find(c => c.type === row.id)?.uuid ?? ''] === true  ? 'bg-green-500' :
                                healthStatus[clients.find(c => c.type === row.id)?.uuid ?? ''] === false ? 'bg-red-500'   : 'bg-transparent'" />
                  <div>
                    <p class="text-primary font-medium">{{ row.label }}</p>
                    <p class="text-[10px] text-muted mt-0.5">{{ row.version }}</p>
                  </div>
                </div>
              </td>
              <!-- Auth -->
              <td class="text-center px-3 py-2.5 text-secondary whitespace-nowrap">{{ row.auth }}</td>
              <!-- Sélection fichier -->
              <td class="text-center px-3 py-2.5">
                <span :class="row.fileSelect ? 'text-yellow-400' : 'text-muted'">
                  {{ row.fileSelect ? 'Async ✓' : '✗' }}
                </span>
              </td>
              <!-- Progression par fichier -->
              <td class="text-center px-3 py-2.5" :class="row.fileProgress ? 'text-green-400' : 'text-muted'">
                {{ row.fileProgress ? '✓' : '✗' }}
              </td>
              <!-- Upload .torrent (FanKarr proxy) -->
              <td class="text-center px-3 py-2.5">
                <span :class="row.torrentUpload === 'proxy' ? 'text-green-400' : row.torrentUpload === 'url' ? 'text-secondary' : 'text-muted'">
                  {{ row.torrentUpload === 'proxy' ? '✓ Proxy' : row.torrentUpload === 'url' ? 'URL' : '✗' }}
                </span>
              </td>
              <!-- Catégories -->
              <td class="text-center px-3 py-2.5" :class="row.categories ? 'text-green-400' : 'text-muted'">
                {{ row.categories ? '✓' : '✗' }}
              </td>
              <!-- Suppression fichiers -->
              <td class="text-center px-3 py-2.5" :class="row.deleteFiles ? 'text-green-400' : 'text-muted'">
                {{ row.deleteFiles ? '✓' : '✗' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-muted">
        <span><span class="text-yellow-400">Async ✓</span> — sélection dès réception des métadonnées, aucun octet superflu téléchargé</span>
        <span><span class="text-green-400">✓ Proxy</span> — FanKarr télécharge le .torrent et l'envoie au client (liens protégés supportés)</span>
        <span><span class="text-secondary">URL</span> — le client télécharge le .torrent directement depuis l'URL</span>
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
            <h3 class="text-sm font-semibold text-primary">{{ modal.uuid ? 'Modifier un client' : 'Ajouter un client' }}</h3>
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

            <!-- Champs principaux -->
            <template v-if="currentDefinition">
              <div v-for="field in basicFields" :key="field.key">
                <label class="settings-label">
                  {{ field.label }}
                  <span v-if="field.required" class="text-red-400 ml-0.5">*</span>
                </label>
                <input
                    v-model="modal.config[field.key]"
                    :type="field.type === 'password' ? 'password' : 'text'"
                    :placeholder="field.placeholder ?? ''"
                    class="settings-input"
                />
              </div>

              <!-- Paramètres avancés -->
              <div v-if="advancedFields.length > 0">
                <button
                    type="button"
                    @click="advancedOpen = !advancedOpen"
                    class="flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors w-full py-1"
                >
                  <ChevronDown
                      :size="13"
                      class="transition-transform duration-200 shrink-0"
                      :class="advancedOpen ? 'rotate-180' : ''"
                  />
                  Paramètres avancés
                </button>

                <div v-if="advancedOpen" class="flex flex-col gap-3 mt-2 pl-3 border-l border-border">
                  <div v-for="field in advancedFields" :key="field.key">
                    <label class="settings-label flex items-center gap-1.5">
                      {{ field.label }}
                      <span
                          class="inline-flex items-center justify-center w-4 h-4 rounded-full border border-border text-[10px] text-muted cursor-default leading-none shrink-0 relative group"
                          tabindex="-1"
                      >
                        i
                        <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-56 text-[11px] text-secondary bg-card border border-border rounded-lg px-2.5 py-1.5 shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10 leading-relaxed">
                          {{ fieldTooltip(field.key) }}
                        </span>
                      </span>
                    </label>
                    <input
                        v-model="modal.config[field.key]"
                        :type="field.type === 'password' ? 'password' : 'text'"
                        placeholder=""
                        class="settings-input"
                    />
                  </div>
                </div>
              </div>
            </template>
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
import { ref, computed, watch, onMounted } from 'vue'
import { ChevronDown } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'

const { add: toast } = useToast()

const clients          = ref<any[]>([])
const availableClients = ref<any[]>([])
const healthStatus     = ref<Record<string, boolean | null>>({})

const clientMatrix = [
  {
    id: 'qbittorrent',  label: 'qBittorrent',              version: '4.1+',
    auth: 'Login / MdP · Clé API (5.2+)', fileSelect: true,  fileProgress: true,  torrentUpload: 'proxy', categories: true,  deleteFiles: true,
  },
  {
    id: 'transmission', label: 'Transmission',             version: '3.x / 4.x',
    auth: 'Login / MdP',     fileSelect: true,  fileProgress: true,  torrentUpload: 'url',   categories: true,  deleteFiles: true,
  },
  {
    id: 'rtorrent',     label: 'rTorrent / ruTorrent',     version: '0.9+',
    auth: 'URL xmlrpc',      fileSelect: true,  fileProgress: true,  torrentUpload: 'url',   categories: true,  deleteFiles: true,
  },
  {
    id: 'utorrent',     label: 'uTorrent',                 version: '3.x',
    auth: 'Login / MdP',     fileSelect: true,  fileProgress: false, torrentUpload: 'url',   categories: true,  deleteFiles: true,
  },
  {
    id: 'synology-ds',  label: 'Synology Download Station', version: '6.x+',
    auth: 'Login / MdP',     fileSelect: false, fileProgress: false, torrentUpload: 'url',   categories: false, deleteFiles: true,
  },
  {
    id: 'real-debrid',  label: 'Real-Debrid',              version: 'API v1',
    auth: 'Clé API',          fileSelect: true,  fileProgress: true,  torrentUpload: 'proxy', categories: false, deleteFiles: true,
  },
  {
    id: 'alldebrid',    label: 'AllDebrid',                version: 'API v4',
    auth: 'Clé API',          fileSelect: false, fileProgress: true,  torrentUpload: 'proxy', categories: false, deleteFiles: true,
  },
]

const modal = ref({
  open   : false,
  uuid   : null as string | null,
  name   : '',
  type   : '',
  config : {} as Record<string, string>,
  testing: false,
  saving : false,
  tested : false,
})

const ADVANCED_KEYS = ['savePath', 'remotePath', 'localPath']

const FIELD_TOOLTIPS: Record<string, string> = {
  savePath   : 'Optionnel. Permet de placer les téléchargements dans un sous-dossier spécifique à l\'intérieur du dossier déjà configuré dans la gestion des médias.',
  remotePath : 'Si le client tourne sur une autre machine, indiquez ici le chemin qu\'il utilise (ex: /downloads). À associer avec le chemin local ci-dessous.',
  localPath  : 'Chemin équivalent au chemin distant, mais vu par FanKarr sur sa machine (ex: /mnt/nas/downloads). Les deux champs fonctionnent en binôme pour faire la correspondance.',
}

function fieldTooltip(key: string): string {
  return FIELD_TOOLTIPS[key] ?? ''
}

const advancedOpen = ref(false)

const currentDefinition = computed(() =>
    availableClients.value.find(d => d.id === modal.value.type) ?? null
)

const basicFields = computed(() =>
    currentDefinition.value?.fields.filter((f: any) => !ADVANCED_KEYS.includes(f.key)) ?? []
)

const advancedFields = computed(() =>
    currentDefinition.value?.fields.filter((f: any) => ADVANCED_KEYS.includes(f.key)) ?? []
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
  modal.value = { open: true, uuid: null, name: '', type: '', config: {}, testing: false, saving: false, tested: false }
  advancedOpen.value = false
}

function editClient(client: any) {
  modal.value = {
    open   : true,
    uuid   : client.uuid,
    name   : client.name,
    type   : client.type,
    config : JSON.parse(JSON.stringify(client.config)),
    testing: false,
    saving : false,
    tested : true,
  }
}

function closeModal() { modal.value.open = false }

function onTypeChange() {
  modal.value.config = {}
  modal.value.tested = false
  advancedOpen.value = false
  const def = currentDefinition.value
  if (def) {
    for (const field of def.fields) {
      if (field.default !== undefined) modal.value.config[field.key] = String(field.default)
    }
  }
}

// Reset tested dès que l'utilisateur modifie un champ (nom ou config)
// sauf si c'est un mot de passe masqué non touché
watch(() => modal.value.name, () => {
  if (modal.value.uuid) modal.value.tested = false
})

watch(() => modal.value.config, (newConfig) => {
  if (!modal.value.uuid) return
  const driver = currentDefinition.value
  if (!driver) return
  // Si au moins un champ non-password a changé → reset tested
  // Pour les passwords, on reset seulement si la valeur n'est plus le masque
  for (const [key, val] of Object.entries(newConfig)) {
    const field = driver.fields.find(f => f.key === key)
    if (!field) continue
    if (field.type === 'password' && val === '••••••••') continue
    modal.value.tested = false
    return
  }
}, { deep: true })

async function testNewClient() {
  modal.value.testing = true
  modal.value.tested  = false
  try {
    const res = await fetch('/api/torrent-clients/test-config', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ type: modal.value.type, config: modal.value.config, uuid: modal.value.uuid }),
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
    const isEdit = !!modal.value.uuid
    const method = isEdit ? 'PUT' : 'POST'
    const url = isEdit ? `/api/torrent-clients/${modal.value.uuid}` : '/api/torrent-clients'

    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({
        name  : modal.value.name || clientLabel(modal.value.type),
        type  : modal.value.type,
        config: modal.value.config,
      }),
    })
    if (res.ok) {
      const client = await res.json()
      if (isEdit) {
        const index = clients.value.findIndex(c => c.uuid === client.uuid)
        if (index !== -1) clients.value[index] = client
      } else {
        clients.value.push(client)
      }
      refreshHealth(client.uuid)
      closeModal()
      toast(isEdit ? 'Client modifié ✓' : 'Client enregistré ✓', 'success')
    } else {
      const { error } = await res.json()
      toast(error ?? "Erreur lors de l'enregistrement", 'error')
    }
  } finally {
    modal.value.saving = false
  }
}
</script>