<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="emit('close')">
      <div class="modal max-w-md" role="dialog" aria-modal="true" aria-labelledby="jellyfin-import-title">
        <div class="flex flex-col gap-1">
          <h3 id="jellyfin-import-title" class="card-title">Importer des utilisateurs Jellyfin</h3>
          <p class="text-meta text-muted">Chaque utilisateur importé reçoit un compte invité et se connecte avec ses identifiants Jellyfin.</p>
        </div>

        <p v-if="loading" class="text-body text-muted">Chargement…</p>
        <p v-else-if="loadError" class="text-meta text-err">{{ loadError }}</p>
        <div v-else class="flex flex-col gap-2">
          <label v-if="importable.length > 1" class="flex items-center gap-3 min-h-9 cursor-pointer select-none">
            <input type="checkbox" :checked="allSelected" @change="toggleAll" class="w-4 h-4 rounded" />
            <span class="text-body text-secondary">Tout sélectionner</span>
          </label>
          <div class="flex flex-col max-h-[50vh] overflow-y-auto">
            <label
                v-for="u in users" :key="u.id"
                class="flex items-center gap-3 min-h-10 select-none"
                :class="isImportable(u) ? 'cursor-pointer' : 'opacity-60'"
                :title="statusTitle(u)"
            >
              <input type="checkbox" :value="u.id" v-model="selected" :disabled="!isImportable(u)" class="w-4 h-4 rounded" />
              <span class="flex-1 min-w-0 truncate text-body text-primary">{{ u.name }}</span>
              <span v-if="STATUS_LABELS[u.status]" class="pill h-[22px] px-2 text-[10.5px] shrink-0" :class="u.status === 'imported' ? 'pill-ok' : u.status === 'match' ? 'pill-wait' : 'pill-muted'">
                {{ STATUS_LABELS[u.status] }}
              </span>
            </label>
            <p v-if="users.length === 0" class="text-body text-muted">Aucun utilisateur sur ce serveur Jellyfin.</p>
          </div>
        </div>

        <p v-if="error" class="text-meta text-err">{{ error }}</p>

        <div class="flex gap-2.5 justify-end">
          <button @click="emit('close')" class="btn-ghost">Annuler</button>
          <button @click="submit" :disabled="submitting || selected.length === 0" class="btn-primary">
            {{ submitting ? 'Import…' : selected.length > 0 ? `Importer ${plural(selected.length, 'compte')}` : 'Importer' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from '@/composables/useToast'
import { plural } from '@/utils/format'

type Status = 'imported' | 'match' | 'new' | 'disabled' | 'conflict'

interface JellyfinAccount {
  id             : string
  name           : string
  status         : Status
  fankarrUsername: string | null
}

const STATUS_LABELS: Record<Status, string> = {
  imported: 'Importé',
  match   : 'Compte existant',
  new     : '',
  disabled: 'Désactivé dans Jellyfin',
  conflict: 'Nom déjà pris',
}

const emit = defineEmits<{ close: []; imported: [] }>()

const toast      = useToast()
const users      = ref<JellyfinAccount[]>([])
const selected   = ref<string[]>([])
const loading    = ref(true)
const loadError  = ref<string | null>(null)
const submitting = ref(false)
const error      = ref<string | null>(null)

const importable  = computed(() => users.value.filter(isImportable))
const allSelected = computed(() => importable.value.length > 0 && selected.value.length === importable.value.length)

function isImportable(u: JellyfinAccount) {
  return u.status === 'new' || u.status === 'match'
}

function statusTitle(u: JellyfinAccount) {
  if (u.status === 'match')    return `Le compte FanKarr « ${u.fankarrUsername} » sera lié à cet utilisateur Jellyfin.`
  if (u.status === 'conflict') return `Le compte FanKarr « ${u.fankarrUsername} » est déjà lié à un autre utilisateur Jellyfin.`
  if (u.status === 'imported') return `Compte FanKarr : « ${u.fankarrUsername} »`
  return undefined
}

function toggleAll() {
  selected.value = allSelected.value ? [] : importable.value.map(u => u.id)
}

onMounted(async () => {
  try {
    const res  = await fetch('/api/jellyfin/users', { credentials: 'include' })
    const data = await res.json()
    if (res.ok) users.value = data
    else loadError.value = data.error ?? 'Impossible de récupérer les utilisateurs Jellyfin.'
  } catch {
    loadError.value = 'Impossible de contacter le serveur.'
  }
  loading.value = false
})

async function submit() {
  submitting.value = true
  error.value      = null
  try {
    const res  = await fetch('/api/jellyfin/import', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ ids: selected.value }),
    })
    const data = await res.json()
    if (!res.ok) { error.value = data.error ?? 'Impossible d\'importer les utilisateurs.'; return }

    const parts: string[] = []
    if (data.created > 0) parts.push(plural(data.created, 'compte créé', 'comptes créés'))
    if (data.linked  > 0) parts.push(plural(data.linked,  'compte lié',  'comptes liés'))
    toast.add(parts.length > 0 ? parts.join(', ') : 'Aucun compte importé', parts.length > 0 ? 'success' : 'info')
    emit('imported')
    emit('close')
  } catch {
    error.value = 'Impossible de contacter le serveur.'
  } finally {
    submitting.value = false
  }
}
</script>
