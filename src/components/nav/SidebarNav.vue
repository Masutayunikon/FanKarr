<template>
  <aside class="flex flex-col h-full bg-sidebar border-r border-card px-3.5 pt-[22px] pb-[18px]">

    <div class="flex items-center gap-2 pl-2 pb-7">
      <RouterLink to="/dashboard" class="flex-1 min-w-0 flex items-center gap-[11px]">
        <FankarrLogo class="w-[30px] h-[31px] shrink-0" />
        <span class="font-display text-[23px] font-bold tracking-[0.01em] text-primary">FanKarr</span>
      </RouterLink>
      <div ref="helpRef" class="relative">
        <button
            data-tour="help"
            @click="helpOpen = !helpOpen"
            aria-haspopup="menu"
            :aria-expanded="helpOpen"
            title="Aide"
            class="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-primary hover:bg-hover transition-colors"
        >
          <CircleQuestionMark :size="16" :stroke-width="1.75" />
        </button>
        <div
            v-if="helpOpen"
            role="menu"
            class="menu absolute top-full left-0 mt-2 w-60 z-30"
            @keydown.esc="helpOpen = false"
        >
          <button role="menuitem" @click="startTour" class="menu-item">
            <Compass :size="15" class="shrink-0" /> Visite guidée
          </button>
          <button v-if="auth.isAdmin" role="menuitem" @click="openSetup" class="menu-item">
            <Wand :size="15" class="shrink-0" /> Assistant de configuration
          </button>
        </div>
      </div>
    </div>

    <nav class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col gap-0.5">
      <template v-for="(item, i) in items" :key="i">
        <div v-if="item.separator" class="h-px bg-card mx-2 my-3.5 shrink-0" />
        <SidebarNavItem v-else :item="item" />
      </template>
    </nav>

    <!-- Nouvelle version disponible -->
    <a
        v-if="auth.isAdmin && updateAvailable"
        :href="latestReleaseUrl"
        target="_blank"
        rel="noopener"
        class="mb-3 flex items-center gap-2.5 px-3 py-2.5 rounded-field bg-accent-muted hover:bg-accent/20 transition-colors group"
    >
      <span class="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shrink-0" />
      <span class="flex-1 min-w-0">
        <span class="block text-meta font-bold text-accent">Mise à jour disponible</span>
        <span class="block text-[11.5px] text-muted truncate">{{ latestVersion }} est disponible</span>
      </span>
      <ExternalLink :size="13" class="shrink-0 text-muted group-hover:text-accent transition-colors" />
    </a>

    <!-- Utilisateur et déconnexion -->
    <div class="flex items-center gap-2 pl-2 pt-3.5 border-t border-card">
      <span class="w-[34px] h-[34px] rounded-full bg-hover text-accent flex items-center justify-center font-display text-base font-bold shrink-0">
        {{ initial }}
      </span>
      <span class="flex-1 min-w-0 flex flex-col gap-px">
        <span class="text-[13px] font-medium text-primary truncate">{{ auth.username }}</span>
        <span class="text-[11.5px] text-muted truncate">{{ auth.isAdmin ? 'Administrateur' : 'Invité' }}<template v-if="currentVersion"> · {{ currentVersion }}</template></span>
      </span>
      <button
          @click="logout"
          title="Se déconnecter"
          class="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-muted hover:text-err hover:bg-hover transition-colors"
      >
        <LogOut :size="16" :stroke-width="1.75" />
      </button>
    </div>

  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { onClickOutside } from '@vueuse/core'
import { CircleQuestionMark, Compass, ExternalLink, LogOut, Wand } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useTourStore } from '@/stores/tour'
import { useUpdateCheck } from '@/composables/useUpdateCheck'
import SidebarNavItem from './SidebarNavItem.vue'
import FankarrLogo from '@/components/FankarrLogo.vue'
import type { NavItem } from '@/types/nav'

defineProps<{ items: NavItem[] }>()

const router = useRouter()
const auth   = useAuthStore()
const tour   = useTourStore()

const initial = computed(() => auth.username?.charAt(0).toUpperCase() ?? '?')

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

const { currentVersion, latestVersion, latestReleaseUrl, updateAvailable } = useUpdateCheck()

async function logout() {
  await auth.logout()
  router.push('/auth')
}
</script>
