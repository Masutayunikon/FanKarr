<template>
  <div class="flex flex-col gap-6">

    <div>
      <h2 class="text-base font-semibold text-primary">Media Management</h2>
      <p class="text-sm text-muted mt-1">Configuration des dossiers et du comportement d'import.</p>
    </div>

    <!-- Dossiers -->
    <div class="settings-card flex flex-col gap-5">

      <div>
        <div class="flex items-center gap-2 mb-1.5">
          <label class="settings-label">Dossier téléchargements</label>
          <span v-if="isDocker" class="text-[10px] text-accent border border-accent/40 px-1.5 py-0.5 rounded">Docker</span>
        </div>
        <button @click="openPicker('completePath')" class="settings-input text-left font-mono truncate w-full"
                :class="isRootPath(form.completePath) ? 'text-yellow-500 border-yellow-500/40' : form.completePath ? 'text-primary' : 'text-muted'">
          {{ form.completePath || '/' }}
        </button>
        <p v-if="isRootPath(form.completePath)" class="text-xs text-yellow-500 mt-1.5 flex items-center gap-1">
          <span>⚠</span> Chemin non configuré — cliquez pour sélectionner un dossier
        </p>
        <p v-else class="text-xs text-muted mt-1.5">Dossier où sont déposés les fichiers téléchargés</p>
      </div>

      <div>
        <div class="flex items-center gap-2 mb-1.5">
          <label class="settings-label">Médiathèque Fankai</label>
          <span v-if="isDocker" class="text-[10px] text-accent border border-accent/40 px-1.5 py-0.5 rounded">Docker</span>
        </div>
        <button @click="openPicker('mediaPath')" class="settings-input text-left font-mono truncate w-full"
                :class="isRootPath(form.mediaPath) ? 'text-yellow-500 border-yellow-500/40' : form.mediaPath ? 'text-primary' : 'text-muted'">
          {{ form.mediaPath || '/' }}
        </button>
        <p v-if="isRootPath(form.mediaPath)" class="text-xs text-yellow-500 mt-1.5 flex items-center gap-1">
          <span>⚠</span> Chemin non configuré — cliquez pour sélectionner un dossier
        </p>
        <p v-else class="text-xs text-muted mt-1.5">Dossier racine de votre médiathèque (Jellyfin, Kodi, Plex…)</p>
      </div>

    </div>

    <!-- Alerte globale si un des deux paths est sur / -->
    <div v-if="hasUnconfiguredPaths" class="flex items-start gap-3 px-4 py-3 rounded-lg border border-yellow-500/40 bg-yellow-500/5">
      <span class="text-yellow-500 text-sm mt-0.5">⚠</span>
      <div class="flex flex-col gap-0.5">
        <p class="text-sm text-yellow-500 font-medium">Chemins non configurés</p>
        <p class="text-xs text-muted">
          L'import automatique est désactivé tant que les dossiers ne sont pas configurés.
          Configurez-les ci-dessus avant de sauvegarder.
        </p>
      </div>
    </div>

    <!-- Mode import -->
    <div class="settings-card flex flex-col gap-2">
      <label class="settings-label">Mode d'import</label>
      <div class="flex gap-2">
        <button
            @click="form.organizeMode = 'hardlink'"
            class="px-4 py-2 text-xs rounded-lg border transition-colors"
            :class="form.organizeMode === 'hardlink'
            ? 'border-accent text-accent bg-accent-muted'
            : 'border-border text-muted hover:border-secondary'"
        >
          Hardlink
        </button>
        <button
            @click="form.organizeMode = 'copy'"
            class="px-4 py-2 text-xs rounded-lg border transition-colors"
            :class="form.organizeMode === 'copy'
            ? 'border-accent text-accent bg-accent-muted'
            : 'border-border text-muted hover:border-secondary'"
        >
          Copier
        </button>
        <button
            @click="form.organizeMode = 'move'"
            class="px-4 py-2 text-xs rounded-lg border transition-colors"
            :class="form.organizeMode === 'move'
            ? 'border-accent text-accent bg-accent-muted'
            : 'border-border text-muted hover:border-secondary'"
        >
          Déplacer
        </button>
      </div>
      <p class="text-xs text-muted">
        <span class="text-primary">Hardlink recommandé</span> — le fichier reste dans le client torrent pour le ratio
      </p>
    </div>

    <!-- Toggles -->
    <div class="settings-card flex flex-col gap-5">

      <SettingsToggle
          v-model="form.autoImport"
          label="Import automatique"
          description="Importer automatiquement dès qu'un téléchargement est terminé. Vérifie toutes les 5 minutes."
      />

      <SettingsToggle
          v-model="form.nfoSupport"
          label="NFO / Métadonnées"
          description="Télécharge les NFO et images depuis GitLab lors de l'import (Kodi, Infuse, etc.)."
      />

      <SettingsToggle
          v-if="form.organizeMode === 'move'"
          v-model="form.deleteTorrentOnMove"
          label="Supprimer le torrent après déplacement"
          description="Supprime automatiquement le torrent du client après un import en mode Déplacer."
      />

      <SettingsToggle
          v-model="form.autoUnimportMissing"
          label="Désimporter si fichier manquant"
          description="Si un fichier importé n'est plus trouvé sur le disque lors du scan, il est automatiquement retiré de la bibliothèque."
      />

    </div>

    <!-- Actions -->
    <div class="flex items-center gap-3">
      <button @click="save" :disabled="saving" class="btn-primary">
        {{ saving ? '...' : 'Sauvegarder' }}
      </button>
      <button @click="scan" :disabled="scanning" class="btn-secondary">
        {{ scanning ? 'Scan...' : 'Analyser médiathèque' }}
      </button>
      <span
          v-if="scanResult"
          class="text-xs"
          :class="scanResult.added > 0 ? 'text-green-400' : 'text-muted'"
      >
        {{ scanResult.found }} fichiers · {{ scanResult.added }} ajoutés
      </span>
    </div>

  </div>

  <!-- Folder Picker -->
  <FolderPicker
      v-if="picker.open"
      :initial-path="picker.currentPath"
      @select="onPickerSelect"
      @cancel="picker.open = false"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from '@/composables/useToast'
