<template>
  <div class="max-w-2xl mx-auto px-8 py-8">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-8">
      <button
          @click="$router.push('/')"
          class="text-[#5a7a94] text-xs tracking-widest hover:text-[#e8513a] transition-colors cursor-pointer">
        ← CATALOGUE
      </button>
      <h1 class="text-xl font-black text-white font-sans">Paramètres</h1>
    </div>

    <!-- Bannière données manquantes -->
    <div v-if="torrentsStatus.empty" class="border border-[#e8513a]/40 bg-[#e8513a]/5 p-4 mb-6 flex items-center justify-between gap-4">
      <div>
        <div class="text-[10px] text-[#e8513a] tracking-widest mb-1">DONNÉES MANQUANTES</div>
        <p class="text-sm text-[#a0b4c4]">
          {{ torrentsStatus.exists ? 'Le fichier de torrents est vide.' : 'Aucun fichier de torrents trouvé.' }}
          Téléchargez les données pour utiliser Fankarr.
        </p>
      </div>
      <button @click="update" :disabled="updating"
              class="bg-[#e8513a] text-white px-5 py-2.5 text-xs tracking-widest hover:opacity-85 transition-opacity disabled:opacity-50 cursor-pointer whitespace-nowrap">
        {{ updating ? 'TÉLÉCHARGEMENT...' : 'TÉLÉCHARGER' }}
      </button>
    </div>

    <!-- Données torrents -->
    <div class="bg-[#0d1219] border border-[#1e2d3d] p-6 mb-4">
      <div class="text-[10px] text-[#e8513a] tracking-widest mb-1">DONNÉES</div>
      <h2 class="text-sm font-bold text-white mb-1">Torrents Fankai</h2>
      <p class="text-[11px] text-[#5a7a94] mb-5">
        {{ torrentsStatus.empty ? 'Aucune donnée chargée' : `${torrentsStatus.count} torrents chargés` }}
      </p>
      <button @click="update" :disabled="updating"
              class="bg-[#e8513a] text-white px-6 py-2.5 text-xs tracking-widest hover:opacity-85 transition-opacity disabled:opacity-50 cursor-pointer">
        {{ updating ? 'MISE À JOUR...' : 'METTRE À JOUR' }}
      </button>
    </div>

    <!-- Clients torrent -->
    <div class="bg-[#0d1219] border border-[#1e2d3d] p-6 mb-4">
      <div class="text-[10px] text-[#e8513a] tracking-widest mb-1">TÉLÉCHARGEMENT</div>
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-sm font-bold text-white">Clients torrent</h2>
        <button @click="openAddModal"
                class="border border-[#1e2d3d] text-[#5a7a94] px-4 py-1.5 text-xs tracking-widest hover:border-[#e8513a] hover:text-[#e8513a] transition-colors cursor-pointer">
          + AJOUTER
        </button>
      </div>

      <div v-if="clients.length === 0" class="text-[11px] text-[#5a7a94]">
        Aucun client configuré
      </div>
      <div v-else class="flex flex-col gap-2">
        <div v-for="client in clients" :key="client.uuid"
             class="flex items-center justify-between border border-[#1e2d3d] px-4 py-3">
          <div class="flex items-center gap-3">
            <div class="w-2 h-2 rounded-full"
                 :class="healthStatus[client.uuid] === true  ? 'bg-green-500' :
                        healthStatus[client.uuid] === false ? 'bg-red-500'   : 'bg-[#1e2d3d]'"/>
            <div>
              <p class="text-sm text-white font-medium">{{ client.name }}</p>
              <p class="text-[10px] text-[#5a7a94] tracking-widest mt-0.5">{{ clientLabel(client.type) }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button @click="testClient(client.uuid)"
                    class="text-[10px] text-[#5a7a94] tracking-widest hover:text-[#3a8fe8] transition-colors cursor-pointer px-2 py-1">
              TESTER
            </button>
            <button @click="deleteClient(client.uuid)"
                    class="text-[10px] text-[#5a7a94] tracking-widest hover:text-[#e8513a] transition-colors cursor-pointer px-2 py-1">
              SUPPRIMER
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Médias & Organisation -->
    <div class="bg-[#0d1219] border border-[#1e2d3d] p-6 mb-4">
      <div class="text-[10px] text-[#e8513a] tracking-widest mb-1">MÉDIAS</div>
      <h2 class="text-sm font-bold text-white mb-6">Organisation</h2>

      <div class="flex flex-col gap-5">

        <!-- Dossier complétion -->
        <div>
          <div class="flex items-center gap-2 mb-1.5">
            <label class="text-[10px] text-[#5a7a94] tracking-widest">DOSSIER COMPLÉTION</label>
            <span v-if="isDocker" class="text-[9px] tracking-widest text-[#3a8fe8] border border-[#3a8fe8]/40 px-1.5 py-0.5">DOCKER</span>
          </div>
          <button v-if="!isDocker"
                  @click="openPicker('completePath')"
                  class="w-full bg-[#121920] border border-[#1e2d3d] text-sm px-3 py-2.5 text-left text-white hover:border-[#e8513a] transition-colors cursor-pointer font-mono truncate">
            {{ form.completePath || '/downloads/complete' }}
          </button>
          <div v-else
               class="w-full bg-[#121920] border border-[#1e2d3d] text-sm px-3 py-2.5 text-[#5a7a94] opacity-60 font-mono truncate">
            {{ form.completePath || '/downloads/complete' }}
          </div>
          <p class="text-[10px] text-[#5a7a94] mt-1.5">
            <span v-if="isDocker">Défini par le volume Docker — non modifiable ici</span>
            <span v-else>Dossier de complétion de qBittorrent</span>
          </p>
        </div>

        <!-- Dossier Jellyfin -->
        <div>
          <div class="flex items-center gap-2 mb-1.5">
            <label class="text-[10px] text-[#5a7a94] tracking-widest">DOSSIER JELLYFIN</label>
            <span v-if="isDocker" class="text-[9px] tracking-widest text-[#3a8fe8] border border-[#3a8fe8]/40 px-1.5 py-0.5">DOCKER</span>
          </div>
          <button v-if="!isDocker"
                  @click="openPicker('mediaPath')"
                  class="w-full bg-[#121920] border border-[#1e2d3d] text-sm px-3 py-2.5 text-left text-white hover:border-[#e8513a] transition-colors cursor-pointer font-mono truncate">
            {{ form.mediaPath || '/media/Kai' }}
          </button>
          <div v-else
               class="w-full bg-[#121920] border border-[#1e2d3d] text-sm px-3 py-2.5 text-[#5a7a94] opacity-60 font-mono truncate">
            {{ form.mediaPath || '/media/Kai' }}
          </div>
          <p class="text-[10px] text-[#5a7a94] mt-1.5">
            <span v-if="isDocker">Défini par le volume Docker — non modifiable ici</span>
            <span v-else>Dossier racine de la bibliothèque Fankai dans Jellyfin</span>
          </p>
        </div>

        <!-- Mode organisation -->
        <div>
          <label class="text-[10px] text-[#5a7a94] tracking-widest block mb-2">MODE</label>
          <div class="flex gap-2">
            <button @click="form.organizeMode = 'hardlink'"
                    class="px-5 py-2 text-xs tracking-widest border transition-colors cursor-pointer"
                    :class="form.organizeMode === 'hardlink'
                  ? 'border-[#e8513a] text-[#e8513a] bg-[#e8513a]/5'
                  : 'border-[#1e2d3d] text-[#5a7a94] hover:border-[#5a7a94]'">
              HARDLINK
            </button>
            <button @click="form.organizeMode = 'move'"
                    class="px-5 py-2 text-xs tracking-widest border transition-colors cursor-pointer"
                    :class="form.organizeMode === 'move'
                  ? 'border-[#e8513a] text-[#e8513a] bg-[#e8513a]/5'
                  : 'border-[#1e2d3d] text-[#5a7a94] hover:border-[#5a7a94]'">
              MOVE
            </button>
          </div>
          <p class="text-[10px] text-[#5a7a94] mt-1.5">
            <span class="text-white">Hardlink recommandé</span> — le fichier reste dans qBittorrent pour le ratio
          </p>
        </div>

        <!-- Support NFO -->
        <div>
          <label class="text-[10px] text-[#5a7a94] tracking-widest block mb-2">NFO / MÉTADONNÉES</label>
          <div class="flex items-center gap-3">
            <button @click="form.nfoSupport = !form.nfoSupport"
                    class="relative shrink-0 w-11 h-6 rounded-full transition-colors cursor-pointer"
                    :class="form.nfoSupport ? 'bg-[#e8513a]' : 'bg-[#1e2d3d]'">
              <span class="absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-200"
                    :class="form.nfoSupport ? 'translate-x-5' : 'translate-x-0'" />
            </button>
            <span class="text-xs text-[#c8d8e8]">Télécharger les NFO et images depuis GitLab</span>
          </div>
          <p class="text-[10px] text-[#5a7a94] mt-1.5">
            Pour les lecteurs sans agent Fankai (Kodi, Infuse, etc.) — télécharge les métadonnées depuis
            <span class="text-white">fankai_pack</span> au moment de l'organisation
          </p>
        </div>

        <div class="pt-1 flex items-center gap-3">
          <button type="button" @click="save" :disabled="saving"
                  class="bg-[#e8513a] text-white px-6 py-2.5 text-xs tracking-widest hover:opacity-85 transition-opacity disabled:opacity-50 cursor-pointer">
            {{ saving ? '...' : 'SAUVEGARDER' }}
          </button>
          <button type="button" @click="scan" :disabled="scanning"
                  class="border border-[#1e2d3d] text-[#5a7a94] px-6 py-2.5 text-xs tracking-widest hover:border-[#e8513a] hover:text-[#e8513a] transition-colors disabled:opacity-50 cursor-pointer">
            {{ scanning ? 'SCAN...' : 'ANALYSER BIBLIOTHÈQUE' }}
          </button>
          <span v-if="scanResult" class="text-[10px]"
                :class="scanResult.added > 0 ? 'text-green-400' : 'text-[#5a7a94]'">
            {{ scanResult.found }} fichiers · {{ scanResult.added }} ajoutés
          </span>
        </div>
      </div>
    </div>

    <!-- Compte -->
    <div class="bg-[#0d1219] border border-[#1e2d3d] p-6">
      <div class="text-[10px] text-[#e8513a] tracking-widest mb-1">COMPTE</div>
      <h2 class="text-sm font-bold text-white mb-6">Session</h2>
      <button type="button" @click="logout"
              class="border border-[#1e2d3d] text-[#5a7a94] px-6 py-2.5 text-xs tracking-widest hover:border-[#e8513a] hover:text-[#e8513a] transition-colors cursor-pointer">
        SE DÉCONNECTER
      </button>
    </div>

    <!-- Folder Picker -->
    <FolderPicker
        v-if="picker.open"
        :initial-path="picker.currentPath"
        @select="onPickerSelect"
        @cancel="picker.open = false"
    />

    <!-- Modal ajout client -->
    <div v-if="modal.open" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div class="bg-[#0d1219] border border-[#1e2d3d] w-full max-w-md p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-sm font-bold text-white">Ajouter un client</h3>
          <button @click="closeModal" class="text-[#5a7a94] hover:text-white transition-colors cursor-pointer">✕</button>
        </div>

        <div class="mb-4">
          <label class="text-[10px] text-[#5a7a94] tracking-widest block mb-1.5">NOM</label>
          <input v-model="modal.name" placeholder="Mon qBittorrent"
                 class="w-full bg-[#121920] border border-[#1e2d3d] text-white px-3 py-2.5 text-sm outline-none focus:border-[#e8513a] transition-colors"/>
        </div>

        <div class="mb-4">
          <label class="text-[10px] text-[#5a7a94] tracking-widest block mb-1.5">TYPE</label>
          <select v-model="modal.type" @change="onTypeChange"
                  class="w-full bg-[#121920] border border-[#1e2d3d] text-white px-3 py-2.5 text-sm outline-none focus:border-[#e8513a] transition-colors cursor-pointer">
            <option value="">Choisir un type...</option>
            <option v-for="def in availableClients" :key="def.id" :value="def.id">{{ def.label }}</option>
          </select>
        </div>

        <div v-if="currentDefinition" class="flex flex-col gap-3 mb-6">
          <div v-for="field in currentDefinition.fields" :key="field.key">
            <label class="text-[10px] text-[#5a7a94] tracking-widest block mb-1.5">{{ field.label.toUpperCase() }}</label>
            <input
                v-model="modal.config[field.key]"
                :type="field.type === 'password' ? 'password' : 'text'"
                :placeholder="field.placeholder ?? ''"
                class="w-full bg-[#121920] border border-[#1e2d3d] text-white px-3 py-2.5 text-sm outline-none focus:border-[#e8513a] transition-colors"/>
          </div>
        </div>

        <div class="flex gap-3">
          <button @click="saveClient" :disabled="modal.saving || !modal.tested"
                  class="bg-[#e8513a] text-white px-6 py-2.5 text-xs tracking-widest hover:opacity-85 transition-opacity disabled:opacity-50 cursor-pointer">
            {{ modal.saving ? '...' : 'ENREGISTRER' }}
          </button>
          <button @click="testNewClient" :disabled="modal.testing || !modal.type"
                  class="border border-[#1e2d3d] text-[#5a7a94] px-6 py-2.5 text-xs tracking-widest hover:border-[#3a8fe8] hover:text-[#3a8fe8] transition-colors disabled:opacity-50 cursor-pointer">
            {{ modal.testing ? '...' : modal.tested ? 'TESTÉ ✓' : 'TESTER' }}
          </button>
        </div>
        <p v-if="!modal.tested && modal.type" class="text-[10px] text-[#5a7a94] mt-3">
          Testez la connexion avant d'enregistrer
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import FolderPicker from '@/components/FolderPicker.vue'

const router = useRouter()
const auth   = useAuthStore()
const { add: toast } = useToast()

// ── State ──────────────────────────────────────────────────────
const form = ref({
  mediaPath   : '/media/Kai',
  completePath: '/downloads/complete',
  organizeMode: 'hardlink' as 'hardlink' | 'move',
  nfoSupport  : false,
})

const saving    = ref(false)
const updating  = ref(false)
const scanning  = ref(false)
const scanResult = ref<{ found: number; added: number } | null>(null)

// ── Folder picker ──────────────────────────────────────────────
const picker = ref<{ open: boolean; field: 'completePath' | 'mediaPath'; currentPath: string }>({
  open: false, field: 'completePath', currentPath: '/'
})

function openPicker(field: 'completePath' | 'mediaPath') {
  picker.value = {
    open       : true,
    field,
    currentPath: (form.value as any)[field] || '/',
  }
}

function onPickerSelect(path: string) {
  (form.value as any)[picker.value.field] = path
  picker.value.open = false
}
const isDocker  = ref(false)
const torrentsStatus = ref({ exists: false, count: 0, empty: true })

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

// ── Computed ───────────────────────────────────────────────────
const currentDefinition = computed(() =>
    availableClients.value.find(d => d.id === modal.value.type) ?? null
)

function clientLabel(type: string): string {
  return availableClients.value.find(d => d.id === type)?.label ?? type
}

// ── Init ───────────────────────────────────────────────────────
onMounted(async () => {
  const [settingsRes, statusRes, clientsRes, availRes, systemRes] = await Promise.all([
    fetch('/api/settings',                  { credentials: 'include' }),
    fetch('/api/torrents/status',           { credentials: 'include' }),
    fetch('/api/torrent-clients',           { credentials: 'include' }),
    fetch('/api/torrent-clients/available', { credentials: 'include' }),
    fetch('/api/system',                    { credentials: 'include' }),
  ])
  if (settingsRes.ok) Object.assign(form.value, await settingsRes.json())
  if (statusRes.ok)   torrentsStatus.value = await statusRes.json()
  if (clientsRes.ok)  clients.value        = await clientsRes.json()
  if (availRes.ok)    availableClients.value = await availRes.json()
  if (systemRes.ok)   isDocker.value = (await systemRes.json()).isDocker

  for (const c of clients.value) refreshHealth(c.uuid)
})

// ── Healthcheck ────────────────────────────────────────────────
async function refreshHealth(uuid: string) {
  healthStatus.value[uuid] = null
  try {
    const res = await fetch(`/api/torrent-clients/${uuid}/healthcheck`, { credentials: 'include' })
    healthStatus.value[uuid] = res.ok ? (await res.json()).online : false
  } catch {
    healthStatus.value[uuid] = false
  }
}

// ── Test / delete clients ──────────────────────────────────────
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

// ── Modal ──────────────────────────────────────────────────────
function openAddModal() {
  modal.value = { open: true, name: '', type: '', config: {}, testing: false, saving: false, tested: false }
}

function closeModal() {
  modal.value.open = false
}

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
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ type: modal.value.type, config: modal.value.config })
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
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name  : modal.value.name || clientLabel(modal.value.type),
        type  : modal.value.type,
        config: modal.value.config
      })
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

