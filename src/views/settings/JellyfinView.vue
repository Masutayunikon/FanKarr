<template>
  <div class="flex flex-col gap-6">

    <!-- ── Connexion Jellyfin ─────────────────────────────────── -->
    <section class="flex flex-col gap-4">
      <div>
        <h2 class="text-base font-semibold text-primary">Serveur Jellyfin</h2>
        <p class="text-sm text-muted mt-1">
          Configurez la connexion à votre serveur Jellyfin pour synchroniser les utilisateurs
          et permettre l'authentification depuis le plugin.
        </p>
      </div>

      <JellyfinConnectionForm @change="hasToken = $event.hasToken" />
    </section>

    <!-- ── Synchronisation des utilisateurs ──────────────────── -->
    <section class="flex flex-col gap-4">
      <div>
        <h2 class="text-base font-semibold text-primary">Synchronisation des utilisateurs</h2>
        <p class="text-sm text-muted mt-1">
          Importe les utilisateurs Jellyfin en tant que comptes FanKarr.
          Les comptes existants sont ignorés. Les utilisateurs pourront ensuite se connecter
          via le plugin Jellyfin sans configuration supplémentaire.
        </p>
      </div>

      <div class="settings-card flex flex-col gap-4">
        <div v-if="syncResult" class="flex flex-col gap-1">
          <p class="text-sm text-primary font-medium">
            {{ syncResult.created }} compte{{ syncResult.created > 1 ? 's' : '' }} créé{{ syncResult.created > 1 ? 's' : '' }}
            · {{ syncResult.skipped }} ignoré{{ syncResult.skipped > 1 ? 's' : '' }}
          </p>
          <p v-if="syncResult.users.length > 0" class="text-xs text-muted">
            Nouveaux : {{ syncResult.users.join(', ') }}
          </p>
        </div>

        <button @click="syncUsers" :disabled="syncing || !hasToken" class="btn-secondary w-fit disabled:opacity-50">
          {{ syncing ? 'Synchronisation…' : 'Synchroniser maintenant' }}
        </button>
        <p v-if="syncError" class="text-xs text-red-400">{{ syncError }}</p>
        <p v-if="!hasToken" class="text-xs text-muted">Configurez d'abord le token admin.</p>
      </div>
    </section>

    <!-- ── Référence API ──────────────────────────────────────── -->
    <section class="flex flex-col gap-3">
      <h2 class="text-base font-semibold text-primary">Référence API v1</h2>
      <div class="settings-card overflow-x-auto">
        <table class="w-full text-xs">
          <thead>
            <tr class="border-b border-border">
              <th class="text-left px-3 py-2 text-muted font-medium">Méthode</th>
              <th class="text-left px-3 py-2 text-muted font-medium">Endpoint</th>
              <th class="text-left px-3 py-2 text-muted font-medium">Description</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border/50">
            <tr v-for="ep in apiEndpoints" :key="ep.path">
              <td class="px-3 py-2">
                <span class="font-mono font-semibold" :class="methodClass(ep.method)">{{ ep.method }}</span>
              </td>
              <td class="px-3 py-2">
                <code class="text-muted">{{ ep.path }}</code>
              </td>
              <td class="px-3 py-2 text-muted">{{ ep.desc }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import JellyfinConnectionForm from '@/components/settings/JellyfinConnectionForm.vue'

const hasToken           = ref(false)
const syncing            = ref(false)
const syncResult         = ref<{ created: number; skipped: number; users: string[] } | null>(null)
const syncError          = ref<string | null>(null)

const apiEndpoints = [
  { method: 'POST', path: '/api/v1/auth/jellyfin', desc: 'Échanger un token Jellyfin contre un token FanKarr' },
  { method: 'GET',  path: '/api/v1/auth/me',        desc: 'Infos de l\'utilisateur authentifié' },
  { method: 'GET',  path: '/api/v1/series/search?q=', desc: 'Rechercher dans le catalogue FanKai' },
  { method: 'POST', path: '/api/v1/requests',        desc: 'Créer ou mettre à jour une demande' },
  { method: 'GET',  path: '/api/v1/requests',        desc: 'Récupérer ses propres demandes' },
]

function methodClass(m: string) {
  return { GET: 'text-green-400', POST: 'text-blue-400', DELETE: 'text-red-400' }[m] ?? 'text-muted'
}

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
