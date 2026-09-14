<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-col gap-3.5">
      <div class="grid sm:grid-cols-2 gap-3.5">
        <div class="flex flex-col gap-[7px]">
          <label for="client-name" class="field-label">Nom</label>
          <input id="client-name" v-model="name" placeholder="Mon client torrent" class="field" />
        </div>
        <div class="flex flex-col gap-[7px]">
          <label for="client-type" class="field-label">Type</label>
          <select id="client-type" v-model="type" @change="onTypeChange" class="field">
            <option value="">Choisir un type…</option>
            <option v-for="def in definitions" :key="def.id" :value="def.id">{{ def.label }}</option>
          </select>
        </div>
      </div>

      <!-- Champs principaux -->
      <template v-if="currentDefinition">
        <div v-for="field in basicFields" :key="field.key">
          <SettingsToggle
              v-if="field.type === 'boolean'"
              :model-value="toBool(config[field.key])"
              :label="field.label"
              :description="fieldTooltip(field.key)"
              @update:model-value="config[field.key] = $event"
          />
          <div v-else class="flex flex-col gap-[7px]">
            <label :for="`client-${field.key}`" class="field-label">
              {{ field.label }}<span v-if="field.required" class="text-err ml-0.5">*</span>
            </label>
            <input
                :id="`client-${field.key}`"
                v-model="config[field.key]"
                :type="field.type === 'password' ? 'password' : 'text'"
                :placeholder="field.placeholder ?? ''"
                class="field"
            />
          </div>
        </div>

        <!-- Paramètres avancés -->
        <div v-if="advancedFields.length > 0">
          <button
              type="button"
              @click="advancedOpen = !advancedOpen"
              class="flex items-center gap-1.5 text-meta text-secondary hover:text-primary transition-colors w-full py-1"
              :aria-expanded="advancedOpen"
          >
            <ChevronDown
                :size="14"
                class="transition-transform duration-200 shrink-0"
                :class="advancedOpen ? 'rotate-180' : ''"
            />
            Paramètres avancés
          </button>

          <div v-if="advancedOpen" class="flex flex-col gap-3.5 mt-2.5 pl-3.5 border-l border-hover">
            <div v-for="field in advancedFields" :key="field.key">
              <SettingsToggle
                  v-if="field.type === 'boolean'"
                  :model-value="toBool(config[field.key])"
                  :label="field.label"
                  :description="fieldTooltip(field.key)"
                  @update:model-value="config[field.key] = $event"
              />
              <div v-else class="flex flex-col gap-[7px]">
                <label :for="`client-${field.key}`" class="field-label">{{ field.label }}</label>
                <input
                    :id="`client-${field.key}`"
                    v-model="config[field.key]"
                    :type="field.type === 'password' ? 'password' : 'text'"
                    :placeholder="field.placeholder ?? ''"
                    class="field"
                />
                <p v-if="fieldTooltip(field.key)" class="text-xs text-muted">{{ fieldTooltip(field.key) }}</p>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <p v-if="!tested && type" class="text-meta text-muted">
      Testez la connexion avant d'enregistrer.
    </p>

    <div class="flex items-center gap-2.5 pt-1 flex-wrap">
      <button @click="save" :disabled="saving || !tested" class="btn-primary">
        {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
      </button>
      <button @click="test" :disabled="testing || !type" class="btn-secondary">
        <Loader v-if="testing" :size="14" class="animate-spin" />
        <Check v-else-if="tested" :size="14" class="text-ok" />
        {{ testing ? 'Test…' : tested ? 'Connexion testée' : 'Tester' }}
      </button>
      <button v-if="showCancel" @click="emit('cancel')" class="btn-ghost ml-auto">Annuler</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Check, ChevronDown, Loader } from 'lucide-vue-next'
import SettingsToggle from '@/components/settings/SettingsToggle.vue'
import { useToast } from '@/composables/useToast'
import type { TorrentClientConfig, TorrentClientDefinition, SavedTorrentClient } from '@/types/torrent-client'

const props = defineProps<{
  definitions : TorrentClientDefinition[]
  client?     : SavedTorrentClient | null
  showCancel? : boolean
}>()

const emit = defineEmits<{
  saved : [client: SavedTorrentClient, isEdit: boolean]
  cancel: []
}>()

const { add: toast } = useToast()

const ADVANCED_KEYS = ['savePath', 'remotePath', 'localPath', 'ignoreCertificateErrors']

const FIELD_TOOLTIPS: Record<string, string> = {
  savePath   : 'Optionnel. Permet de placer les téléchargements dans un sous-dossier spécifique à l\'intérieur du dossier déjà configuré dans la gestion des médias.',
  remotePath : 'Si le client tourne sur une autre machine, indiquez ici le chemin qu\'il utilise (ex: /downloads). À associer avec le chemin local ci-dessous.',
  localPath  : 'Chemin équivalent au chemin distant, mais vu par FanKarr sur sa machine (ex: /mnt/nas/downloads). Les deux champs fonctionnent en binôme pour faire la correspondance.',
  ignoreCertificateErrors: 'Accepte les certificats auto-signés ou invalides en HTTPS. À n\'utiliser que sur un réseau de confiance.',
}

const name         = ref(props.client?.name ?? '')
const type         = ref(props.client?.type ?? '')
const config       = ref<TorrentClientConfig>(props.client ? JSON.parse(JSON.stringify(props.client.config)) : {})
const tested       = ref(!!props.client)
const testing      = ref(false)
const saving       = ref(false)
const advancedOpen = ref(false)

function fieldTooltip(key: string): string {
  return FIELD_TOOLTIPS[key] ?? ''
}

function toBool(v: unknown): boolean {
  return v === true || v === 'true'
}

const currentDefinition = computed(() =>
    props.definitions.find(d => d.id === type.value) ?? null
)

const basicFields = computed(() =>
    currentDefinition.value?.fields.filter(f => !ADVANCED_KEYS.includes(f.key)) ?? []
)

const advancedFields = computed(() =>
    currentDefinition.value?.fields.filter(f => ADVANCED_KEYS.includes(f.key)) ?? []
)

function onTypeChange() {
  config.value = {}
  advancedOpen.value = false
  for (const field of currentDefinition.value?.fields ?? []) {
    if (field.default === undefined) continue
    config.value[field.key] = field.type === 'boolean' ? field.default : String(field.default)
  }
}

watch([name, config], () => { tested.value = false }, { deep: true })

async function test() {
  testing.value = true
  tested.value  = false
  try {
    const res = await fetch('/api/torrent-clients/test-config', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ type: type.value, config: config.value, uuid: props.client?.uuid ?? null }),
    })
    const { ok, message } = await res.json()
    tested.value = ok
    toast(ok ? 'Connexion réussie ✓' : (message ?? 'Connexion échouée'), ok ? 'success' : 'error')
  } catch {
    toast('Impossible de contacter le serveur', 'error')
  } finally {
    testing.value = false
  }
}

async function save() {
  if (!tested.value) return
  saving.value = true
  try {
    const isEdit = !!props.client
    const res = await fetch(isEdit ? `/api/torrent-clients/${props.client!.uuid}` : '/api/torrent-clients', {
      method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({
        name  : name.value || currentDefinition.value?.label || type.value,
        type  : type.value,
        config: config.value,
      }),
    })
    if (res.ok) {
      toast(isEdit ? 'Client modifié ✓' : 'Client enregistré ✓', 'success')
      emit('saved', await res.json(), isEdit)
    } else {
      const { error } = await res.json()
      toast(error ?? "Erreur lors de l'enregistrement", 'error')
    }
  } finally {
    saving.value = false
  }
}
</script>
