<template>
  <div class="min-h-screen bg-main flex flex-col md:flex-row">

    <!-- Rail des étapes -->
    <aside class="md:w-[280px] md:h-screen md:sticky md:top-0 bg-sidebar border-b md:border-b-0 md:border-r border-card flex flex-col shrink-0">
      <div class="flex items-center gap-[11px] pl-5 pr-3 pt-[22px] pb-5">
        <FankarrLogo class="w-[30px] h-[31px] shrink-0" />
        <div class="flex-1 min-w-0">
          <p class="font-display text-[23px] font-bold text-primary leading-tight tracking-[0.01em]">FanKarr</p>
          <p class="text-[11.5px] text-muted">Assistant de configuration</p>
        </div>
        <button
            v-if="context.relaunch"
            @click="close"
            title="Fermer l'assistant"
            aria-label="Fermer l'assistant"
            class="w-9 h-9 rounded-full flex items-center justify-center text-muted hover:text-primary hover:bg-hover transition-colors"
        >
          <X :size="17" />
        </button>
        <button
            v-else
            @click="logout"
            title="Se déconnecter"
            aria-label="Se déconnecter"
            class="w-9 h-9 rounded-full flex items-center justify-center text-muted hover:text-err hover:bg-hover transition-colors"
        >
          <LogOut :size="16" :stroke-width="1.75" />
        </button>
      </div>

      <!-- Progression mobile -->
      <div class="md:hidden px-5 pb-4">
        <div class="progress" role="progressbar" :aria-valuenow="index + 1" aria-valuemin="1" :aria-valuemax="steps.length">
          <div class="progress-bar" :style="{ width: `${((index + 1) / steps.length) * 100}%` }" />
        </div>
      </div>

      <nav aria-label="Étapes" class="hidden md:block flex-1 overflow-y-auto px-3.5 pb-5">
        <ol class="flex flex-col gap-0.5">
          <li v-for="(step, i) in steps" :key="step.id">
            <button
                :disabled="!canVisit(i)"
                :aria-current="i === index ? 'step' : undefined"
                @click="visit(i)"
                class="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-left transition-colors"
                :class="i === index ? 'bg-hover' : canVisit(i) ? 'hover:bg-hover/60' : 'cursor-default'"
            >
              <span
                  class="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[11.5px] font-bold shrink-0 border tabular-nums"
                  :class="stepBadgeClass(step.id, i)"
              >
                <TriangleAlert v-if="step.id === 'client' && context.clientSkipped && i !== index" :size="12" />
                <Check v-else-if="i < reached && i !== index" :size="13" :stroke-width="2.5" />
                <template v-else>{{ i + 1 }}</template>
              </span>
              <span class="flex flex-col min-w-0">
                <span class="text-body truncate" :class="i === index ? 'text-primary font-semibold' : canVisit(i) ? 'text-secondary' : 'text-muted'">
                  {{ step.label }}
                </span>
                <span class="text-xs text-muted truncate">{{ step.hint }}</span>
              </span>
            </button>
          </li>
        </ol>
      </nav>

      <p class="hidden md:block px-5 py-4 text-xs text-muted border-t border-card leading-relaxed">
        Tout reste modifiable ensuite dans les Paramètres.
      </p>
    </aside>

    <!-- Contenu -->
    <main class="flex-1 min-w-0">
      <div v-if="!loaded" class="flex items-center justify-center py-32">
        <div class="w-4 h-4 border border-border border-t-accent rounded-full animate-spin" />
      </div>

      <div v-else class="max-w-[720px] mx-auto px-4 md:px-10 pt-7 md:pt-12 pb-16 flex flex-col gap-7">
        <header class="flex flex-col gap-1.5">
          <p class="tag-label text-accent">
            Étape {{ index + 1 }} sur {{ steps.length }}<template v-if="current.optional"> · facultative</template>
          </p>
          <h1 ref="titleRef" tabindex="-1" class="page-title outline-none">{{ current.title }}</h1>
          <p class="text-body text-muted leading-relaxed">{{ current.description }}</p>
        </header>

        <component
            :is="current.component"
            ref="stepRef"
            :key="current.id"
            :settings="settings"
            :is-docker="isDocker"
            :default-path="defaultPath"
        />

        <footer v-if="current.id !== 'recap'" class="flex items-center gap-2.5 pt-6 border-t border-hover">
          <button v-if="index > 0" @click="visit(index - 1)" :disabled="busy" class="btn-ghost">
            <ArrowLeft :size="15" /> Précédent
          </button>
          <div class="flex-1" />
          <button v-if="current.optional" @click="next(false)" :disabled="busy" class="text-body text-muted hover:text-primary transition-colors px-2">
            Passer
          </button>
          <button @click="next(true)" :disabled="busy" class="btn-primary">
            {{ busy ? '…' : index === 0 ? 'Commencer' : 'Suivant' }}
            <ArrowRight v-if="!busy" :size="15" />
          </button>
        </footer>
      </div>
    </main>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, provide, nextTick, onMounted, type Component } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, ArrowRight, Check, LogOut, TriangleAlert, X } from 'lucide-vue-next'
