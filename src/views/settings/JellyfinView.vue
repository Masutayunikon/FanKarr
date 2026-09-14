<template>
  <div class="flex flex-col gap-4">

    <Teleport defer to="#settings-actions">
      <button @click="syncUsers" :disabled="syncing || !hasToken" class="btn-secondary pointer-fine:h-[38px]" :title="hasToken ? undefined : 'Configurez d’abord la clé API'">
        <RefreshCw :size="15" :class="{ 'animate-spin': syncing }" />
        {{ syncing ? 'Synchronisation…' : 'Synchroniser Jellyfin' }}
      </button>
    </Teleport>

    <!-- ── Connexion Jellyfin ─────────────────────────────────── -->
    <SettingsSection title="Jellyfin" description="La connexion au serveur Jellyfin sert à synchroniser les comptes et à authentifier les utilisateurs du plugin FanKarr Search.">
      <JellyfinConnectionForm @change="hasToken = $event.hasToken" />
    </SettingsSection>

    <!-- ── Synchronisation des utilisateurs ──────────────────── -->
    <SettingsSection
        title="Synchronisation des utilisateurs"
        description="Importe les utilisateurs Jellyfin comme comptes FanKarr. Les comptes existants sont ignorés ; les utilisateurs se connectent ensuite depuis le plugin sans autre réglage. Synchronisation automatique toutes les heures."
    >
      <div class="flex items-center gap-3 flex-wrap">
        <button @click="syncUsers" :disabled="syncing || !hasToken" class="btn-secondary pointer-fine:h-[38px]">
          {{ syncing ? 'Synchronisation…' : 'Synchroniser maintenant' }}
        </button>
        <span v-if="!hasToken" class="text-meta text-muted">Configurez d'abord la clé API.</span>
        <span v-else-if="syncError" class="text-meta text-err">{{ syncError }}</span>
        <span v-else-if="syncResult" class="text-meta text-secondary">
          <span class="text-ok">{{ syncResult.created }} compte{{ syncResult.created > 1 ? 's' : '' }} créé{{ syncResult.created > 1 ? 's' : '' }}</span>
          · {{ syncResult.skipped }} ignoré{{ syncResult.skipped > 1 ? 's' : '' }}<template v-if="syncResult.users.length > 0"> · nouveaux : {{ syncResult.users.join(', ') }}</template>
        </span>
      </div>
    </SettingsSection>

    <!-- ── API publique ───────────────────────────────────────── -->
    <section class="bg-card rounded-card">
      <div class="flex flex-col gap-0.5 px-5 pt-4 pb-3.5">
        <h3 class="card-title">API publique</h3>
        <p class="text-meta text-muted">
          Base : <span class="text-secondary">{{ apiBase }}</span> — authentification par jeton FanKarr (en-tête <span class="text-secondary">Authorization: Bearer</span>) ou compte Jellyfin.
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

const hasToken           = ref(false)
const syncing            = ref(false)
const syncResult         = ref<{ created: number; skipped: number; users: string[] } | null>(null)
const syncError          = ref<string | null>(null)

const apiBase = `${window.location.origin}/api/v1`

const apiEndpoints = [
  { method: 'GET',  path: '/v1/series/search?q=', desc: 'Chercher une série dans le catalogue' },
  { method: 'GET',  path: '/v1/series/:id',       desc: 'Fiche complète, saisons et épisodes' },
  { method: 'POST', path: '/v1/requests',         desc: 'Créer ou compléter une demande au nom de l’utilisateur' },
  { method: 'GET',  path: '/v1/requests',         desc: 'Lister ses demandes et leur statut' },
  { method: 'POST', path: '/v1/auth/jellyfin',    desc: 'Échanger un jeton Jellyfin contre un jeton FanKarr' },
  { method: 'GET',  path: '/v1/auth/me',          desc: 'Vérifier le jeton courant' },
]

async function syncUsers() {
  syncing.value    = true
  syncError.value  = null
  syncResult.value = null
  const res = await fetch('/api/jellyfin/sync', { method: 'POST', credentials: 'include' })
  const data = await res.json()
  if (res.ok) syncResult.value = data
  else syncError.value = data.error ?? 'Erreur lors de la synchronisation'
  syncing.value = false
}
</script>
