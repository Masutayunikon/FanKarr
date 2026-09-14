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
            <h3 class="text-sm font-semibold text-primary">{{ modal.client ? 'Modifier un client' : 'Ajouter un client' }}</h3>
            <button @click="closeModal" class="text-muted hover:text-primary transition-colors">✕</button>
          </div>

          <TorrentClientForm
              :key="modal.key"
              :client="modal.client"
              :definitions="availableClients"
              @saved="onSaved"
          />

        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import TorrentClientForm from '@/components/settings/TorrentClientForm.vue'
import { useToast } from '@/composables/useToast'
import type { TorrentClientDefinition, SavedTorrentClient } from '@/types/torrent-client'

const { add: toast } = useToast()

const clients          = ref<SavedTorrentClient[]>([])
const availableClients = ref<TorrentClientDefinition[]>([])
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
  }
]

const modal = ref({ open: false, key: 0, client: null as SavedTorrentClient | null })

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
  modal.value = { open: true, key: modal.value.key + 1, client: null }
}

function editClient(client: SavedTorrentClient) {
  modal.value = { open: true, key: modal.value.key + 1, client }
}

function closeModal() { modal.value.open = false }

function onSaved(client: SavedTorrentClient, isEdit: boolean) {
  if (isEdit) {
    const index = clients.value.findIndex(c => c.uuid === client.uuid)
    if (index !== -1) clients.value[index] = client
  } else {
    clients.value.push(client)
  }
  refreshHealth(client.uuid)
  closeModal()
}
</script>
