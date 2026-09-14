<template>
  <div class="flex flex-col gap-6">

    <!-- Fonctionnement -->
    <ol class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <li v-for="(item, i) in flow" :key="item.title" class="settings-card flex gap-3">
        <span class="w-8 h-8 rounded-lg bg-accent-muted text-accent flex items-center justify-center shrink-0">
          <component :is="item.icon" :size="16" />
        </span>
        <div class="min-w-0">
          <p class="text-sm text-primary font-medium">{{ i + 1 }}. {{ item.title }}</p>
          <p class="text-xs text-muted mt-0.5 leading-relaxed">{{ item.text }}</p>
        </div>
      </li>
    </ol>

    <!-- Ce qu'on va configurer -->
    <div class="settings-card flex flex-col gap-3">
      <p class="settings-label">Au programme</p>
      <ul class="flex flex-col gap-2">
        <li v-for="item in checklist" :key="item.label" class="flex items-start gap-2.5 text-sm">
          <Check :size="14" class="text-accent mt-0.5 shrink-0" />
          <span class="text-secondary">
            {{ item.label }}
            <span v-if="item.optional" class="text-muted text-xs">(optionnel)</span>
          </span>
        </li>
      </ul>
      <p class="text-xs text-muted">Comptez environ 5 minutes.</p>
    </div>

    <!-- Docker -->
    <div v-if="isDocker" class="flex items-start gap-3 px-4 py-3 rounded-lg border border-accent/30 bg-accent-muted">
      <HardDrive :size="16" class="text-accent mt-0.5 shrink-0" />
      <div class="flex flex-col gap-1">
        <p class="text-sm text-primary font-medium">FanKarr tourne dans Docker</p>
        <p class="text-xs text-muted leading-relaxed">
          Les chemins à renseigner sont ceux <span class="text-primary">vus depuis le conteneur</span>.
          Pour profiter des hardlinks, montez un seul volume parent qui contient à la fois les téléchargements
          et la médiathèque (ex. <code class="font-mono text-secondary">/data/downloads</code> et
          <code class="font-mono text-secondary">/data/medias</code>).
        </p>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { Check, Download, FolderOpen, HardDrive, Library, Tv } from 'lucide-vue-next'
import type { SetupSettings } from './setup'

defineProps<{ settings: SetupSettings; isDocker: boolean; defaultPath: string }>()

const flow = [
  { icon: Library,    title: 'Catalogue',       text: 'Toutes les séries Fankai, avec leurs torrents par épisode, saison ou intégrale.' },
  { icon: Download,   title: 'Téléchargement',  text: 'Un clic envoie le torrent à votre client (qBittorrent, Transmission…).' },
  { icon: FolderOpen, title: 'Import',          text: 'Une fois terminé, le fichier est renommé et rangé par série et saison.' },
  { icon: Tv,         title: 'Lecture',         text: 'Jellyfin ou Plex retrouvent vos séries avec les métadonnées Fankai.' },
]

const checklist = [
  { label: 'Dossier de téléchargements et médiathèque' },
  { label: 'Client torrent' },
  { label: 'Import automatique et nommage' },
  { label: 'Jellyfin ou Plex', optional: true },
  { label: 'Téléchargement du catalogue' },
]
</script>
