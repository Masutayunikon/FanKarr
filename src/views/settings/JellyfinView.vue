<template>
  <div class="flex flex-col gap-4">

    <Teleport defer to="#settings-actions">
      <button @click="syncUsers" :disabled="syncing || !hasToken" class="btn-secondary pointer-fine:h-[38px]" :title="hasToken ? undefined : 'Renseignez d\'abord la clé API Jellyfin.'">
        <RefreshCw :size="15" :class="{ 'animate-spin': syncing }" />
        {{ syncing ? 'Synchronisation…' : 'Synchroniser les utilisateurs' }}
      </button>
    </Teleport>

    <SettingsSection title="Jellyfin" description="La connexion au serveur Jellyfin sert à synchroniser les comptes et à authentifier les utilisateurs du plugin FanKarr Search.">
      <JellyfinConnectionForm @change="hasToken = $event.hasToken" />
    </SettingsSection>

    <SettingsSection
        title="Synchronisation des utilisateurs"
        description="Crée un compte FanKarr pour chaque utilisateur Jellyfin actif (les comptes existants ne sont pas modifiés). Synchronisation automatique toutes les heures."
    >
      <div class="flex items-center gap-3 flex-wrap">
        <button @click="syncUsers" :disabled="syncing || !hasToken" class="btn-secondary pointer-fine:h-[38px]">
          {{ syncing ? 'Synchronisation…' : 'Synchroniser les utilisateurs' }}
        </button>
        <span v-if="!hasToken" class="text-meta text-muted">Renseignez d'abord la clé API Jellyfin.</span>
        <span v-else-if="syncError" class="text-meta text-err">{{ syncError }}</span>
        <span v-else-if="syncResult" class="text-meta text-secondary">
          <span class="text-ok">{{ plural(syncResult.created, 'compte créé', 'comptes créés') }}</span>
          · {{ plural(syncResult.skipped, 'déjà existant ou désactivé', 'déjà existants ou désactivés') }}<template v-if="syncResult.users.length > 0"> · nouveaux : {{ syncResult.users.join(', ') }}</template>
        </span>
      </div>
    </SettingsSection>

    <section class="bg-card rounded-card">
      <div class="flex flex-col gap-0.5 px-5 pt-4 pb-3.5">
        <h3 class="card-title">API publique</h3>
        <p class="text-meta text-muted">
          Adresse : <span class="text-secondary">{{ apiBase }}</span> · Authentification : jeton FanKarr (en-tête <span class="text-secondary">Authorization: Bearer</span>) ou compte Jellyfin.
        </p>
      </div>
      <div
          v-for="ep in apiEndpoints" :key="ep.method + ep.path"
          class="flex items-center gap-x-3.5 gap-y-1 px-5 py-2.5 border-t border-hover flex-wrap sm:flex-nowrap"
      >
        <span class="pill h-[22px] px-2 text-[10.5px] w-14 justify-center shrink-0" :class="ep.method === 'GET' ? 'pill-neutral' : 'pill-wait'">{{ ep.method }}</span>
        <code class="text-body text-primary sm:w-60 shrink-0 font-sans">{{ ep.path }}</code>
        <span class="text-meta text-muted">{{ ep.desc }}</span>
      </div>
    </section>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { RefreshCw } from 'lucide-vue-next'
import JellyfinConnectionForm from '@/components/settings/JellyfinConnectionForm.vue'
import SettingsSection from '@/components/settings/SettingsSection.vue'
import { plural } from '@/utils/format'

const hasToken           = ref(false)
const syncing            = ref(false)
const syncResult         = ref<{ created: number; skipped: number; users: string[] } | null>(null)
const syncError          = ref<string | null>(null)

const apiBase = `${window.location.origin}/api/v1`

const apiEndpoints = [
  { method: 'GET',  path: '/series/search?q=', desc: 'Chercher une série dans le catalogue' },
  { method: 'GET',  path: '/series/:id',       desc: 'Obtenir la fiche complète (saisons et épisodes)' },
  { method: 'POST', path: '/requests',         desc: 'Créer ou compléter une demande au nom de l\'utilisateur' },
  { method: 'GET',  path: '/requests',         desc: 'Lister ses demandes et leur statut' },
  { method: 'POST', path: '/auth/jellyfin',    desc: 'Échanger un jeton Jellyfin contre un jeton FanKarr' },
  { method: 'GET',  path: '/auth/me',          desc: 'Vérifier le jeton utilisé' },
]

async function syncUsers() {
  syncing.value    = true
  syncError.value  = null
  syncResult.value = null
  const res = await fetch('/api/jellyfin/sync', { method: 'POST', credentials: 'include' })
  const data = await res.json()
  if (res.ok) syncResult.value = data
  else syncError.value = data.error ?? 'Impossible de synchroniser les utilisateurs Jellyfin.'
  syncing.value = false
}
</script>
