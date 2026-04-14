<template>
  <div class="flex flex-col gap-6">

    <div>
      <h2 class="text-base font-semibold text-primary">Media Management</h2>
      <p class="text-sm text-muted mt-1">Configuration des dossiers et du comportement d'import.</p>
    </div>

    <!-- Loading -->
    <div v-if="!loaded" class="flex items-center justify-center gap-2 py-16 text-muted text-sm">
      <div class="w-4 h-4 border border-border border-t-accent rounded-full animate-spin" />
    </div>

    <template v-else>
      <div class="settings-card flex flex-col gap-5">

        <div>
          <div class="flex items-center gap-2 mb-1.5">
            <label class="settings-label">Dossier téléchargements</label>
            <span v-if="isDocker" class="text-[10px] text-accent border border-accent/40 px-1.5 py-0.5 rounded">Docker</span>
          </div>
          <button @click="openPicker('completePath')" class="settings-input text-left font-mono truncate w-full"
                  :class="isRootPath(form.completePath) ? 'text-yellow-500 border-yellow-500/40' : form.completePath ? 'text-primary' : 'text-muted'">
            {{ form.completePath || '/' }}
          </button>
          <p v-if="isRootPath(form.completePath)" class="text-xs text-yellow-500 mt-1.5 flex items-center gap-1">
            <span>⚠</span> Chemin non configuré — cliquez pour sélectionner un dossier
          </p>
          <p v-else class="text-xs text-muted mt-1.5">Dossier où sont déposés les fichiers téléchargés</p>
        </div>

        <div>
          <div class="flex items-center gap-2 mb-1.5">
            <label class="settings-label">Médiathèque Fankai</label>
            <span v-if="isDocker" class="text-[10px] text-accent border border-accent/40 px-1.5 py-0.5 rounded">Docker</span>
          </div>
          <button @click="openPicker('mediaPath')" class="settings-input text-left font-mono truncate w-full"
                  :class="isRootPath(form.mediaPath) ? 'text-yellow-500 border-yellow-500/40' : form.mediaPath ? 'text-primary' : 'text-muted'">
            {{ form.mediaPath || '/' }}
          </button>
          <p v-if="isRootPath(form.mediaPath)" class="text-xs text-yellow-500 mt-1.5 flex items-center gap-1">
            <span>⚠</span> Chemin non configuré — cliquez pour sélectionner un dossier
          </p>
          <p v-else class="text-xs text-muted mt-1.5">Dossier racine de votre médiathèque (Jellyfin, Kodi, Plex…)</p>
        </div>

      </div>

      <!-- Alerte globale si un des deux paths est sur / -->
      <div v-if="hasUnconfiguredPaths" class="flex items-start gap-3 px-4 py-3 rounded-lg border border-yellow-500/40 bg-yellow-500/5">
        <span class="text-yellow-500 text-sm mt-0.5">⚠</span>
        <div class="flex flex-col gap-0.5">
          <p class="text-sm text-yellow-500 font-medium">Chemins non configurés</p>
          <p class="text-xs text-muted">
            L'import automatique est désactivé tant que les dossiers ne sont pas configurés.
            Configurez-les ci-dessus avant de sauvegarder.
          </p>
        </div>
      </div>

      <!-- Mode import -->
      <div class="settings-card flex flex-col gap-2">
        <label class="settings-label">Mode d'import</label>
        <div class="flex gap-2">
          <button
              @click="form.organizeMode = 'hardlink'"
              class="px-4 py-2 text-xs rounded-lg border transition-colors"
              :class="form.organizeMode === 'hardlink'
            ? 'border-accent text-accent bg-accent-muted'
            : 'border-border text-muted hover:border-secondary'"
          >
            Hardlink
          </button>
          <button
              @click="form.organizeMode = 'copy'"
              class="px-4 py-2 text-xs rounded-lg border transition-colors"
              :class="form.organizeMode === 'copy'
            ? 'border-accent text-accent bg-accent-muted'
            : 'border-border text-muted hover:border-secondary'"
          >
            Copier
          </button>
          <button
              @click="form.organizeMode = 'move'"
              class="px-4 py-2 text-xs rounded-lg border transition-colors"
              :class="form.organizeMode === 'move'
            ? 'border-accent text-accent bg-accent-muted'
            : 'border-border text-muted hover:border-secondary'"
          >
            Déplacer
          </button>
        </div>
        <p class="text-xs text-muted">
          <span class="text-primary">Hardlink recommandé</span> — le fichier reste dans le client torrent pour le ratio
        </p>
      </div>

      <!-- Toggles -->
      <div class="settings-card flex flex-col gap-5">

        <SettingsToggle
            v-model="form.autoImport"
            label="Import automatique"
            description="Importer automatiquement dès qu'un téléchargement est terminé. Vérifie toutes les 5 minutes."
        />

        <SettingsToggle
            v-model="form.nfoSupport"
            label="NFO / Métadonnées"
            description="Télécharge les NFO et images depuis GitLab lors de l'import (Kodi, Infuse, etc.)."
        />

        <SettingsToggle
            v-if="form.organizeMode === 'move'"
            v-model="form.deleteTorrentOnMove"
            label="Supprimer le torrent après déplacement"
            description="Supprime automatiquement le torrent du client après un import en mode Déplacer."
        />

        <SettingsToggle
            v-model="form.autoUnimportMissing"
            label="Désimporter si fichier manquant"
            description="Si un fichier importé n'est plus trouvé sur le disque lors du scan, il est automatiquement retiré de la bibliothèque."
        />

      </div>

      <!-- Actions -->
      <div class="flex items-center gap-3">
        <button @click="save" :disabled="saving" class="btn-primary">
          {{ saving ? '...' : 'Sauvegarder' }}
        </button>
        <button @click="scan" :disabled="scanning" class="btn-secondary">
          {{ scanning ? 'Scan...' : 'Analyser médiathèque' }}
        </button>
        <span v-if="scanResult" class="text-xs" :class="scanResult.added > 0 ? 'text-green-400' : 'text-muted'">
        {{ scanResult.found }} fichiers · {{ scanResult.added }} ajoutés
      </span>
      </div>

      <!-- ── Section Plex ──────────────────────────────────────── -->
      <div>
        <h3 class="text-sm font-semibold text-primary mb-1">Plex</h3>
        <p class="text-xs text-muted mb-4">
          Créez une bibliothèque Plex connectée à l'agent de métadonnées Fankai.
          Requiert Plex Media Server 1.43+ pour la configuration automatique de l'agent.
        </p>

        <button @click="plexOpen = true" class="btn-secondary">
          Configurer Plex
        </button>
      </div>

    </template><!-- fin v-else loaded -->

  </div>

  <!-- Folder Picker -->
  <FolderPicker
      v-if="picker.open"
      :initial-path="picker.currentPath"
      @select="onPickerSelect"
      @cancel="picker.open = false"
  />

  <!-- ── Modal Plex ──────────────────────────────────────────── -->
  <Teleport to="body">
    <div v-if="plexOpen" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" @click.self="closePlex">
      <div class="bg-card border border-border rounded-xl w-full max-w-lg flex flex-col" style="max-height: 85vh">

        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h3 class="text-sm font-semibold text-primary">Configuration Plex</h3>
            <p class="text-xs text-muted mt-0.5">
              {{ plexStep === 'auth'    ? 'Connectez votre compte Plex'        :
                plexStep === 'server'  ? 'Choisissez votre serveur Plex'      :
                    plexStep === 'library' ? 'Créez la bibliothèque Fankai'       :
                        plexStep === 'done'    ? 'Configuration terminée'             :
                            'Erreur' }}
            </p>
          </div>
          <button @click="closePlex" class="text-muted hover:text-primary text-lg leading-none">✕</button>
        </div>

        <!-- Étape 1 : Auth -->
        <div v-if="plexStep === 'auth'" class="flex flex-col gap-4 px-6 py-5">

          <!-- Choix méthode -->
          <div v-if="!plexAuthMethod" class="flex flex-col gap-3">
            <button
                @click="startOAuth"
                :disabled="plexLoading"
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
          <button v-if="!plexAuthMethod" @click="closePlex" class="btn-secondary self-start">Annuler</button>
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
          <!-- Steps -->
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

          <!-- Tuto manuel si agent non configuré -->
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

          <button @click="closePlex" class="btn-primary">Fermer</button>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useToast } from '@/composables/useToast'
