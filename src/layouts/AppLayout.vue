<template>
  <div class="flex h-screen bg-shell overflow-hidden">

    <div class="hidden md:flex w-56 shrink-0">
      <SidebarNav :items="navItems" class="w-full" />
    </div>

    <Transition name="fade">
      <div v-if="mobileOpen" class="fixed inset-0 bg-black/60 z-40 md:hidden" @click="mobileOpen = false" />
    </Transition>

    <Transition name="slide-left">
      <div v-if="mobileOpen" class="fixed top-0 left-0 h-full w-56 z-50 md:hidden">
        <SidebarNav :items="navItems" class="w-full" />
      </div>
    </Transition>

    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <header class="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-sidebar shrink-0 relative z-10">
        <button @click="mobileOpen = true" class="text-muted hover:text-primary transition-colors">
          <Menu :size="20" />
        </button>
        <span class="text-sm font-medium text-primary">FanKarr</span>
      </header>

      <main id="main-scroll" class="flex-1 overflow-y-auto bg-main">
        <RouterView v-slot="{ Component }">
          <keep-alive include="SeriesView">
            <component :is="Component" class="h-full" />
          </keep-alive>
        </RouterView>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Menu } from 'lucide-vue-next'
import SidebarNav from '@/components/nav/SidebarNav.vue'
import { useDownloadsStore } from '@/stores/downloads'
import { useAuthStore }      from '@/stores/auth'
import type { NavItem } from '@/types/nav'

const mobileOpen = ref(false)
const dlStore    = useDownloadsStore()
const auth       = useAuthStore()

const navItems = computed<NavItem[]>(() => {
  const items: NavItem[] = [
    {
      label: 'Dashboard',
      icon : 'LayoutDashboard',
      to   : '/dashboard',
    },
    {
      label   : 'Médiathèque',
      icon    : 'Tv',
      to      : '/series',
      children: [
        { label: 'Séries', to: '/series' },
      ],
    },
    {
      label: 'Demandes',
      icon : 'ClipboardList',
      to   : '/requests',
    },
  ]

  if (auth.isAdmin) {
    items.push({
      label: 'Activité',
      icon : 'Activity',
      to   : '/activity',
      badge: dlStore.activeCount > 0 ? dlStore.activeCount : undefined,
    })
  }

  items.push({ separator: true })

  const settingsChildren: NavItem[] = [
    { label: 'Mon profil', to: '/settings/profile' },
  ]
  if (auth.isAdmin) {
    settingsChildren.push(
      { label: 'Clients de téléchargement', to: '/settings/download-client' },
      { label: 'Gestion des médias',        to: '/settings/media-management' },
      { label: 'Management des séries',     to: '/settings/import-management' },
      { label: 'Catalogue Fankai',          to: '/settings/catalogue' },
      { label: 'Journaux',                  to: '/settings/logs' },
      { label: 'Avancé',                    to: '/settings/advanced' },
      { label: 'Utilisateurs',              to: '/settings/users' },
      { label: 'Jellyfin & API',            to: '/settings/jellyfin' },
    )
  }

  items.push({
    label   : 'Paramètres',
    icon    : 'Settings',
    to      : '/settings',
    children: settingsChildren,
  })

  return items
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-left-enter-active, .slide-left-leave-active { transition: transform 0.25s ease; }
.slide-left-enter-from, .slide-left-leave-to { transform: translateX(-100%); }
</style>