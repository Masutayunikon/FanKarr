<template>
  <div class="flex flex-col gap-6">

    <div class="card flex flex-col gap-5">
      <SettingsToggle
          v-model="form.autoImport"
          label="Import automatique"
          description="Importe dès qu'un téléchargement est terminé, puis vérifie toutes les 5 minutes. Sinon, l'import se lance à la main depuis Activité."
      />
      <SettingsToggle
          v-model="form.englishDirectory"
          label="Dossiers « Season » au lieu de « Saison »"
          description="Nomme les dossiers de saison « Season 01 » plutôt que « Saison 1 »."
      />
      <SettingsToggle
          v-model="form.autoUnimportMissing"
          label="Désimporter si le fichier disparaît"
          description="Un épisode supprimé du disque est retiré de la médiathèque FanKarr au scan suivant."
      />
      <SettingsToggle
          v-if="settings.organizeMode === 'move'"
          v-model="form.deleteTorrentOnMove"
          label="Supprimer le torrent après déplacement"
          description="Retire automatiquement le torrent du client une fois le fichier déplacé."
      />
    </div>

    <div class="card flex flex-col gap-3">
      <SettingsToggle
          v-model="form.nfoSupport"
          label="Fichiers NFO et images"
          description="Télécharge NFO et visuels à côté de chaque épisode lors de l'import."
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
  error.value = "Erreur lors de l'enregistrement."
  return false
}

defineExpose({ submit })
</script>