import FolderPicker from '@/components/FolderPicker.vue'
import SettingsToggle from '@/components/settings/SettingsToggle.vue'

const { add: toast } = useToast()

const saving     = ref(false)
const scanning   = ref(false)
const isDocker   = ref(false)
const loaded     = ref(false)
const scanResult = ref<{ found: number; added: number } | null>(null)

const form = ref({
  mediaPath           : '',
  completePath        : '',
  organizeMode        : 'hardlink' as 'hardlink' | 'copy' | 'move',
  nfoSupport          : false,
  autoImport          : true,
  deleteTorrentOnMove : false,
  autoUnimportMissing : false,
})

const picker = ref<{ open: boolean; field: 'completePath' | 'mediaPath'; currentPath: string }>({
  open: false,
  field: 'completePath',
  currentPath: '/',
})

// FIX : détection path non configuré (vide ou racine /)
function isRootPath(p: string): boolean {
  return !p || p === '/'
}

const hasUnconfiguredPaths = computed(() =>
    isRootPath(form.value.completePath) || isRootPath(form.value.mediaPath)
)

function openPicker(field: 'completePath' | 'mediaPath') {
  picker.value = { open: true, field, currentPath: form.value[field] || picker.value.currentPath || '/' }
}

function onPickerSelect(path: string) {
  form.value[picker.value.field] = path
  picker.value.open = false
}

