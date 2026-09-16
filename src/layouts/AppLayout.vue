<template>
  <div class="flex h-dvh bg-main overflow-hidden">

    <div class="hidden md:flex w-[232px] shrink-0">
      <SidebarNav :items="navItems" class="w-full" />
    </div>

    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <MobileHeader v-if="showMobileHeader" class="md:hidden" />

      <main id="main-scroll" class="flex-1 overflow-y-auto bg-main">
        <RouterView v-slot="{ Component }">
          <keep-alive include="SeriesView">
            <component :is="Component" class="h-full" />
          </keep-alive>
        </RouterView>
      </main>

      <MobileTabBar :items="tabItems" class="md:hidden" />
    </div>

    <TourOverlay />
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useEventListener } from '@vueuse/core'
import { Activity, House, Inbox, Settings, Tv, User } from 'lucide-vue-next'
import SidebarNav from '@/components/nav/SidebarNav.vue'
import MobileHeader from '@/components/nav/MobileHeader.vue'
import MobileTabBar from '@/components/nav/MobileTabBar.vue'
import TourOverlay from '@/components/tour/TourOverlay.vue'
import { useDownloadsStore } from '@/stores/downloads'
import { useRequestsStore }  from '@/stores/requests'
import { useAuthStore }      from '@/stores/auth'
import { useTourStore }      from '@/stores/tour'
import { useLibrarySearch }  from '@/composables/useLibrarySearch'
import type { NavItem } from '@/types/nav'

const route      = useRoute()
const dlStore    = useDownloadsStore()
const reqStore   = useRequestsStore()
const auth       = useAuthStore()
const tour       = useTourStore()
const librarySearch = useLibrarySearch()

// Ctrl K : El recherchor
useEventListener(window, 'keydown', (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && !tour.active) {
    e.preventDefault()
    librarySearch.open()
  }
})

// Visite guidée auto : une fois par session, après l'assistant pour un admin
let tourAutoStarted = false
watch(() => [auth.loggedIn, auth.tourSeen, auth.onboardingDone], () => {
  if (tourAutoStarted || tour.active) return
  if (auth.loggedIn && !auth.tourSeen && (!auth.isAdmin || auth.onboardingDone)) {
    tourAutoStarted = true
    tour.start()
  }
}, { immediate: true })

let pendingTimer: ReturnType<typeof setInterval> | null = null
let downloadsTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  reqStore.refreshPending()
  pendingTimer = setInterval(reqStore.refreshPending, 30_000)
  if (auth.isAdmin) {
    dlStore.refresh()
    downloadsTimer = setInterval(dlStore.refresh, 60_000)
  }
})

onUnmounted(() => {
  if (pendingTimer) clearInterval(pendingTimer)
  if (downloadsTimer) clearInterval(downloadsTimer)
})

watch(() => route.path, () => reqStore.refreshPending())

const showMobileHeader = computed(() => route.path === '/dashboard' || route.path.startsWith('/settings'))

const navItems = computed<NavItem[]>(() => {
  const items: NavItem[] = [
    { label: 'Accueil',     icon: House, to: '/dashboard', tour: 'nav-dashboard' },
    { label: 'Médiathèque', icon: Tv,    to: '/series',    tour: 'nav-series' },
    {
      label: auth.isAdmin ? 'Demandes' : 'Mes demandes',
      icon : Inbox,
      to   : '/requests',
      tour : 'nav-requests',
      badge: reqStore.pendingCount || undefined,
    },
  ]

  if (auth.isAdmin) {
    items.push({
      label     : 'Activité',
      icon      : Activity,
      to        : '/activity',
      tour      : 'nav-activity',
      badge     : dlStore.activeCount || undefined,
      badgeStyle: 'dot',
    })
  }

  items.push({ separator: true })

  items.push(auth.isAdmin
    ? { label: 'Paramètres', icon: Settings, to: '/settings',         tour: 'nav-settings' }
    : { label: 'Mon profil', icon: User,     to: '/settings/profile', tour: 'nav-settings' })

  return items
})

const tabItems = computed(() => navItems.value.filter(i => !i.separator && !(auth.isAdmin && i.to === '/settings')))
</script>
