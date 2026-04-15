<template>
  <Teleport to="body">
    <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" @click.self="emit('close')">
      <div class="bg-card border border-border rounded-xl w-full max-w-lg flex flex-col" style="max-height: 85vh">

        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h3 class="text-sm font-semibold text-primary">Configuration Plex</h3>
            <p class="text-xs text-muted mt-0.5">
              {{ plexStep === 'auth'    ? 'Connectez votre compte Plex'   :
                plexStep === 'server'  ? 'Choisissez votre serveur Plex' :
                    plexStep === 'library' ? 'Créez la bibliothèque Fankai'  :
                        plexStep === 'done'    ? 'Configuration terminée'        :
                            'Erreur' }}
            </p>
          </div>
          <button @click="emit('close')" class="text-muted hover:text-primary text-lg leading-none">✕</button>
        </div>

        <!-- Étape 1 : Auth -->
        <div v-if="plexStep === 'auth'" class="flex flex-col gap-4 px-6 py-5">
          <div v-if="!plexAuthMethod" class="flex flex-col gap-3">
            <button
                @click="startOAuth" :disabled="plexLoading"
                class="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-accent hover:bg-accent-muted transition-colors text-left"
            >
              <div class="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#E5A50A" opacity=".2"/>
                  <path d="M12 6v6l4 2" stroke="#E5A50A" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </div>
              <div>
                <p class="text-sm font-medium text-primary">{{ plexLoading ? 'Ouverture…' : 'Connexion via Plex' }}</p>
                <p class="text-xs text-muted">Google, Apple, ou compte Plex</p>
              </div>
            </button>

            <button
                @click="plexAuthMethod = 'credentials'"
                class="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-secondary transition-colors text-left"
            >
              <div class="w-8 h-8 rounded-lg bg-hover flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div>
                <p class="text-sm font-medium text-primary">Email / Mot de passe</p>
                <p class="text-xs text-muted">Connexion directe avec vos identifiants</p>
              </div>
            </button>
          </div>

          <!-- OAuth en attente -->
          <div v-else-if="plexAuthMethod === 'oauth'" class="flex flex-col items-center gap-4 py-4 text-center">
            <div class="w-10 h-10 border-2 border-border border-t-accent rounded-full animate-spin" />
            <div>
              <p class="text-sm text-primary font-medium">En attente de la connexion Plex…</p>
              <p class="text-xs text-muted mt-1">Connectez-vous sur la page Plex qui s'est ouverte dans votre navigateur</p>
            </div>
            <button @click="cancelOAuth" class="text-xs text-muted hover:text-primary transition-colors">Annuler</button>
          </div>

          <!-- Formulaire credentials -->
          <template v-else-if="plexAuthMethod === 'credentials'">
            <div>
              <label class="settings-label mb-1 block">Adresse e-mail Plex</label>
              <input v-model="plexForm.username" type="email" class="settings-input w-full" placeholder="email@example.com" />
            </div>
            <div>
              <label class="settings-label mb-1 block">Mot de passe</label>
              <input v-model="plexForm.password" type="password" class="settings-input w-full" placeholder="••••••••" @keyup.enter="plexConnect" />
            </div>
            <div v-if="plexNeeds2FA">
              <label class="settings-label mb-1 block">Code 2FA</label>
              <input v-model="plexForm.code" type="text" class="settings-input w-full" placeholder="123456" maxlength="6" @keyup.enter="plexConnect" />
            </div>
            <p v-if="plexError" class="text-xs text-red-400">{{ plexError }}</p>
            <div class="flex gap-2">
              <button @click="plexConnect" :disabled="plexLoading || !plexForm.username || !plexForm.password" class="btn-primary">
                {{ plexLoading ? 'Connexion…' : 'Se connecter' }}
              </button>
              <button @click="plexAuthMethod = null" class="btn-secondary">Retour</button>
            </div>
          </template>

          <p v-if="plexError && !plexAuthMethod" class="text-xs text-red-400">{{ plexError }}</p>
          <button v-if="!plexAuthMethod" @click="emit('close')" class="btn-secondary self-start">Annuler</button>
        </div>

        <!-- Étape 2 : Choix serveur -->
        <div v-else-if="plexStep === 'server'" class="flex flex-col gap-3 px-6 py-5">
          <p class="text-xs text-muted">{{ plexServers.length }} serveur{{ plexServers.length > 1 ? 's' : '' }} trouvé{{ plexServers.length > 1 ? 's' : '' }}</p>
          <div
              v-for="(server, i) in plexServers" :key="i"
              @click="selectServer(server)"
              class="flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors"
              :class="plexSelectedServer === server ? 'border-accent bg-accent-muted' : 'border-border hover:border-secondary'"
          >
            <div>
              <p class="text-sm text-primary font-medium">{{ server.name }}</p>
              <p class="text-xs text-muted">{{ server.owned ? 'Propriétaire' : 'Partagé' }} · {{ server.connections.length }} connexion{{ server.connections.length > 1 ? 's' : '' }}</p>
            </div>
            <svg v-if="plexSelectedServer === server" width="14" height="14" viewBox="0 0 24 24" stroke="#e5a50a" stroke-width="2.5" fill="none"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <p v-if="plexError" class="text-xs text-red-400">{{ plexError }}</p>
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
            <label class="settings-label mb-1 block">Nom de la bibliothèque</label>
            <input v-model="plexForm.libraryName" type="text" class="settings-input w-full" placeholder="Fankai" />
          </div>
          <div>
            <label class="settings-label mb-1 block">Chemin de la médiathèque</label>
            <p class="text-xs text-muted mb-1.5">Chemin tel que vu par votre serveur Plex</p>
            <input v-model="plexForm.libraryPath" type="text" class="settings-input w-full font-mono" placeholder="/data/media/fankai" />
          </div>
          <p v-if="plexError" class="text-xs text-red-400">{{ plexError }}</p>
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
                   :class="s.ok ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'">
                <svg v-if="s.ok" width="10" height="10" viewBox="0 0 12 12" stroke="currentColor" stroke-width="2.5" fill="none"><polyline points="2 6 5 9 10 3"/></svg>
                <svg v-else width="10" height="10" viewBox="0 0 12 12" stroke="currentColor" stroke-width="2" fill="none"><line x1="3" y1="3" x2="9" y2="9"/><line x1="9" y1="3" x2="3" y2="9"/></svg>
              </div>
              <p class="text-xs" :class="s.ok ? 'text-primary' : 'text-red-400'">{{ s.message }}</p>
            </div>
          </div>

          <div v-if="plexManualSetup" class="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
            <p class="text-xs text-yellow-400 font-medium mb-2">⚠ Configuration manuelle de l'agent requise (Plex &lt; 1.43)</p>
            <ol class="text-xs text-muted space-y-1 list-decimal list-inside">
              <li>Rendez-vous sur la page <span class="text-primary">Metadata Agent</span> de Plex</li>
              <li>Dans <span class="text-primary">Metadata Provider</span>, ajoutez : <code class="bg-hover px-1 rounded">https://metadata.fankai.fr/plex</code></li>
              <li>Dans <span class="text-primary">Metadata Agent</span>, créez un agent avec ce provider</li>
              <li>Dans votre bibliothèque → ⋯ → <span class="text-primary">Manage Library → Edit → Advanced → Agent</span>, sélectionnez l'agent Fankai</li>
              <li>Rafraîchissez les métadonnées</li>
            </ol>
          </div>

          <button @click="emit('close')" class="btn-primary">Fermer</button>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'

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