// ── Plex ──────────────────────────────────────────────────────
const plexOpen           = ref(false)
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
  libraryPath: '',
})

function closePlex() {
  plexOpen.value       = false
  plexStep.value       = 'auth'
  plexError.value      = ''
  plexNeeds2FA.value   = false
  plexToken.value      = ''
  plexServers.value    = []
  plexAuthMethod.value = null
  plexSelectedServer.value = null
  cancelOAuth()
  plexForm.value = { username: '', password: '', code: '', libraryName: 'Fankai', libraryPath: form.value.mediaPath }
}

// ── OAuth ────────────────────────────────────────────────────
async function startOAuth() {
  plexError.value   = ''
  plexLoading.value = true
  try {
    const res = await fetch('/api/plex/oauth/start', { method: 'POST', credentials: 'include' })
    const data = await res.json()
    if (!res.ok) { plexError.value = data.error ?? 'Erreur OAuth'; return }

    plexOAuthPinId.value = String(data.pinId)
    plexAuthMethod.value = 'oauth'

    // Ouvrir la page Plex dans un nouvel onglet
    window.open(data.authUrl, '_blank')

    // Démarrer le polling (toutes les 2s max 5min)
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
          if (d.servers.length === 1) {
            plexSelectedServer.value = d.servers[0]
            await plexConnectServer()
          } else {
            plexStep.value = 'server'
          }
        }
      } catch {}
    }, 2000)
  } catch {
    plexError.value = 'Impossible de démarrer l\'authentification'
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
    const res = await fetch('/api/plex/connect', {
      method     : 'POST',
      headers    : { 'Content-Type': 'application/json' },
      credentials: 'include',
      body       : JSON.stringify({
        username: plexForm.value.username,
        password: plexForm.value.password,
        code    : plexForm.value.code || undefined,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      if (data.requires2FA) { plexNeeds2FA.value = true; plexError.value = 'Entrez votre code 2FA' }
      else plexError.value = data.error ?? 'Erreur de connexion'
      return
    }
    plexToken.value   = data.token
    plexServers.value = data.servers
    if (data.servers.length === 1) {
      plexSelectedServer.value = data.servers[0]
      await plexConnectServer()
    } else {
      plexStep.value = 'server'
    }
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
    const conns  = plexSelectedServer.value.connections ?? []
    const local  = conns.find((c: any) => c.local && !c.relay)
    const remote = conns.find((c: any) => !c.local && !c.relay)
    const relay  = conns.find((c: any) => c.relay)
    plexServerUrl.value = (local ?? remote ?? relay)?.uri ?? ''
    if (!plexServerUrl.value) throw new Error('Aucune URL de connexion disponible')
    plexForm.value.libraryPath = form.value.mediaPath
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
    const res = await fetch('/api/plex/setup', {
      method     : 'POST',
      headers    : { 'Content-Type': 'application/json' },
      credentials: 'include',
      body       : JSON.stringify({
        token      : plexToken.value,
        serverUrl  : plexServerUrl.value,
        libraryName: plexForm.value.libraryName,
        libraryPath: plexForm.value.libraryPath,
      }),
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

onMounted(async () => {
  const [settingsRes, systemRes, infoRes] = await Promise.all([
    fetch('/api/settings', { credentials: 'include' }),
    fetch('/api/system',   { credentials: 'include' }),
    fetch('/api/system/info', { credentials: 'include' }),
  ])
  if (settingsRes.ok) {
    Object.assign(form.value, await settingsRes.json())
    plexForm.value.libraryPath = form.value.mediaPath
  }
  if (systemRes.ok)   isDocker.value = (await systemRes.json()).isDocker
  if (infoRes.ok) picker.value.currentPath = (await infoRes.json()).defaultPath ?? '/'
  loaded.value = true
})

async function save() {
  saving.value = true
  try {
    const res = await fetch('/api/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify(form.value),
    })
    if (res.ok) toast('Configuration sauvegardée', 'success')
    else        toast('Erreur lors de la sauvegarde', 'error')
  } finally {
    saving.value = false
  }
}

async function scan() {
  scanning.value  = true
  scanResult.value = null
  try {
    const res = await fetch('/api/scan', { method: 'POST', credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      scanResult.value = { found: data.found, added: data.added }
      toast(
          data.added > 0
              ? `${data.found} fichiers analysés — ${data.added} ajoutés`
              : `${data.found} fichiers analysés — rien de nouveau`,
          'success'
      )
    } else {
      toast("Erreur lors de l'analyse", 'error')
    }
  } catch {
    toast('Impossible de contacter le serveur', 'error')
  } finally {
    scanning.value = false
  }
}

onUnmounted(() => { cancelOAuth() })
</script>