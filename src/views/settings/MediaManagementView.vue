<template>
  <div class="flex flex-col gap-4">

    <Teleport defer to="#settings-actions">
      <span v-if="dirtyCount > 0" class="text-meta text-accent">{{ plural(dirtyCount, 'modification non enregistrée', 'modifications non enregistrées') }}</span>
      <button @click="save" :disabled="saving || !loaded" class="btn-primary pointer-fine:h-[38px]">
        {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
      </button>
    </Teleport>

    <div v-if="!loaded" class="flex items-center justify-center gap-2 py-16 text-muted text-body">
      <div class="w-4 h-4 border border-border border-t-accent rounded-full animate-spin" />
    </div>

    <template v-else>

      <SettingsSection title="Dossiers" :description="isDocker ? 'Ces deux chemins sont vus depuis le conteneur FanKarr.' : 'Où FanKarr trouve les téléchargements terminés et où il range la médiathèque.'">
        <div class="grid md:grid-cols-2 gap-4">
          <div v-for="field in pathFields" :key="field.key" class="flex flex-col gap-[7px] min-w-0">
            <span class="field-label flex items-center gap-2">
              {{ field.label }}
              <span v-if="isDocker" class="pill pill-neutral h-5 px-2 text-[10.5px]">Docker</span>
            </span>
            <button
                @click="openPicker(field.key)"
                class="field flex items-center gap-2.5 text-left h-[42px] py-0"
                :class="isRootPath(form[field.key]) ? 'border-accent/50' : ''"
            >
              <span class="flex-1 truncate" :class="form[field.key] ? 'text-primary' : 'text-muted'">{{ form[field.key] || '/' }}</span>
              <span class="text-meta text-secondary shrink-0">Parcourir</span>
            </button>
            <p v-if="isRootPath(form[field.key])" class="text-xs text-accent flex items-center gap-1.5">
              <TriangleAlert :size="13" /> Chemin non configuré : cliquez pour choisir un dossier
            </p>
            <p v-else class="text-xs text-muted">{{ field.hint }}</p>
          </div>
        </div>
      </SettingsSection>

      <div v-if="hasUnconfiguredPaths" class="rounded-card border border-accent/30 bg-accent/5 px-5 py-4 flex items-start gap-3.5">
        <TriangleAlert :size="18" :stroke-width="1.75" class="text-accent shrink-0 mt-0.5" />
        <div class="flex flex-col gap-1">
          <p class="card-title text-accent">Chemins non configurés</p>
          <p class="text-meta text-secondary">
            L'import automatique reste désactivé tant que ces deux dossiers ne sont pas choisis.
          </p>
        </div>
      </div>

      <SettingsSection title="Import" description="Ce que FanKarr fait des fichiers une fois le téléchargement terminé.">
        <div class="flex items-center gap-x-[18px] gap-y-3 flex-wrap">
          <div class="segmented segmented-lg" role="group" aria-label="Mode d'import">
            <button
                v-for="mode in (['hardlink', 'copy', 'move'] as const)"
                :key="mode"
                type="button"
                @click="form.organizeMode = mode"
                class="segmented-item"
                :class="{ 'is-active': form.organizeMode === mode }"
                :aria-pressed="form.organizeMode === mode"
            >
              {{ mode === 'hardlink' ? 'Hardlink' : mode === 'copy' ? 'Copier' : 'Déplacer' }}
            </button>
          </div>
          <span class="text-meta text-muted">Recommandé : le hardlink laisse le fichier en partage dans le client sans occuper deux fois l'espace. Les deux dossiers doivent être sur le même disque.</span>
        </div>
        <div class="h-px bg-hover" />
        <SettingsToggle
            v-model="form.autoImport"
            label="Import automatique"
            description="Importe les téléchargements terminés (vérification toutes les 5 minutes)."
        />
        <SettingsToggle
            :model-value="form.nfoSupport"
            @update:model-value="onNfoToggle"
            label="Fichiers NFO et images"
            description="À chaque import, ajoute les fichiers de description (.nfo) et les images. Utile pour Infuse ou les lecteurs sans agent Fankai."
        />
        <SettingsToggle
            v-if="form.organizeMode === 'move'"
            v-model="form.deleteTorrentOnMove"
            label="Supprimer le torrent après déplacement"
            description="Le torrent quitte le client une fois ses fichiers déplacés et n'est plus partagé."
        />
        <SettingsToggle
            v-model="form.autoUnimportMissing"
            label="Retirer les épisodes dont le fichier a disparu"
            description="Lors de l'analyse, retire de la médiathèque les épisodes dont le fichier n'existe plus."
        />
        <SettingsToggle
            v-model="form.englishDirectory"
            label="Dossiers de saison en anglais"
            description="« Season 01 » au lieu de « Saison 1 »."
        />
      </SettingsSection>

      <SettingsSection title="Serveurs multimédias" description="Les applications qui liront la médiathèque.">
        <div class="flex items-center gap-5 flex-wrap sm:flex-nowrap">
          <div class="flex-1 min-w-0 flex flex-col gap-[3px]">
            <span class="flex items-center gap-2.5 text-sm font-medium text-primary">
              Jellyfin
              <span class="pill h-5 px-[9px] text-[11px]" :class="jellyfinConfigured ? 'pill-ok' : 'pill-muted'">{{ jellyfinConfigured ? 'Configuré' : 'Non configuré' }}</span>
            </span>
            <span class="text-meta text-muted">Synchronisation des comptes et connexion depuis le plugin FanKarr Search.</span>
          </div>
          <RouterLink to="/settings/jellyfin" class="btn-secondary btn-sm pointer-fine:h-[34px] shrink-0">Réglages Jellyfin</RouterLink>
        </div>
        <div class="h-px bg-hover" />
        <div class="flex items-center gap-5 flex-wrap sm:flex-nowrap">
          <div class="flex-1 min-w-0 flex flex-col gap-[3px]">
            <span class="text-sm font-medium text-primary">Plex</span>
            <span class="text-meta text-muted">Crée une bibliothèque Plex reliée à l'agent de métadonnées Fankai. Nécessite Plex Media Server 1.43 ou plus récent pour configurer l'agent automatiquement.</span>
          </div>
          <button @click="plexOpen = true" class="btn-secondary btn-sm pointer-fine:h-[34px] shrink-0">Configurer Plex</button>
        </div>
      </SettingsSection>

      <div class="flex items-center gap-3 flex-wrap">
        <button @click="scan" :disabled="scanning" class="btn-secondary pointer-fine:h-[38px]">
          <Loader v-if="scanning" :size="15" class="animate-spin" />
          <ScanSearch v-else :size="15" />
          {{ scanning ? 'Analyse…' : 'Analyser la médiathèque' }}
        </button>
        <span v-if="lastScan" class="text-meta text-muted">
          Dernière analyse {{ formatRelative(lastScan.at) }} · {{ plural(lastScan.found, 'fichier trouvé', 'fichiers trouvés') }}<template v-if="lastScan.added"> · {{ plural(lastScan.added, 'ajouté') }}</template>
        </span>
      </div>

    </template>

    <FolderPicker
        v-if="picker.open"
        :initial-path="picker.currentPath"
        @select="onPickerSelect"
        @cancel="picker.open = false"
    />

    <PlexWizard
        v-if="plexOpen"
        :media-path="form.mediaPath"
        @close="plexOpen = false"
    />

    <Teleport to="body">
      <div v-if="nfoConfirmOpen" class="modal-backdrop" @click.self="nfoConfirmOpen = false">
        <div class="modal max-w-sm" role="dialog" aria-modal="true" aria-labelledby="nfo-title">
          <div class="flex flex-col gap-2">
            <h3 id="nfo-title" class="card-title">Activer les NFO et métadonnées ?</h3>
            <p class="text-meta text-secondary leading-relaxed">
              Si vous utilisez l'agent Fankai sur <span class="text-primary">Jellyfin, Plex, Emby ou Kodi</span>,
              les métadonnées sont déjà gérées par l'agent : activer les NFO est inutile et peut créer des conflits.
            </p>
            <p class="text-meta text-secondary leading-relaxed">
              Activez cette option seulement si vous utilisez <span class="text-primary">Infuse</span> ou un lecteur qui lit les fichiers NFO locaux.
            </p>
          </div>
          <div class="flex gap-2.5 justify-end">
            <button @click="nfoConfirmOpen = false" class="btn-ghost">Annuler</button>
            <button @click="confirmNfo" class="btn-primary">Activer quand même</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { Loader, ScanSearch, TriangleAlert } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
import { formatRelative, plural } from '@/utils/format'
import SettingsSection from '@/components/settings/SettingsSection.vue'
import FolderPicker from '@/components/FolderPicker.vue'
import SettingsToggle from '@/components/settings/SettingsToggle.vue'
import PlexWizard from '@/components/settings/PlexWizard.vue'

const { add: toast } = useToast()

const saving         = ref(false)
const scanning       = ref(false)
const isDocker       = ref(false)
const loaded         = ref(false)
const plexOpen       = ref(false)
const nfoConfirmOpen = ref(false)
const lastScan       = ref<{ at: string; found: number; added: number } | null>(null)
const jellyfinConfigured = ref(false)
const savedSnapshot  = ref('')

const pathFields = [
  { key: 'completePath', label: 'Dossier des téléchargements terminés', hint: 'Là où le client torrent dépose ses fichiers.' },
  { key: 'mediaPath',    label: 'Médiathèque Fankai',                   hint: 'Dossier racine lu par Jellyfin, Plex ou Kodi.' },
] as const

function onNfoToggle(val: boolean) {
  if (val && !form.value.nfoSupport) {
    nfoConfirmOpen.value = true
  } else {
    form.value.nfoSupport = val
  }
}

function confirmNfo() {
  form.value.nfoSupport = true
  nfoConfirmOpen.value  = false
}

const form = ref({
  mediaPath           : '',
  completePath        : '',
  organizeMode        : 'hardlink' as 'hardlink' | 'copy' | 'move',
  nfoSupport          : false,
  autoImport          : true,
  deleteTorrentOnMove : false,
  autoUnimportMissing : false,
  englishDirectory    : false,
})

const picker = ref<{ open: boolean; field: 'completePath' | 'mediaPath'; currentPath: string }>({
  open: false, field: 'completePath', currentPath: '/',
})

function isRootPath(p: string): boolean { return !p || p === '/' }

const dirtyCount = computed(() => {
  if (!savedSnapshot.value) return 0
  const saved = JSON.parse(savedSnapshot.value)
  return (Object.keys(form.value) as (keyof typeof form.value)[]).filter(k => saved[k] !== form.value[k]).length
})

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

async function save() {
  saving.value = true
  try {
    const res = await fetch('/api/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify(form.value),
    })
    if (res.ok) { toast('Configuration enregistrée', 'success'); savedSnapshot.value = JSON.stringify(form.value) }
    else        toast("Impossible d'enregistrer les réglages", 'error')
  } finally {
    saving.value = false
  }
}