import FolderPicker from '@/components/FolderPicker.vue'
import SettingsToggle from '@/components/settings/SettingsToggle.vue'

const { add: toast } = useToast()

const saving     = ref(false)
const scanning   = ref(false)
const isDocker   = ref(false)
const scanResult = ref<{ found: number; added: number } | null>(null)

const form = ref({
  mediaPath           : '',
  completePath        : '',
  organizeMode        : 'hardlink' as 'hardlink' | 'copy' | 'move',
  nfoSupport          : false,
  autoImport          : true,
  deleteTorrentOnMove : false,
  autoUnimportMissing : false,
})

const picker = ref<{ open: boolean; field: 'completePath' | 'mediaPath'; currentPath: string }>({
  open: false,
  field: 'completePath',
  currentPath: '/',
})

// FIX : détection path non configuré (vide ou racine /)
function isRootPath(p: string): boolean {
  return !p || p === '/'
}

const hasUnconfiguredPaths = computed(() =>
    isRootPath(form.value.completePath) || isRootPath(form.value.mediaPath)
)

function openPicker(field: 'completePath' | 'mediaPath') {
  picker.value = { open: true, field, currentPath: form.value[field] || picker.value.currentPath || '/' }
}

function onPickerSelect(path: string) {
  form.value[picker.value.field] = path
  picker.value.open = false
}

onMounted(async () => {
  const [settingsRes, systemRes, infoRes] = await Promise.all([
    fetch('/api/settings', { credentials: 'include' }),
    fetch('/api/system',   { credentials: 'include' }),
    fetch('/api/system/info', { credentials: 'include' }),
  ])
  if (settingsRes.ok) Object.assign(form.value, await settingsRes.json())
  if (systemRes.ok)   isDocker.value = (await systemRes.json()).isDocker
  if (infoRes.ok) picker.value.currentPath = (await infoRes.json()).defaultPath ?? '/'
})

async function save() {
  saving.value = true
  try {
    const res = await fetch('/api/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify(form.value),
    })
    if (res.ok) toast('Configuration sauvegardée', 'success')
    else        toast('Erreur lors de la sauvegarde', 'error')
  } finally {
    saving.value = false
  }
}

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
              ? `${data.found} fichiers analysés — ${data.added} ajoutés`
              : `${data.found} fichiers analysés — rien de nouveau`,
          'success'
      )
    } else {
      toast("Erreur lors de l'analyse", 'error')
    }
  } catch {
    toast('Impossible de contacter le serveur', 'error')
  } finally {
    scanning.value = false
  }
}
</script>