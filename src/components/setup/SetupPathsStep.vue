<template>
  <div class="flex flex-col gap-6">

    <div class="card flex flex-col gap-5">
      <div v-for="field in fields" :key="field.key">
        <div class="flex items-center gap-2 mb-1.5">
          <label :for="`setup-${field.key}`" class="field-label">
            {{ field.label }}
            <span v-if="field.required" class="text-err ml-0.5">*</span>
          </label>
          <span v-if="!field.required" class="pill pill-neutral h-5 px-2 text-[10.5px]">recommandé</span>
        </div>
        <div class="flex gap-2">
          <input
              :id="`setup-${field.key}`"
              v-model.trim="form[field.key]"
              :placeholder="field.placeholder"
              class="field"
              spellcheck="false"
          />
          <button @click="openPicker(field.key)" class="btn-secondary shrink-0" :title="`Parcourir — ${field.label}`">
            <FolderOpen :size="14" /> <span class="hidden sm:inline">Parcourir</span>
          </button>
        </div>

        <p v-if="checking && form[field.key]" class="text-meta text-muted mt-1.5">Vérification…</p>
        <p v-else-if="statusOf(field.key)?.error" class="text-meta text-err mt-1.5 flex items-center gap-1.5">
          <X :size="12" class="shrink-0" /> {{ statusOf(field.key)?.error }}
        </p>
        <p v-else-if="statusOf(field.key)?.writable" class="text-meta text-ok mt-1.5 flex items-center gap-1.5">
          <Check :size="12" class="shrink-0" /> Dossier accessible en écriture
        </p>
        <p v-else class="text-meta text-muted mt-1.5">{{ field.help }}</p>
      </div>

      <p v-if="result?.relation === 'same'" class="text-meta text-err flex items-start gap-1.5">
        <X :size="12" class="shrink-0 mt-0.5" /> La médiathèque doit être distincte du dossier de téléchargements.
      </p>
      <p v-else-if="result?.relation === 'nested'" class="text-meta text-accent flex items-start gap-1.5">
        <TriangleAlert :size="12" class="shrink-0 mt-0.5" />
        Un dossier est à l'intérieur de l'autre : ça fonctionne, mais le scan de la médiathèque verra aussi les téléchargements.
      </p>
    </div>

    <!-- Mode d'import -->
    <div class="card flex flex-col gap-3">
      <label class="field-label">Mode d'import</label>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button
            v-for="mode in modes"
            :key="mode.id"
            @click="form.organizeMode = mode.id"
            :aria-pressed="form.organizeMode === mode.id"
            class="flex flex-col justify-start px-3.5 py-3 rounded-field border text-left transition-colors"
            :class="form.organizeMode === mode.id ? 'border-accent/50 bg-accent-muted' : 'border-border-light hover:bg-hover'"
        >
          <p class="text-sm font-medium" :class="form.organizeMode === mode.id ? 'text-accent' : 'text-primary'">
            {{ mode.label }}
            <span v-if="mode.id === 'hardlink'" class="text-meta font-normal text-muted ml-1">recommandé</span>
          </p>
          <p class="text-meta text-muted mt-1 leading-relaxed">{{ mode.text }}</p>
        </button>
      </div>

      <!-- Résultat du test hardlink -->
      <div v-if="result && form.organizeMode === 'hardlink'" class="text-meta">
        <p v-if="result.hardlink.tested && result.hardlink.ok" class="text-ok flex items-center gap-1.5">
          <Check :size="12" class="shrink-0" /> {{ result.hardlink.message }}
        </p>
        <div v-else-if="result.hardlink.tested" class="flex flex-col gap-2 px-3 py-2.5 rounded-field border border-accent/30 bg-accent/5">
          <p class="text-accent flex items-start gap-1.5">
            <TriangleAlert :size="12" class="shrink-0 mt-0.5" /> {{ result.hardlink.message }}
          </p>
          <p class="text-muted">Sans hardlink, FanKarr copiera les fichiers (espace disque doublé).</p>
          <button @click="form.organizeMode = 'copy'" class="btn-secondary btn-sm self-start">Passer en mode Copier</button>
        </div>
        <p v-else class="text-muted">{{ result.hardlink.message }}</p>
      </div>
    </div>

    <p v-if="error" class="text-body text-err" role="alert">{{ error }}</p>

  </div>

  <FolderPicker
      v-if="picker.open"
      :initial-path="picker.initialPath"
      @select="onPickerSelect"
      @cancel="picker.open = false"
  />
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
import { Check, FolderOpen, TriangleAlert, X } from 'lucide-vue-next'
import FolderPicker from '@/components/FolderPicker.vue'
import { checkPaths, postSettings, type PathsCheckResult, type SetupSettings } from './setup'

