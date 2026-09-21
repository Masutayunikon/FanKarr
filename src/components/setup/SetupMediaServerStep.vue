<template>
  <div class="flex flex-col gap-4">

    <section class="card flex flex-col gap-4">
      <div class="flex items-start gap-3">
        <span class="w-9 h-9 rounded-full bg-accent-muted text-accent flex items-center justify-center shrink-0">
          <Server :size="17" />
        </span>
        <div class="flex-1 min-w-0">
          <p class="text-sm text-primary font-medium flex items-center gap-2">
            Jellyfin
            <span v-if="jellyfin?.test?.ok" class="pill pill-ok h-5 px-2 text-[10.5px]">Connecté</span>
          </p>
          <p class="text-meta text-muted mt-0.5 leading-relaxed">
            Vos utilisateurs Jellyfin se connectent à FanKarr avec leur compte Jellyfin, depuis l'interface web ou le plugin FanKarr Search.
          </p>
        </div>
        <button @click="jellyfinOpen = !jellyfinOpen" :aria-expanded="jellyfinOpen" class="btn-secondary btn-sm shrink-0">
          {{ jellyfinOpen ? 'Replier' : 'Configurer' }}
        </button>
      </div>

      <template v-if="jellyfinOpen">
        <div class="h-px bg-hover" />
        <JellyfinConnectionForm @change="jellyfin = $event" />

        <div v-if="jellyfin?.test?.ok" class="flex flex-col gap-2">
          <div class="flex items-center gap-3 flex-wrap">
            <button @click="importUsers" :disabled="importing" class="btn-secondary btn-sm">
              {{ importing ? 'Import…' : 'Importer les utilisateurs' }}
            </button>
            <span v-if="importResult" class="text-meta text-ok">
              {{ plural(importResult.created, 'créé', 'créés') }}<template v-if="importResult.linked > 0"> · {{ plural(importResult.linked, 'lié', 'liés') }}</template> · {{ plural(importResult.skipped, 'ignoré', 'ignorés') }}
            </span>
            <span v-if="importError" class="text-meta text-err">{{ importError }}</span>
          </div>
          <p class="text-meta text-muted">Crée un compte FanKarr pour chaque utilisateur Jellyfin actif. L'import se relance ensuite toutes les heures : vous pourrez choisir les comptes à la place dans Paramètres › Jellyfin et API.</p>
        </div>
      </template>
    </section>

    <section class="card flex flex-col gap-4">
      <div class="flex items-start gap-3">
        <span class="w-9 h-9 rounded-full bg-accent-muted text-accent flex items-center justify-center shrink-0">
          <Tv :size="17" />
        </span>
        <div class="flex-1 min-w-0">
          <p class="text-sm text-primary font-medium flex items-center gap-2">
            Plex
            <span v-if="context.plexOpened" class="text-meta text-muted font-normal">assistant ouvert</span>
          </p>
          <p class="text-meta text-muted mt-0.5 leading-relaxed">
            Crée une bibliothèque Plex sur votre médiathèque, reliée à l'agent de métadonnées Fankai.
            Nécessite Plex Media Server 1.43 ou plus récent pour la configuration automatique.
          </p>
        </div>
        <button @click="openPlex" :disabled="!settings.mediaPath" class="btn-secondary btn-sm shrink-0">
          Lancer l'assistant Plex
        </button>
      </div>
      <p v-if="!settings.mediaPath" class="text-meta text-accent">Renseignez d'abord la médiathèque à l'étape Dossiers.</p>
    </section>

    <p class="text-meta text-muted">Pas encore de Jellyfin ni de Plex ? Passez cette étape : vous pourrez les configurer plus tard dans les paramètres.</p>

  </div>

  <PlexWizard v-if="plexOpen" :media-path="settings.mediaPath" @close="plexOpen = false" />
</template>

<script setup lang="ts">
import { ref, inject } from 'vue'
import { Server, Tv } from 'lucide-vue-next'
import JellyfinConnectionForm from '@/components/settings/JellyfinConnectionForm.vue'
import PlexWizard from '@/components/settings/PlexWizard.vue'
import { setupContextKey, type SetupSettings } from './setup'
import { plural } from '@/utils/format'

defineProps<{ settings: SetupSettings; isDocker: boolean; defaultPath: string }>()

const context = inject(setupContextKey)!

const jellyfinOpen = ref(false)
const jellyfin     = ref<{ jellyfinUrl: string; hasToken: boolean; test: { ok: boolean } | null } | null>(null)
const importing    = ref(false)
const importResult = ref<{ created: number; linked: number; skipped: number } | null>(null)
const importError  = ref<string | null>(null)
const plexOpen     = ref(false)

function openPlex() {
  plexOpen.value     = true
  context.plexOpened = true
}

async function importUsers() {
  importing.value    = true
  importError.value  = null
  importResult.value = null
  try {
    const res  = await fetch('/api/jellyfin/sync', { method: 'POST', credentials: 'include' })
    const data = await res.json()
    if (res.ok) importResult.value = data
    else        importError.value  = data.error ?? 'Impossible d\'importer les utilisateurs Jellyfin'
  } catch {
    importError.value = 'Impossible de contacter le serveur'
  } finally {
    importing.value = false
  }
}
</script>