async function scan() {
  scanning.value   = true
  try {
    const res = await fetch('/api/scan', { method: 'POST', credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      lastScan.value = { at: new Date().toISOString(), found: data.found, added: data.added }
      toast(data.added > 0 ? `${plural(data.found, 'fichier analysé', 'fichiers analysés')} · ${plural(data.added, 'ajouté')}` : `${plural(data.found, 'fichier analysé', 'fichiers analysés')} · rien de nouveau`, 'success')
    } else {
      toast("Impossible d'analyser la médiathèque", 'error')
    }
  } catch {
    toast('Impossible de contacter le serveur', 'error')
  } finally {
    scanning.value = false
  }
}

onMounted(async () => {
  const [settingsRes, systemRes, infoRes, scanRes] = await Promise.all([
    fetch('/api/settings',     { credentials: 'include' }),
    fetch('/api/system',       { credentials: 'include' }),
    fetch('/api/system/info',  { credentials: 'include' }),
    fetch('/api/scan',         { credentials: 'include' }),
  ])
  if (settingsRes.ok) {
    const s = await settingsRes.json()
    for (const k of Object.keys(form.value) as (keyof typeof form.value)[]) if (k in s) (form.value as any)[k] = s[k]
    jellyfinConfigured.value = !!s.jellyfinUrl
    savedSnapshot.value = JSON.stringify(form.value)
  }
  if (scanRes.ok)     lastScan.value = (await scanRes.json()).lastScan ?? null
  if (systemRes.ok)   isDocker.value = (await systemRes.json()).isDocker
  if (infoRes.ok)     picker.value.currentPath = (await infoRes.json()).defaultPath ?? '/'
  loaded.value = true
})
</script>