import FankarrLogo from '@/components/FankarrLogo.vue'
import SetupWelcomeStep from '@/components/setup/SetupWelcomeStep.vue'
import SetupPathsStep from '@/components/setup/SetupPathsStep.vue'
import SetupClientStep from '@/components/setup/SetupClientStep.vue'
import SetupImportStep from '@/components/setup/SetupImportStep.vue'
import SetupMediaServerStep from '@/components/setup/SetupMediaServerStep.vue'
import SetupCatalogStep from '@/components/setup/SetupCatalogStep.vue'
import SetupRecapStep from '@/components/setup/SetupRecapStep.vue'
import { setupContextKey, type SetupContext, type SetupSettings, type SetupStepId } from '@/components/setup/setup'
import { useAuthStore } from '@/stores/auth'
import { useTourStore } from '@/stores/tour'
import { useToast } from '@/composables/useToast'

interface StepDef {
  id         : SetupStepId
  label      : string
  hint       : string
  title      : string
  description: string
  component  : Component
  optional?  : boolean
}

const steps: StepDef[] = [
  {
    id: 'welcome', label: 'Bienvenue', hint: 'Ce qui vous attend', component: SetupWelcomeStep,
    title: 'Bienvenue dans FanKarr',
    description: 'Quelques minutes pour préparer FanKarr : où ranger vos séries, quel client torrent utiliser et comment les retrouver dans votre lecteur.',
  },
  {
    id: 'paths', label: 'Dossiers', hint: 'Téléchargements et médiathèque', component: SetupPathsStep,
    title: 'Dossiers et mode d\'import',
    description: 'Indiquez où arrivent les téléchargements terminés et où FanKarr doit ranger vos séries.',
  },
  {
    id: 'client', label: 'Client torrent', hint: 'qBittorrent, Transmission…', component: SetupClientStep,
    title: 'Client de téléchargement',
    description: 'FanKarr envoie les torrents à votre client puis surveille leur progression pour les importer.',
  },
  {
    id: 'import', label: 'Import', hint: 'Automatisme et nommage', component: SetupImportStep,
    title: 'Options d\'import',
    description: 'Réglez ce qui se passe quand un téléchargement se termine.',
  },
  {
    id: 'media-server', label: 'Serveur multimédia', hint: 'Jellyfin, Plex', component: SetupMediaServerStep, optional: true,
    title: 'Jellyfin et Plex',
    description: 'Connectez votre serveur multimédia pour y retrouver vos séries. Vous pouvez passer cette étape.',
  },
  {
    id: 'catalog', label: 'Catalogue', hint: 'Séries Fankai', component: SetupCatalogStep,
    title: 'Catalogue Fankai',
    description: 'Le catalogue liste toutes les séries Fankai et leurs torrents. Il se met à jour tout seul ensuite.',
  },
  {
    id: 'recap', label: 'Récapitulatif', hint: 'Vérifier et terminer', component: SetupRecapStep,
    title: 'Tout est prêt ?',
    description: 'Vérifiez la configuration avant de commencer. Chaque point reste modifiable.',
  },
]