// ── Données torrents ───────────────────────────────────────────
async function update() {
  updating.value = true
  try {
    const res = await fetch('/api/update', { method: 'POST', credentials: 'include' })
    if (res.ok) {
      const { count } = await res.json()
      torrentsStatus.value = { exists: true, count, empty: count === 0 }
      toast(`${count} torrents téléchargés ✓`, 'success')
    } else {
      const { error } = await res.json()
      toast(error ?? 'Erreur lors de la mise à jour', 'error')
    }
  } catch {
    toast('Impossible de contacter le serveur', 'error')
  } finally {
    updating.value = false
  }
}

// ── Scan bibliothèque ──────────────────────────────────────────
async function scan() {
  scanning.value  = true
  scanResult.value = null
  try {
    const res = await fetch('/api/scan', { method: 'POST', credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      scanResult.value = { found: data.found, added: data.added }
      toast(
          data.added > 0
              ? `${data.found} fichiers scannés — ${data.added} ajoutés`
              : `${data.found} fichiers scannés — rien de nouveau`,
          'success'
      )
    } else {
      toast('Erreur lors du scan', 'error')
    }
  } catch {
    toast('Impossible de contacter le serveur', 'error')
  } finally {
    scanning.value = false
  }
}

// ── Sauvegarder settings ───────────────────────────────────────
async function save() {
  saving.value = true
  try {
    const res = await fetch('/api/settings', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(form.value)
    })
    if (res.ok) toast('Configuration sauvegardée', 'success')
    else toast('Erreur lors de la sauvegarde', 'error')
  } finally {
    saving.value = false
  }
}

async function logout() {
  await auth.logout()
  await router.push('/auth')
}
</script>