<template>
  <aside class="flex flex-col h-full bg-sidebar border-r border-border">

    <!-- Logo + logout -->
    <div class="flex items-center gap-2.5 px-4 py-3.5 border-b border-border min-h-[56px]">
      <svg class="w-7 h-7 shrink-0" viewBox="0 0 130 135" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path fill="var(--gold)" d="m113.85,12.8c-1.94,3.57-3.8,7.09-5.76,10.55-3.6,6.35-7.31,12.65-10.9,19.01-1.69,3-3.22,6.08-4.44,9.49,3.25-2.46,6.44-5.03,9.78-7.36,2.92-2.04,5.95-3.96,9.07-5.67,8.59-4.72,19.29-1.78,24.4,6.54.42.68,1.3,1.16,1.52,1.87.26.83.05,2.62,0,2.62-3.94.13-3.45,5.79-7.59,5.89-3.46.08-6.9,1.25-10.37,1.37-6.78.25-13.48.64-19.32,4.57-1.91,1.29-3.5,3.05-4.97,4.36.21.86.19,1.13.3,1.2,4.42,2.7,8.79,5.49,13.31,8,2.11,1.17,3.66,3.77,2.82,6.63-1.18,3.97-2.64,7.86-4.04,11.76-.48,1.33-1.11,2.61-1.88,4.41,5.87,2.14,11.63,4.26,17.41,6.35,3.43,1.24,6.86,2.47,10.31,3.65,7.38,2.52,9.16,9.54,11.52,15.53,1.04,2.65-.75,6.75-2.11,9.81-.46,1.04-3.53,1.22-5.42,1.26-1.78.03-3.57-.64-4.46-.83-5.97-8.4-11.54-15.98-23.28-14.7.1-.32.21-.65.31-.97,2.32-.52,4.64-1.05,6.97-1.57.03-.22.06-.45.09-.67-2.97-1.18-5.94-2.37-8.92-3.52-1.33-.52-2.7-.93-4.03-1.45-4.83-1.9-4.79-1.89-8.26,2.27-4.31,5.17-10.22,8.13-16.3,11.01.69-.84,1.31-1.75,2.1-2.48.76-.71,1.69-1.22,2.26-2.29-4.9,1.87-9.81,3.74-14.71,5.61-.13-.22-.26-.45-.39-.67.86-.62,1.72-1.24,2.58-1.85-.04-.17-.08-.34-.12-.51-2.94.65-5.93,1.11-8.8,2-4.18,1.29-8.27,2.87-12.38,4.38-2.59.95-5.12,1.51-7.19-.14,11.84-9.4,25.16-17.2,36.59-28.93-4.21-3.65-8.1-7.01-11.98-10.38.15-.43.3-.87.45-1.3,1.61-.09,3.3-.55,4.81-.21,4.14.92,8.21,2.18,12.66,3.4,3.58-6.6,7.1-13.29,7.3-20.58-6.68-2.65-9.79,4.13-15.7,5.76,2.55-2.92,4.54-5.19,6.52-7.46-.2-.17-.39-.33-.59-.5-5.58,4.28-16.89,16.06-24.16,29.07-.19-.29-.37-.59-.55-.87-.81,1.46-1.57,2.83-2.33,4.21l-1.04-.35c1.58-5.71,2.86-11.53,4.81-17.11,2.67-7.67,6.32-15.02,8.71-22.76,4.87-15.8,13.75-29.67,20.7-44.45.65-1.38,1.28-2.77,1.88-4.17,1.58-3.68,3.97-7.37-.47-11.13.3-.16.59-.33.89-.49,7.13,4.08,14.25,8.15,22.38,12.8Z"/>
        <path fill="var(--gold)" d="m7.03,71.72c.25-.48.39-1.21.77-1.38,1.1-.49,2.62-1.38,3.41-.98,2.58,1.28,4.8.38,7.06-.48,2.76-1.04,5.57-2.05,8.14-3.47,1.22-.67,2.63-2.19,2.77-3.46,1.03-9.65,3.6-18.83,7.54-27.67.24-.53.3-1.14-.17-2.03-1.01,1.63-1.78,3.49-3.08,4.85-2.08,2.21-4.42,4.2-6.82,6.07-1.39,1.09-3.02,2.05-4.7,2.54-1.31.39-3.26.51-4.24-.2-4.32-3.13-8.38-6.6-12.71-10.09,2.03-2.48,3.73-4.2,7.18-3.5,1.74.36,4.04-.43,5.67-1.4,5.43-3.21,10.65-6.79,16.01-10.13,5.58-3.48,11.45-3.46,17.13-.53,4.5,2.32,8.73,5.19,13.03,7.9,1.47.93,2.35,2.23,1.34,4.11-2.08,3.88-4.01,7.85-6.22,11.66-1.95,3.37-4.2,6.56-6.47,10.06,2.04.96,3.78,1.67,5.4,2.58,2.25,1.27,3.25,3.24,2.97,5.87-.33,3.15-1.59,5.64-4.68,6.84-.84.33-1.83.72-2.65.56-5.8-1.1-9.79,2.93-14.43,5.04-1.2.54-2.19,1.83-2.95,2.99-3.3,5.08-8.83,6.7-13.83,9.17-.53.26-1.22.74-1.34,1.24-1.76,7.82-3.45,15.65-4.58,24.09,4.1-2.32,8.19-4.65,12.29-6.97.12.15.23.31.35.46-1.05,1.17-2.1,2.34-3.15,3.52l.5.66c5.73-2.61,10.97-5.98,15.24-10.87.28.22.57.43.85.65-1.83,3.39-3.78,6.72-5.44,10.2-.95,1.99-1.38,4.21-2.13,6.3-.48,1.33-.84,2.82-1.71,3.86-2.61,3.13-5.46,6.06-8.19,9.09-.45.5-.76,1.12-1.14,1.68-.66.99-1.21,2.09-2.02,2.94-.39.41-1.58.71-1.85.46-2.26-2.14-5.5,2.25-7.78-1.52-1.9-3.13-5.35-5.33-7.23-8.47-2.37-3.95-5.75-7.84-5.14-12.85.51-4.17,2.16-8.18,2.89-12.34,1.43-8.11,2.6-16.27,3.82-24.42.14-.95-.11-1.95-.19-2.93.14.09.29.17.43.26Z"/>
      </svg>
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

    <!-- Version actuelle -->
    <div class="px-3 pb-1 pt-0.5">
      <p class="text-[10px] text-muted/50 font-mono">{{ currentVersion }}</p>
    </div>

    <!-- Thème -->
    <ThemeSwitcher />

  </aside>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { LogOut } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import SidebarNavItem from './SidebarNavItem.vue'
import ThemeSwitcher from './ThemeSwitcher.vue'
import type { NavItem } from '@/types/nav'

defineProps<{ items: NavItem[] }>()

const router = useRouter()
const auth   = useAuthStore()

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