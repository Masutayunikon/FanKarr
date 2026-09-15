<template>
  <div class="flex flex-col gap-6">

    <div class="card flex flex-col gap-5">
      <SettingsToggle
          v-model="form.autoImport"
          label="Import automatique"
          description="Importe les téléchargements terminés (vérification toutes les 5 minutes). Désactivé, vous lancez l'import depuis la page Activité."
      />
      <SettingsToggle
          v-model="form.englishDirectory"
          label="Dossiers de saison en anglais"
          description="« Season 01 » au lieu de « Saison 1 »."
      />
      <SettingsToggle
          v-model="form.autoUnimportMissing"
          label="Retirer les épisodes supprimés du disque"
          description="À la prochaine analyse, un épisode dont le fichier a disparu est retiré de la médiathèque."
      />
      <SettingsToggle
          v-if="settings.organizeMode === 'move'"
          v-model="form.deleteTorrentOnMove"
          label="Supprimer le torrent après déplacement"
          description="Le torrent ne peut plus être partagé une fois le fichier déplacé : autant le retirer du client."
      />
    </div>

    <div class="card flex flex-col gap-3">
      <SettingsToggle
          v-model="form.nfoSupport"
          label="Fichiers NFO et images"
          description="Enregistre à côté de chaque épisode un fichier .nfo (titre, résumé…) et ses images."
      />
      <div class="flex items-start gap-2.5 px-3 py-2.5 rounded-field border border-border bg-main/50 text-meta text-muted leading-relaxed">
        <Info :size="13" class="shrink-0 mt-0.5" />
        <p>
          Inutile si vous utilisez l'agent Fankai sur <span class="text-primary">Jellyfin, Plex, Emby ou Kodi</span> :
          il gère déjà les métadonnées et les NFO peuvent créer des conflits.
          À activer pour <span class="text-primary">Infuse</span> ou un lecteur qui lit les NFO locaux.
        </p>
      </div>
    </div>

    <p v-if="error" class="text-body text-err" role="alert">{{ error }}</p>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { Info } from 'lucide-vue-next'
import SettingsToggle from '@/components/settings/SettingsToggle.vue'
import { postSettings, type SetupSettings } from './setup'

const props = defineProps<{ settings: SetupSettings; isDocker: boolean; defaultPath: string }>()

const form = reactive({
  autoImport         : props.settings.autoImport,
  englishDirectory   : props.settings.englishDirectory,
  autoUnimportMissing: props.settings.autoUnimportMissing,
  deleteTorrentOnMove: props.settings.deleteTorrentOnMove,
  nfoSupport         : props.settings.nfoSupport,
})

const error = ref<string | null>(null)

async function submit(): Promise<boolean> {
  error.value = null
  if (await postSettings(form)) return true
  error.value = "Impossible d'enregistrer les réglages d'import."
  return false
}

defineExpose({ submit })
</script>
