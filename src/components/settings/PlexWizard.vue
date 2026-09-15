<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="emit('close')">
      <div class="bg-card border border-border rounded-card w-full max-w-lg flex flex-col max-h-[85vh] overflow-y-auto shadow-[0_24px_60px_rgb(0_0_0/0.55)]" role="dialog" aria-modal="true" aria-labelledby="plex-title">

        <div class="flex items-center justify-between gap-4 px-6 py-4 border-b border-hover shrink-0">
          <div>
            <h3 id="plex-title" class="font-display text-xl font-bold text-primary">Configuration Plex</h3>
            <p class="text-meta text-muted mt-0.5">
              {{ plexStep === 'auth'    ? 'Connectez votre compte Plex'   :
                plexStep === 'server'  ? 'Choisissez votre serveur Plex' :
                    plexStep === 'library' ? 'Créez la bibliothèque Fankai'  :
                        plexStep === 'done'    ? 'Configuration terminée'        :
                            '' }}
            </p>
          </div>
          <button @click="emit('close')" class="btn-icon btn-sm border-transparent" aria-label="Fermer"><X :size="16" /></button>
        </div>

        <!-- Étape 1 : connexion -->
        <div v-if="plexStep === 'auth'" class="flex flex-col gap-4 px-6 py-5">
          <div v-if="!plexAuthMethod" class="flex flex-col gap-3">
            <button
                @click="startOAuth" :disabled="plexLoading"
                class="flex items-center gap-3 p-4 rounded-field border border-border-light hover:border-accent/40 hover:bg-accent-muted transition-colors text-left"
            >
              <div class="w-8 h-8 rounded-full bg-accent-muted text-accent flex items-center justify-center shrink-0">
                <Clock3 :size="16" />
              </div>
              <div>
                <p class="text-sm font-medium text-primary">{{ plexLoading ? 'Ouverture…' : 'Connexion via Plex' }}</p>
                <p class="text-meta text-muted">Google, Apple ou compte Plex</p>
              </div>
            </button>

            <button
                @click="plexAuthMethod = 'credentials'"
                class="flex items-center gap-3 p-4 rounded-field border border-border-light hover:bg-hover transition-colors text-left"
            >
              <div class="w-8 h-8 rounded-full bg-hover text-secondary flex items-center justify-center shrink-0">
                <User :size="16" />
              </div>
              <div>
                <p class="text-sm font-medium text-primary">E-mail et mot de passe</p>
                <p class="text-meta text-muted">Sans passer par la page de connexion Plex</p>
              </div>
            </button>
          </div>

          <div v-else-if="plexAuthMethod === 'oauth'" class="flex flex-col items-center gap-4 py-4 text-center">
            <div class="w-10 h-10 border-2 border-border border-t-accent rounded-full animate-spin" />
            <div>
              <p class="text-sm text-primary font-medium">En attente de la connexion Plex…</p>
              <p class="text-meta text-muted mt-1">Connectez-vous dans l'onglet Plex qui vient de s'ouvrir. Rien ne s'est ouvert ? Autorisez les fenêtres pop-up.</p>
            </div>
            <button @click="cancelOAuth" class="btn-ghost btn-sm">Annuler</button>
          </div>

          <template v-else-if="plexAuthMethod === 'credentials'">
            <div>
              <label class="field-label mb-1 block">Adresse e-mail Plex</label>
              <input v-model="plexForm.username" type="email" class="field w-full" placeholder="email@example.com" />
            </div>
            <div>
              <label class="field-label mb-1 block">Mot de passe</label>
              <input v-model="plexForm.password" type="password" class="field w-full" placeholder="••••••••" @keyup.enter="plexConnect" />
            </div>
            <div v-if="plexNeeds2FA">
              <label class="field-label mb-1 block">Code de validation (6 chiffres)</label>
              <input v-model="plexForm.code" type="text" class="field w-full" placeholder="123456" maxlength="6" @keyup.enter="plexConnect" />
            </div>
            <p v-if="plexError" class="text-meta text-err">{{ plexError }}</p>
            <div class="flex gap-2">
              <button @click="plexConnect" :disabled="plexLoading || !plexForm.username || !plexForm.password" class="btn-primary">
                {{ plexLoading ? 'Connexion…' : 'Se connecter' }}
              </button>
              <button @click="plexAuthMethod = null" class="btn-secondary">Retour</button>
            </div>
          </template>

          <p v-if="plexError && !plexAuthMethod" class="text-meta text-err">{{ plexError }}</p>
          <button v-if="!plexAuthMethod" @click="emit('close')" class="btn-secondary self-start">Annuler</button>
        </div>

        <!-- Étape 2 : choix du serveur -->
        <div v-else-if="plexStep === 'server'" class="flex flex-col gap-3 px-6 py-5">
          <p class="text-meta text-muted">{{ plural(plexServers.length, 'serveur trouvé', 'serveurs trouvés') }}</p>
          <div
              v-for="(server, i) in plexServers" :key="i"
              @click="selectServer(server)"
              class="flex items-center justify-between p-3 rounded-field border cursor-pointer transition-colors"
              :class="plexSelectedServer === server ? 'border-accent/50 bg-accent-muted' : 'border-border-light hover:bg-hover'"
          >
            <div>
              <p class="text-sm text-primary font-medium">{{ server.name }}</p>
              <p class="text-meta text-muted">{{ server.owned ? 'Votre serveur' : 'Partagé avec vous' }}</p>
            </div>
            <Check v-if="plexSelectedServer === server" :size="15" :stroke-width="2.5" class="text-accent" />
          </div>
          <p v-if="plexError" class="text-meta text-err">{{ plexError }}</p>
          <div class="flex gap-2 mt-1">
            <button @click="plexConnectServer" :disabled="!plexSelectedServer || plexLoading" class="btn-primary">
              {{ plexLoading ? 'Connexion…' : 'Continuer' }}
            </button>
            <button @click="plexStep = 'auth'" class="btn-secondary">Retour</button>
          </div>
        </div>

        <!-- Étape 3 : Bibliothèque -->
        <div v-else-if="plexStep === 'library'" class="flex flex-col gap-4 px-6 py-5">
          <div>
            <label class="field-label mb-1 block">Nom de la bibliothèque</label>
            <input v-model="plexForm.libraryName" type="text" class="field w-full" placeholder="Fankai" />
          </div>
          <div>
            <label class="field-label mb-1 block">Chemin de la médiathèque</label>
            <p class="text-xs text-muted mb-1.5">Le dossier de la médiathèque tel que Plex le voit (il peut différer du chemin FanKarr).</p>
            <input v-model="plexForm.libraryPath" type="text" class="field w-full" placeholder="/data/media/fankai" />
          </div>
          <p v-if="plexError" class="text-meta text-err">{{ plexError }}</p>
          <div class="flex gap-2">
            <button @click="plexSetup" :disabled="plexLoading || !plexForm.libraryName || !plexForm.libraryPath" class="btn-primary">
              {{ plexLoading ? 'Création…' : 'Créer la bibliothèque' }}
            </button>
            <button @click="plexStep = 'server'" class="btn-secondary">Retour</button>
          </div>
        </div>

        <!-- Étape 4 : Résultat -->
        <div v-else-if="plexStep === 'done'" class="flex flex-col gap-4 px-6 py-5">
          <div class="flex flex-col gap-2">
            <div v-for="s in plexSteps" :key="s.step" class="flex items-center gap-2.5">
              <div class="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                   :class="s.ok ? 'bg-ok/15 text-ok' : 'bg-err/15 text-err'">
                <Check v-if="s.ok" :size="11" :stroke-width="3" />
                <X v-else :size="11" :stroke-width="3" />
              </div>
              <p class="text-meta" :class="s.ok ? 'text-primary' : 'text-err'">{{ s.message }}</p>
            </div>
          </div>

          <div v-if="plexManualSetup" class="bg-accent/5 border border-accent/30 rounded-field p-3">
            <p class="text-meta text-accent font-bold mb-2">Configuration manuelle de l'agent requise (Plex &lt; 1.43)</p>
            <ol class="text-xs text-muted space-y-1 list-decimal list-inside">
              <li>Rendez-vous sur la page <span class="text-primary">Metadata Agent</span> de Plex</li>
              <li>Dans <span class="text-primary">Metadata Provider</span>, ajoutez : <code class="bg-hover px-1 rounded">https://metadata.fankai.fr/plex</code></li>
              <li>Dans <span class="text-primary">Metadata Agent</span>, créez un agent qui utilise ce fournisseur</li>
              <li>Dans le menu ⋯ de votre bibliothèque, <span class="text-primary">Manage Library › Edit › Advanced › Agent</span> : sélectionnez l'agent Fankai</li>
              <li>Actualisez les métadonnées</li>
            </ol>
          </div>

          <button @click="emit('close')" class="btn-primary self-end">Fermer</button>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { Check, Clock3, User, X } from 'lucide-vue-next'
