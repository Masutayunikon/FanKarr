<template>
  <div class="flex flex-col gap-4">

    <Teleport defer to="#settings-actions">
      <button @click="importOpen = true" :disabled="!configured" class="btn-secondary pointer-fine:h-[38px]" :title="configured ? undefined : NOT_CONFIGURED">
        <UserPlus :size="15" /> Importer des utilisateurs
      </button>
    </Teleport>

    <SettingsSection title="Jellyfin" description="La connexion au serveur Jellyfin sert à importer les comptes et à connecter leurs utilisateurs à FanKarr, depuis l'interface web ou le plugin FanKarr Search.">
      <JellyfinConnectionForm @change="configured = !!$event.jellyfinUrl && $event.hasToken" />
    </SettingsSection>

    <SettingsSection
        title="Utilisateurs Jellyfin"
        description="Un utilisateur importé reçoit un compte invité. Si un compte FanKarr porte déjà son nom, ce compte est lié au lieu d'être recréé."
    >
      <template #actions>
        <span v-if="savedSection === 'users'" class="text-meta text-ok flex items-center gap-1.5"><Check :size="14" /> Enregistré</span>
      </template>

      <div class="flex items-center gap-3 flex-wrap">
        <button @click="importOpen = true" :disabled="!configured" class="btn-secondary pointer-fine:h-[38px]">
          Importer des utilisateurs
        </button>
        <span v-if="!configured" class="text-meta text-muted">{{ NOT_CONFIGURED }}</span>
      </div>
      <SettingsToggle
          :model-value="options.jellyfinAutoImport"
          @update:model-value="save('jellyfinAutoImport', $event, 'users')"
          label="Importer automatiquement tous les utilisateurs"
          description="Toutes les heures, chaque utilisateur Jellyfin actif sans compte FanKarr est importé."
      />
    </SettingsSection>

    <SettingsSection title="Connexion avec Jellyfin" description="Jellyfin vérifie le mot de passe : FanKarr ne le conserve pas.">
      <template #actions>
        <span v-if="savedSection === 'login'" class="text-meta text-ok flex items-center gap-1.5"><Check :size="14" /> Enregistré</span>
      </template>

      <SettingsToggle
          :model-value="options.jellyfinLogin"
          @update:model-value="save('jellyfinLogin', $event, 'login')"
          label="Connexion à FanKarr avec un compte Jellyfin"
          description="Les comptes importés se connectent à l'interface web avec leurs identifiants Jellyfin."
      />
      <SettingsToggle
          :model-value="options.jellyfinNewUserLogin"
          @update:model-value="save('jellyfinNewUserLogin', $event, 'login')"
          label="Autoriser les comptes pas encore importés"
          description="Un compte invité est créé à la première connexion, depuis l'interface web ou le plugin FanKarr Search."
      />
      <p class="text-xs text-muted">
        Un mot de passe erroné saisi dans FanKarr compte aussi comme un échec dans Jellyfin. Si le verrouillage après plusieurs échecs est activé pour un utilisateur dans Jellyfin, son compte y est désactivé une fois la limite atteinte.
      </p>
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

    <JellyfinImportModal v-if="importOpen" @close="importOpen = false" />

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Check, UserPlus } from 'lucide-vue-next'
import JellyfinConnectionForm from '@/components/settings/JellyfinConnectionForm.vue'
import JellyfinImportModal from '@/components/settings/JellyfinImportModal.vue'
import SettingsSection from '@/components/settings/SettingsSection.vue'
import SettingsToggle from '@/components/settings/SettingsToggle.vue'
import { useToast } from '@/composables/useToast'

type Option = 'jellyfinLogin' | 'jellyfinNewUserLogin' | 'jellyfinAutoImport'

const NOT_CONFIGURED = 'Renseignez d\'abord l\'adresse et la clé API Jellyfin.'

const toast        = useToast()
const configured   = ref(false)
const importOpen   = ref(false)
const options      = ref<Record<Option, boolean>>({ jellyfinLogin: true, jellyfinNewUserLogin: false, jellyfinAutoImport: true })
const savedSection = ref<'users' | 'login' | null>(null)
let   savedTimer: ReturnType<typeof setTimeout> | null = null

const apiBase = `${window.location.origin}/api/v1`

const apiEndpoints = [
  { method: 'GET',  path: '/series/search?q=', desc: 'Chercher une série dans le catalogue' },
  { method: 'GET',  path: '/series/:id',       desc: 'Obtenir la fiche complète (saisons et épisodes)' },
  { method: 'POST', path: '/requests',         desc: 'Créer ou compléter une demande au nom de l\'utilisateur' },
  { method: 'GET',  path: '/requests',         desc: 'Lister ses demandes et leur statut' },
  { method: 'POST', path: '/auth/jellyfin',    desc: 'Échanger un jeton Jellyfin contre un jeton FanKarr' },
  { method: 'GET',  path: '/auth/me',          desc: 'Vérifier le jeton utilisé' },
]

onMounted(async () => {
  const res = await fetch('/api/jellyfin/settings', { credentials: 'include' }).catch(() => null)
  if (!res?.ok) return
  const d = await res.json()
  options.value = { jellyfinLogin: d.jellyfinLogin, jellyfinNewUserLogin: d.jellyfinNewUserLogin, jellyfinAutoImport: d.jellyfinAutoImport }
})

async function save(key: Option, value: boolean, section: 'users' | 'login') {
  const previous = options.value[key]
  options.value[key] = value
  const res = await fetch('/api/jellyfin/settings', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
    body: JSON.stringify({ [key]: value }),
  }).catch(() => null)
  if (!res?.ok) {
    options.value[key] = previous
    toast.add('Impossible d\'enregistrer le réglage.', 'error')
    return
  }
  savedSection.value = section
  if (savedTimer) clearTimeout(savedTimer)
  savedTimer = setTimeout(() => { savedSection.value = null }, 2000)
}
</script>