const router = useRouter()
const auth   = useAuthStore()
const tour   = useTourStore()
const { add: toast } = useToast()

const loaded      = ref(false)
const busy        = ref(false)
const index       = ref(0)
const reached     = ref(0)
const isDocker    = ref(false)
const defaultPath = ref('/')
const titleRef    = ref<HTMLElement | null>(null)
const stepRef     = ref<{ submit?: () => Promise<boolean> } | null>(null)

const settings = reactive<SetupSettings>({
  mediaPath          : '',
  completePath       : '',
  organizeMode       : 'hardlink',
  nfoSupport         : false,
  autoImport         : true,
  deleteTorrentOnMove: false,
  autoUnimportMissing: false,
  englishDirectory   : false,
})

const context = reactive<SetupContext>({
  relaunch     : false,
  clientSkipped: false,
  plexOpened   : false,
  goto  : (id) => visit(steps.findIndex(s => s.id === id)),
  finish: finish,
})
provide(setupContextKey, context)

const current = computed(() => steps[index.value]!)

function canVisit(i: number) {
  return i !== index.value && (context.relaunch || i <= reached.value)
}

function stepBadgeClass(id: SetupStepId, i: number) {
  if (i === index.value) return 'border-accent text-accent bg-accent-muted'
  if (id === 'client' && context.clientSkipped) return 'border-accent/40 text-accent'
  if (i < reached.value) return 'border-ok/40 text-ok'
  return 'border-border text-muted'
}

async function refreshSettings() {
  const res = await fetch('/api/settings', { credentials: 'include' })
  if (!res.ok) return
  const data = await res.json()
  for (const key of Object.keys(settings) as (keyof SetupSettings)[]) {
    if (data[key] !== undefined) (settings as any)[key] = data[key]
  }
}

async function focusTitle() {
  await nextTick()
  window.scrollTo({ top: 0 })
  titleRef.value?.focus()
}

function visit(i: number) {
  if (i < 0 || i >= steps.length || busy.value) return
  index.value = i
  focusTitle()
}

async function next(submit: boolean) {
  busy.value = true
  try {
    if (submit && stepRef.value?.submit && !(await stepRef.value.submit())) return
    await refreshSettings()

    const target = index.value + 1
    if (target > reached.value) {
      reached.value = target
      fetch('/api/settings/onboarding', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ step: steps[target]!.id }),
      }).catch(() => {})
    }
    index.value = target
    focusTitle()
  } finally {
    busy.value = false
  }
}

async function finish(withTour: boolean) {
  if (!context.relaunch && !(await auth.completeOnboarding())) {
    toast('Impossible de terminer la configuration', 'error')
    return
  }
  if (withTour) {
    tour.start()
    await router.push('/dashboard')
  } else {
    if (!auth.tourSeen) auth.markTourSeen()
    await router.push(context.relaunch ? '/settings/advanced' : '/dashboard')
  }
}

function close() {
  router.push('/settings/advanced')
}

async function logout() {
  await auth.logout()
  router.push('/auth')
}

onMounted(async () => {
  const [onboardingRes, systemRes, infoRes] = await Promise.all([
    fetch('/api/settings/onboarding', { credentials: 'include' }),
    fetch('/api/system',              { credentials: 'include' }),
    fetch('/api/system/info',         { credentials: 'include' }),
    refreshSettings(),
  ])
  if (systemRes.ok) isDocker.value    = (await systemRes.json()).isDocker
  if (infoRes.ok)   defaultPath.value = (await infoRes.json()).defaultPath ?? '/'
  if (onboardingRes.ok) {
    const { step, completedAt } = await onboardingRes.json()
    if (completedAt) {
      context.relaunch     = true
      auth.onboardingDone  = true
      reached.value        = steps.length - 1
    } else {
      const i = steps.findIndex(s => s.id === step)
      reached.value = Math.max(0, i)
      index.value   = reached.value
    }
  }
  loaded.value = true
})
</script>