import { plural } from '@/utils/format'

const props = defineProps<{ mediaPath: string }>()
const emit  = defineEmits<{ close: [] }>()

const plexStep           = ref<'auth' | 'server' | 'library' | 'done'>('auth')
const plexLoading        = ref(false)
const plexError          = ref('')
const plexNeeds2FA       = ref(false)
const plexToken          = ref('')
const plexServers        = ref<any[]>([])
const plexSelectedServer = ref<any>(null)
const plexServerUrl      = ref('')
const plexManualSetup    = ref(false)
const plexSteps          = ref<{ step: string; ok: boolean; message: string }[]>([])
const plexAuthMethod     = ref<'oauth' | 'credentials' | null>(null)
const plexOAuthPinId     = ref<string | null>(null)
let   plexOAuthTimer: ReturnType<typeof setInterval> | null = null

const plexForm = ref({
  username   : '',
  password   : '',
  code       : '',
  libraryName: 'Fankai',
  libraryPath: props.mediaPath,
})

// ── Connexion via Plex ──
async function startOAuth() {
  plexError.value   = ''
  plexLoading.value = true
  try {
    const res  = await fetch('/api/plex/oauth/start', { method: 'POST', credentials: 'include' })
    const data = await res.json()
    if (!res.ok) { plexError.value = data.error ?? "Impossible d'ouvrir la connexion Plex."; return }
    plexOAuthPinId.value = String(data.pinId)
    plexAuthMethod.value = 'oauth'
    window.open(data.authUrl, '_blank')
    let attempts = 0
    plexOAuthTimer = setInterval(async () => {
      attempts++
      if (attempts > 150) { cancelOAuth(); plexError.value = 'Délai dépassé. Réessayez.'; return }
      try {
        const r = await fetch(`/api/plex/oauth/poll/${plexOAuthPinId.value}`, { credentials: 'include' })
        const d = await r.json()
        if (d.ok && !d.pending) {
          cancelOAuth()
          plexToken.value   = d.token
          plexServers.value = d.servers
          if (d.servers.length === 1) { plexSelectedServer.value = d.servers[0]; await plexConnectServer() }
          else plexStep.value = 'server'
        }
      } catch {}
    }, 2000)
  } catch {
    plexError.value = "Impossible d'ouvrir la connexion Plex."
  } finally {
    plexLoading.value = false
  }
}

