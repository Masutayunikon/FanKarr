<template>
  <div class="flex flex-col gap-4">

    <Teleport defer to="#settings-actions">
      <button @click="openAddModal" class="btn-primary pointer-fine:h-[38px]">
        <Plus :size="15" :stroke-width="2.25" /> Ajouter un client
      </button>
    </Teleport>

    <!-- Clients configurés -->
    <section class="bg-card rounded-card">
      <div class="flex flex-col gap-0.5 px-5 pt-4 pb-3.5">
        <h3 class="card-title">Clients configurés</h3>
        <p class="text-meta text-muted">FanKarr envoie tout dans sa catégorie et ne touche qu’à celle-là.</p>
      </div>

      <div v-if="clients.length === 0" class="flex items-center justify-between gap-4 flex-wrap px-5 py-4 border-t border-hover">
        <p class="text-body text-muted">Aucun client configuré.</p>
        <button @click="openAddModal" class="btn-secondary btn-sm">Ajouter un client</button>
      </div>

      <div
          v-for="client in clients"
          :key="client.uuid"
          class="flex items-center gap-4 px-5 py-3.5 border-t border-hover flex-wrap sm:flex-nowrap"
      >
        <div class="flex-1 min-w-0 flex flex-col gap-[3px]">
          <span class="flex items-center gap-2.5 flex-wrap">
            <span class="text-sm font-medium text-primary">{{ client.name }}</span>
            <span
                class="pill h-5 px-[9px] text-[11px]"
                :class="healthStatus[client.uuid] === true ? 'pill-ok' : healthStatus[client.uuid] === false ? 'pill-err' : 'pill-muted'"
            >
              {{ healthStatus[client.uuid] === true ? 'Connecté' : healthStatus[client.uuid] === false ? 'Injoignable' : 'Vérification…' }}
            </span>
          </span>
          <span class="text-meta text-muted truncate">
            {{ clientLabel(client.type) }}<template v-if="client.config?.url"> · {{ client.config.url }}</template>
          </span>
        </div>
        <button @click="testClient(client.uuid)" :disabled="testingClient[client.uuid]" class="btn-secondary btn-sm pointer-fine:h-[34px]">
          {{ testingClient[client.uuid] ? 'Test…' : 'Tester' }}
        </button>
        <div class="relative" @click.stop>
          <button
              @click="clientMenu = clientMenu === client.uuid ? null : client.uuid"
              class="w-[34px] h-[34px] pointer-coarse:w-10 pointer-coarse:h-10 rounded-full border border-border-light text-muted flex items-center justify-center hover:text-primary hover:bg-hover transition-colors"
              :aria-label="`Actions pour ${client.name}`" aria-haspopup="menu" :aria-expanded="clientMenu === client.uuid"
          >
            <Ellipsis :size="15" />
          </button>
          <div v-if="clientMenu === client.uuid" class="menu absolute right-0 top-full mt-1.5 w-44 z-20" role="menu">
            <button role="menuitem" class="menu-item" @click="clientMenu = null; editClient(client)"><Pencil :size="14" /> Modifier</button>
            <button role="menuitem" class="menu-item text-err hover:text-err" @click="clientMenu = null; deleteClient(client)"><Trash2 :size="14" /> Supprimer</button>
          </div>
        </div>
      </div>
    </section>

    <!-- Types pris en charge -->
    <section class="bg-card rounded-card overflow-hidden">
      <div class="flex flex-col gap-0.5 px-5 pt-4 pb-3.5">
        <h3 class="card-title">Types pris en charge</h3>
        <p class="text-meta text-muted">Ce que chaque client sait faire avec FanKarr. Un même serveur peut cumuler plusieurs clients.</p>
      </div>
      <div class="overflow-x-auto border-t border-hover">
        <table class="w-full min-w-[720px] text-meta">
          <thead>
            <tr class="border-b border-hover">
              <th class="text-left px-5 h-[34px] tag-label tracking-[0.12em] font-bold">Client</th>
              <th class="text-left px-3 h-[34px] tag-label tracking-[0.12em] font-bold">Authentification</th>
              <th class="text-center px-3 h-[34px] tag-label tracking-[0.12em] font-bold">Choix du fichier</th>
              <th class="text-center px-3 h-[34px] tag-label tracking-[0.12em] font-bold">Progression par fichier</th>
              <th class="text-center px-3 h-[34px] tag-label tracking-[0.12em] font-bold">Envoi du .torrent</th>
              <th class="text-center px-3 h-[34px] tag-label tracking-[0.12em] font-bold">Catégories</th>
              <th class="text-center px-3 h-[34px] tag-label tracking-[0.12em] font-bold">Suppr. fichiers</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in clientMatrix" :key="row.id" class="border-b border-hover last:border-b-0">
              <td class="px-5 py-2.5">
                <div class="flex items-center gap-2">
                  <span
                      class="w-1.5 h-1.5 rounded-full shrink-0"
                      :class="matrixHealth(row.id) === true ? 'bg-ok' : matrixHealth(row.id) === false ? 'bg-err' : 'bg-transparent'"
                  />
                  <div>
                    <p class="text-body text-primary font-medium">{{ row.label }}</p>
                    <p class="text-xs text-muted">{{ row.version }}</p>
                  </div>
                </div>
              </td>
              <td class="px-3 py-2.5 text-secondary whitespace-nowrap">{{ row.auth }}</td>
              <td class="text-center px-3 py-2.5" :class="row.fileSelect ? 'text-ok' : 'text-muted'">{{ row.fileSelect ? 'Async ✓' : '—' }}</td>
              <td class="text-center px-3 py-2.5" :class="row.fileProgress ? 'text-ok' : 'text-muted'">{{ row.fileProgress ? '✓' : '—' }}</td>
              <td class="text-center px-3 py-2.5" :class="row.torrentUpload === 'proxy' ? 'text-ok' : 'text-secondary'">{{ row.torrentUpload === 'proxy' ? 'Proxy ✓' : row.torrentUpload === 'url' ? 'URL' : '—' }}</td>
              <td class="text-center px-3 py-2.5" :class="row.categories ? 'text-ok' : 'text-muted'">{{ row.categories ? '✓' : '—' }}</td>
              <td class="text-center px-3 py-2.5" :class="row.deleteFiles ? 'text-ok' : 'text-muted'">{{ row.deleteFiles ? '✓' : '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="flex flex-col gap-1 px-5 py-3.5 border-t border-hover text-xs text-muted">
        <span><span class="text-ok">Async ✓</span> — sélection dès réception des métadonnées, aucun octet superflu téléchargé.</span>
        <span><span class="text-ok">Proxy ✓</span> — FanKarr télécharge le .torrent et l'envoie au client (liens protégés pris en charge).</span>
        <span><span class="text-secondary">URL</span> — le client télécharge le .torrent directement depuis l'adresse.</span>
      </div>
    </section>

    <!-- Modale ajout / modification -->
    <Teleport to="body">
      <div v-if="modal.open" class="modal-backdrop" @click.self="closeModal">
        <div class="modal max-w-lg max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="client-modal-title">
          <div class="flex items-center justify-between gap-4">
            <h3 id="client-modal-title" class="font-display text-xl font-bold text-primary">{{ modal.client ? 'Modifier le client' : 'Ajouter un client' }}</h3>
            <button @click="closeModal" class="btn-icon btn-sm border-transparent" aria-label="Fermer"><X :size="16" /></button>
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
import { ref, onMounted, onUnmounted } from 'vue'
import { Ellipsis, Pencil, Plus, Trash2, X } from 'lucide-vue-next'
import TorrentClientForm from '@/components/settings/TorrentClientForm.vue'
import { useToast } from '@/composables/useToast'
import type { TorrentClientDefinition, SavedTorrentClient } from '@/types/torrent-client'

const { add: toast } = useToast()

const clients          = ref<SavedTorrentClient[]>([])
const availableClients = ref<TorrentClientDefinition[]>([])
const healthStatus     = ref<Record<string, boolean | null>>({})
const testingClient    = ref<Record<string, boolean>>({})
const clientMenu       = ref<string | null>(null)

const closeClientMenu = () => { clientMenu.value = null }
onUnmounted(() => document.removeEventListener('click', closeClientMenu))

function matrixHealth(type: string) {
  const client = clients.value.find(c => c.type === type)
  return client ? healthStatus.value[client.uuid] : undefined
}

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
  document.addEventListener('click', closeClientMenu)
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
  testingClient.value[uuid] = true
  try {
    const res = await fetch(`/api/torrent-clients/${uuid}/test`, { method: 'POST', credentials: 'include' })
    const { ok, message } = await res.json()
    toast(ok ? 'Connexion réussie ✓' : (message ?? 'Connexion échouée'), ok ? 'success' : 'error')
    healthStatus.value[uuid] = ok
  } catch {
    toast('Impossible de contacter le serveur', 'error')
  } finally {
    testingClient.value[uuid] = false
  }
}

async function deleteClient(client: SavedTorrentClient) {
  if (!confirm(`Supprimer le client « ${client.name} » ?`)) return
  const uuid = client.uuid
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
