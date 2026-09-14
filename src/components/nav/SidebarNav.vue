<template>
  <aside class="flex flex-col h-full bg-sidebar border-r border-border">

    <!-- Logo + logout -->
    <div class="flex items-center gap-2.5 px-4 py-3.5 border-b border-border min-h-[56px]">
      <FankarrLogo class="w-7 h-7 shrink-0" />
      <RouterLink to="/series" class="text-[15px] font-semibold text-primary tracking-wide flex-1 hover:text-accent transition-colors">
        FanKarr
      </RouterLink>
      <button
          @click="logout"
          title="Se déconnecter"
          class="text-muted hover:text-red-400 transition-colors p-1 rounded-md hover:bg-hover"
      >
        <LogOut :size="15" />
      </button>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 flex flex-col gap-0.5">
      <template v-for="(item, i) in items" :key="i">
        <hr v-if="item.separator" class="border-border my-2 mx-1" />
        <SidebarNavItem v-else :item="item" />
      </template>
    </nav>

    <!-- Nouvelle version disponible -->
    <a
        v-if="updateAvailable"
        :href="latestReleaseUrl"
        target="_blank"
        rel="noopener"
        class="mx-2 mb-2 flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-accent/30 bg-accent/5 hover:bg-accent/10 transition-colors group"
    >
      <div class="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shrink-0" />
      <div class="flex-1 min-w-0">
        <p class="text-xs font-medium text-accent">Mise à jour disponible</p>
        <p class="text-[11px] text-muted truncate">{{ latestVersion }} est disponible</p>
      </div>
      <svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none"
           class="shrink-0 text-muted group-hover:text-accent transition-colors">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
        <polyline points="15 3 21 3 21 9"/>
        <line x1="10" y1="14" x2="21" y2="3"/>
      </svg>
    </a>

    <!-- Version actuelle + aide -->
    <div class="px-3 pb-1 pt-0.5 flex items-center justify-between gap-2">
      <p class="text-[10px] text-muted/50 font-mono">{{ currentVersion }}</p>
      <div ref="helpRef" class="relative">
        <button
            data-tour="help"
            @click="helpOpen = !helpOpen"
            aria-haspopup="menu"
            :aria-expanded="helpOpen"
            title="Aide"
            class="text-muted hover:text-primary transition-colors p-1 rounded-md hover:bg-hover"
        >
          <CircleQuestionMark :size="15" />
        </button>
        <div
            v-if="helpOpen"
            role="menu"
            class="absolute bottom-full right-0 mb-1 w-52 bg-card border border-border rounded-lg shadow-xl p-1 z-20 flex flex-col"
            @keydown.esc="helpOpen = false"
        >
          <button role="menuitem" @click="startTour" class="flex items-center gap-2 px-2.5 py-2 rounded-md text-xs text-secondary hover:bg-hover hover:text-primary text-left">
            <Compass :size="14" class="shrink-0" /> Visite guidée
          </button>
          <button v-if="auth.isAdmin" role="menuitem" @click="openSetup" class="flex items-center gap-2 px-2.5 py-2 rounded-md text-xs text-secondary hover:bg-hover hover:text-primary text-left">
            <Wand :size="14" class="shrink-0" /> Assistant de configuration
          </button>
        </div>
      </div>
    </div>

    <!-- Thème -->
    <ThemeSwitcher />

  </aside>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { onClickOutside } from '@vueuse/core'
import { CircleQuestionMark, Compass, LogOut, Wand } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useTourStore } from '@/stores/tour'
import SidebarNavItem from './SidebarNavItem.vue'
import ThemeSwitcher from './ThemeSwitcher.vue'
import FankarrLogo from '@/components/FankarrLogo.vue'
import type { NavItem } from '@/types/nav'

defineProps<{ items: NavItem[] }>()

const router = useRouter()
const auth   = useAuthStore()
const tour   = useTourStore()

const helpOpen = ref(false)
const helpRef  = ref<HTMLElement | null>(null)
onClickOutside(helpRef, () => { helpOpen.value = false })

function startTour() {
  helpOpen.value = false
  tour.start()
}

function openSetup() {
  helpOpen.value = false
  router.push('/setup')
}

const currentVersion = ref(
    import.meta.env.DEV ? 'dev' : ''
)
const latestVersion     = ref('')
const latestReleaseUrl  = ref('https://github.com/masutayunikon/FanKarr/releases/latest')
const updateAvailable   = ref(false)

const GITHUB_REPO = 'masutayunikon/FanKarr'

function parseVersion(v: string): number[] {
  return v.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0)
}

function isNewer(latest: string, current: string): boolean {
  if (current === 'dev') return false
  const l = parseVersion(latest)
  const c = parseVersion(current)
  for (let i = 0; i < Math.max(l.length, c.length); i++) {
    const lv = l[i] ?? 0
    const cv = c[i] ?? 0
    if (lv > cv) return true
    if (lv < cv) return false
  }
  return false
}

async function checkForUpdates() {
  try {
    // Version locale
    const vRes = await fetch('/api/version', { credentials: 'include' })
    if (vRes.ok) {
      const { version } = await vRes.json()
      currentVersion.value = version
    }

    if (currentVersion.value === 'dev') return

    // Dernière release GitHub
    const gRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github.v3+json' },
    })
    if (!gRes.ok) return
    const release = await gRes.json()
    latestVersion.value    = release.tag_name ?? ''
    latestReleaseUrl.value = release.html_url ?? latestReleaseUrl.value

    if (isNewer(latestVersion.value, currentVersion.value)) {
      updateAvailable.value = true
    }
  } catch {}
}

async function logout() {
  await auth.logout()
  router.push('/auth')
}

onMounted(() => {
  checkForUpdates()
  // Revérifier toutes les 6h
  setInterval(checkForUpdates, 6 * 60 * 60 * 1000)
})
</script>