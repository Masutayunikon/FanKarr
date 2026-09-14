<template>
  <div class="flex flex-col gap-6">

    <div v-if="!loaded" class="flex items-center justify-center py-10">
      <div class="w-4 h-4 border border-border border-t-accent rounded-full animate-spin" />
    </div>

    <template v-else>
      <!-- Clients existants -->
      <div v-if="clients.length > 0" class="flex flex-col gap-2">
        <div v-for="client in clients" :key="client.uuid" class="settings-card flex items-center gap-3">
          <span
              class="w-2 h-2 rounded-full shrink-0"
              :class="health[client.uuid] === true ? 'bg-green-500' : health[client.uuid] === false ? 'bg-red-500' : 'bg-border'"
          />
          <div class="flex-1 min-w-0">
            <p class="text-sm text-primary font-medium truncate">{{ client.name }}</p>
            <p class="text-xs text-muted mt-0.5">
              {{ labelOf(client.type) }}
              <template v-if="health[client.uuid] === false"> · <span class="text-red-400">injoignable</span></template>
              <template v-else-if="health[client.uuid] === true"> · <span class="text-green-400">connecté</span></template>
            </p>
          </div>
          <button @click="edit(client)" class="btn-ghost text-xs">Modifier</button>
        </div>
      </div>

      <!-- Formulaire -->
      <div v-if="formOpen" class="settings-card flex flex-col gap-4">
        <p class="text-sm font-semibold text-primary">{{ editing ? 'Modifier le client' : 'Ajouter un client' }}</p>
        <TorrentClientForm
            :key="formKey"
            :client="editing"
            :definitions="definitions"
            :show-cancel="clients.length > 0"
            @saved="onSaved"
            @cancel="formOpen = false"
        />
      </div>
      <button v-else @click="add" class="btn-secondary self-start flex items-center gap-1.5">
        <Plus :size="14" /> {{ clients.length > 0 ? 'Ajouter un autre client' : 'Ajouter un client' }}
      </button>

      <!-- Rappel chemins -->
      <div class="flex items-start gap-3 px-4 py-3 rounded-lg border border-border bg-card/50">
        <Info :size="15" class="text-muted mt-0.5 shrink-0" />
        <p class="text-xs text-muted leading-relaxed">
          Le client doit enregistrer ses téléchargements dans un dossier que FanKarr voit
          <template v-if="settings.completePath">(<code class="font-mono text-secondary">{{ settings.completePath }}</code>)</template>.
          S'il tourne sur une autre machine ou dans un autre conteneur, renseignez
          <span class="text-secondary">Chemin distant</span> et <span class="text-secondary">Chemin local</span>
          dans les paramètres avancés du client.
        </p>
      </div>

      <div v-if="warnSkip" class="flex items-start gap-3 px-4 py-3 rounded-lg border border-yellow-500/40 bg-yellow-500/5" role="alert">
        <TriangleAlert :size="15" class="text-yellow-500 mt-0.5 shrink-0" />
        <div class="flex flex-col gap-0.5">
          <p class="text-sm text-yellow-500 font-medium">Aucun client configuré</p>
          <p class="text-xs text-muted">
            Sans client, FanKarr ne pourra rien télécharger. Cliquez à nouveau sur « Suivant » pour continuer quand même,
            vous pourrez l'ajouter plus tard dans Paramètres → Clients de téléchargement.
          </p>
        </div>
      </div>
    </template>

  </div>
</template>

<script setup lang="ts">
import { ref, inject, onMounted } from 'vue'
import { Info, Plus, TriangleAlert } from 'lucide-vue-next'
import TorrentClientForm from '@/components/settings/TorrentClientForm.vue'
import { setupContextKey, type SetupSettings } from './setup'
import type { SavedTorrentClient, TorrentClientDefinition } from '@/types/torrent-client'

defineProps<{ settings: SetupSettings; isDocker: boolean; defaultPath: string }>()

const context = inject(setupContextKey)!

const loaded      = ref(false)
const clients     = ref<SavedTorrentClient[]>([])
const definitions = ref<TorrentClientDefinition[]>([])
const health      = ref<Record<string, boolean | null>>({})
const formOpen    = ref(false)
const formKey     = ref(0)
const editing     = ref<SavedTorrentClient | null>(null)
const warnSkip    = ref(false)

function labelOf(type: string) {
  return definitions.value.find(d => d.id === type)?.label ?? type
}

async function refreshHealth(uuid: string) {
  health.value[uuid] = null
  try {
    const res = await fetch(`/api/torrent-clients/${uuid}/healthcheck`, { credentials: 'include' })
    health.value[uuid] = res.ok ? (await res.json()).online : false
  } catch {
    health.value[uuid] = false
  }
}

function add() {
  editing.value  = null
  formKey.value++
  formOpen.value = true
}

function edit(client: SavedTorrentClient) {
  editing.value  = client
  formKey.value++
  formOpen.value = true
}

function onSaved(client: SavedTorrentClient, isEdit: boolean) {
  if (isEdit) {
    const i = clients.value.findIndex(c => c.uuid === client.uuid)
    if (i !== -1) clients.value[i] = client
  } else {
    clients.value.push(client)
  }
  formOpen.value        = false
  warnSkip.value        = false
  context.clientSkipped = false
  refreshHealth(client.uuid)
}

async function submit(): Promise<boolean> {
  if (clients.value.length > 0) {
    context.clientSkipped = false
    return true
  }
  if (!warnSkip.value) {
    warnSkip.value = true
    return false
  }
  context.clientSkipped = true
  return true
}

onMounted(async () => {
  const [clientsRes, defsRes] = await Promise.all([
    fetch('/api/torrent-clients',           { credentials: 'include' }),
    fetch('/api/torrent-clients/available', { credentials: 'include' }),
  ])
  if (clientsRes.ok) clients.value     = await clientsRes.json()
  if (defsRes.ok)    definitions.value = await defsRes.json()
  for (const c of clients.value) refreshHealth(c.uuid)
  formOpen.value = clients.value.length === 0
  loaded.value   = true
})

defineExpose({ submit })
</script>