function cancelOAuth() {
  if (plexOAuthTimer) { clearInterval(plexOAuthTimer); plexOAuthTimer = null }
  plexOAuthPinId.value = null
  if (plexAuthMethod.value === 'oauth') plexAuthMethod.value = null
}

// ── Identifiants ──
async function plexConnect() {
  plexError.value   = ''
  plexLoading.value = true
  try {
    const res  = await fetch('/api/plex/connect', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ username: plexForm.value.username, password: plexForm.value.password, code: plexForm.value.code || undefined }),
    })
    const data = await res.json()
    if (!res.ok) {
      if (data.requires2FA) { plexNeeds2FA.value = true; plexError.value = 'Entrez le code de validation en deux étapes.' }
      else plexError.value = data.error ?? 'Impossible de se connecter à Plex. Vérifiez vos identifiants.'
      return
    }
    plexToken.value   = data.token
    plexServers.value = data.servers
    if (data.servers.length === 1) { plexSelectedServer.value = data.servers[0]; await plexConnectServer() }
    else plexStep.value = 'server'
  } catch {
    plexError.value = 'Impossible de contacter le serveur.'
  } finally {
    plexLoading.value = false
  }
}

function selectServer(server: any) { plexSelectedServer.value = server }

async function plexConnectServer() {
  if (!plexSelectedServer.value) return
  plexError.value   = ''
  plexLoading.value = true
  try {
    const conns = plexSelectedServer.value.connections ?? []
    const conn  = conns.find((c: any) => c.local && !c.relay) ?? conns.find((c: any) => !c.local && !c.relay) ?? conns.find((c: any) => c.relay)
    plexServerUrl.value = conn?.uri ?? ''
    if (!plexServerUrl.value) throw new Error('Ce serveur Plex ne propose aucune adresse de connexion.')
    plexForm.value.libraryPath = props.mediaPath
    plexStep.value = 'library'
  } catch (err) {
    plexError.value = err instanceof Error ? err.message : 'Impossible de se connecter à ce serveur.'
  } finally {
    plexLoading.value = false
  }
}

async function plexSetup() {
  plexError.value   = ''
  plexLoading.value = true
  try {
    const res  = await fetch('/api/plex/setup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ token: plexToken.value, serverUrl: plexServerUrl.value, libraryName: plexForm.value.libraryName, libraryPath: plexForm.value.libraryPath }),
    })
    const data = await res.json()
    plexSteps.value       = data.steps ?? []
    plexManualSetup.value = data.manualSetup ?? false
    plexStep.value        = 'done'
    if (!data.ok) plexError.value = data.error ?? 'Impossible de configurer Plex.'
  } catch {
    plexError.value = 'Impossible de contacter le serveur.'
  } finally {
    plexLoading.value = false
  }
}

onUnmounted(() => cancelOAuth())
</script>