type PathKey = 'completePath' | 'mediaPath'

const props = defineProps<{ settings: SetupSettings; isDocker: boolean; defaultPath: string }>()

const fields: { key: PathKey; label: string; required: boolean; placeholder: string; help: string }[] = [
  {
    key: 'completePath', label: 'Dossier des téléchargements terminés', required: false,
    placeholder: props.isDocker ? '/data/downloads' : 'D:/Torrents/complete',
    help: 'Là où votre client torrent dépose les fichiers terminés. Sert aussi à tester les hardlinks.',
  },
  {
    key: 'mediaPath', label: 'Médiathèque Fankai', required: true,
    placeholder: props.isDocker ? '/data/medias/kai' : 'D:/Medias/Fankai',
    help: 'Dossier racine où FanKarr range les séries, à ajouter ensuite dans Jellyfin ou Plex.',
  },
]

const modes = [
  { id: 'hardlink' as const, label: 'Hardlink', text: 'Aucune copie : le fichier reste en partage dans le client torrent.' },
  { id: 'copy'     as const, label: 'Copier',   text: 'Duplique le fichier. Fonctionne partout, prend deux fois la place.' },
  { id: 'move'     as const, label: 'Déplacer', text: 'Retire le fichier du client : le partage s\'arrête.' },
]

const form = reactive({
  completePath: props.settings.completePath,
  mediaPath   : props.settings.mediaPath,
  organizeMode: props.settings.organizeMode,
})

const result   = ref<PathsCheckResult | null>(null)
const checking = ref(false)
const error    = ref<string | null>(null)
const picker   = ref<{ open: boolean; field: PathKey; initialPath: string }>({ open: false, field: 'mediaPath', initialPath: '/' })

let timer: ReturnType<typeof setTimeout> | undefined
let requestId = 0

function statusOf(key: PathKey) {
  if (!form[key] || !result.value) return null
  return key === 'mediaPath' ? result.value.mediaPath : result.value.completePath
}

async function runCheck() {
  const id = ++requestId
  if (!form.mediaPath && !form.completePath) { result.value = null; return result.value }
  checking.value = true
  const res = await checkPaths(form.mediaPath, form.completePath)
  if (id === requestId) {
    result.value   = res
    checking.value = false
  }
  return res
}

watch(() => [form.mediaPath, form.completePath], () => {
  error.value = null
  clearTimeout(timer)
  timer = setTimeout(runCheck, 400)
})

function openPicker(field: PathKey) {
  picker.value = { open: true, field, initialPath: form[field] || props.defaultPath }
}

function onPickerSelect(path: string) {
  form[picker.value.field] = path
  picker.value.open = false
}

async function submit(): Promise<boolean> {
  error.value = null
  if (!form.mediaPath) { error.value = 'Choisissez le dossier de la médiathèque pour continuer.'; return false }

  clearTimeout(timer)
  const res = await runCheck()
  if (!res)    { error.value = 'Impossible de vérifier les dossiers.'; return false }
  if (!res.ok) { error.value = 'Corrigez les dossiers signalés avant de continuer.'; return false }

  if (!(await postSettings({ ...form, mediaPath: res.mediaPath.resolved, completePath: res.completePath?.resolved ?? '' }))) {
    error.value = "Erreur lors de l'enregistrement."
    return false
  }
  return true
}

onMounted(() => { if (form.mediaPath || form.completePath) runCheck() })

defineExpose({ submit })
</script>