// ── OAuth ─────────────────────────────────────────────────────
async function startOAuth() {
  plexError.value   = ''
  plexLoading.value = true
  try {
    const res  = await fetch('/api/plex/oauth/start', { method: 'POST', credentials: 'include' })
    const data = await res.json()
    if (!res.ok) { plexError.value = data.error ?? 'Erreur OAuth'; return }
    plexOAuthPinId.value = String(data.pinId)
    plexAuthMethod.value = 'oauth'
    window.open(data.authUrl, '_blank')
    let attempts = 0
    plexOAuthTimer = setInterval(async () => {
      attempts++
      if (attempts > 150) { cancelOAuth(); plexError.value = 'Délai expiré — réessayez'; return }
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
    plexError.value = "Impossible de démarrer l'authentification"
  } finally {
    plexLoading.value = false
  }
}

function cancelOAuth() {
  if (plexOAuthTimer) { clearInterval(plexOAuthTimer); plexOAuthTimer = null }
  plexOAuthPinId.value = null
  if (plexAuthMethod.value === 'oauth') plexAuthMethod.value = null
}

// ── Credentials ───────────────────────────────────────────────
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
      if (data.requires2FA) { plexNeeds2FA.value = true; plexError.value = 'Entrez votre code 2FA' }
      else plexError.value = data.error ?? 'Erreur de connexion'
      return
    }
    plexToken.value   = data.token
    plexServers.value = data.servers
    if (data.servers.length === 1) { plexSelectedServer.value = data.servers[0]; await plexConnectServer() }
    else plexStep.value = 'server'
  } catch {
    plexError.value = 'Impossible de contacter le serveur'
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
    if (!plexServerUrl.value) throw new Error('Aucune URL de connexion disponible')
    plexForm.value.libraryPath = props.mediaPath
    plexStep.value = 'library'
  } catch (err) {
    plexError.value = err instanceof Error ? err.message : 'Erreur'
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
    if (!data.ok) plexError.value = data.error ?? 'Erreur lors du setup'
  } catch {
    plexError.value = 'Impossible de contacter le serveur'
  } finally {
    plexLoading.value = false
  }
}

onUnmounted(() => cancelOAuth())
</script>
