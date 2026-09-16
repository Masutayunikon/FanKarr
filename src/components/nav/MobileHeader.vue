<template>
  <header class="flex items-center gap-1 pl-4 pr-2 h-14 shrink-0 bg-main">
    <RouterLink to="/dashboard" class="flex-1 min-w-0 flex items-center gap-2.5">
      <FankarrLogo class="w-6 h-[25px] shrink-0" />
      <span class="font-display text-xl font-bold tracking-[0.01em] text-primary">FanKarr</span>
    </RouterLink>

    <button
        @click="librarySearch.open()"
        aria-label="Rechercher une série"
        class="w-11 h-11 rounded-full flex items-center justify-center text-secondary hover:text-primary transition-colors"
    >
      <Search :size="19" :stroke-width="1.75" />
    </button>

    <div ref="menuRef" class="relative">
      <button
          data-tour="help"
          @click="open = !open"
          aria-label="Menu du compte"
          aria-haspopup="menu"
          :aria-expanded="open"
          class="relative w-11 h-11 rounded-full flex items-center justify-center"
      >
        <span class="w-[34px] h-[34px] rounded-full bg-card border border-border text-accent font-display text-base font-bold flex items-center justify-center">
          {{ initial }}
        </span>
        <span v-if="auth.isAdmin && updateAvailable" class="absolute top-[7px] right-[7px] w-2 h-2 rounded-full bg-accent ring-2 ring-main" />
      </button>

      <div v-if="open" role="menu" class="menu absolute top-full right-0 mt-1 w-64 z-40" @keydown.esc="open = false">
        <div class="flex flex-col gap-px px-3 pt-2 pb-2.5 mb-1 border-b border-hover">
          <span class="text-body font-medium text-primary truncate">{{ auth.username }}</span>
          <span class="text-meta text-muted truncate">{{ auth.isAdmin ? 'Administrateur' : 'Invité' }}<template v-if="currentVersion"> · {{ currentVersion }}</template></span>
        </div>

        <RouterLink v-if="auth.isAdmin" to="/settings" role="menuitem" class="menu-item" @click="open = false">
          <Settings :size="15" class="shrink-0" /> Paramètres
        </RouterLink>
        <button role="menuitem" class="menu-item" @click="startTour">
          <Compass :size="15" class="shrink-0" /> Visite guidée
        </button>
        <button v-if="auth.isAdmin" role="menuitem" class="menu-item" @click="openSetup">
          <Wand :size="15" class="shrink-0" /> Assistant de configuration
        </button>
        <a
            v-if="auth.isAdmin && updateAvailable"
            :href="latestReleaseUrl"
            target="_blank"
            rel="noopener"
            role="menuitem"
            class="menu-item text-accent hover:text-accent"
            @click="open = false"
        >
          <ExternalLink :size="15" class="shrink-0" /> Mise à jour {{ latestVersion }}
        </a>

        <div class="h-px bg-hover my-1" />
        <button role="menuitem" class="menu-item text-err hover:text-err" @click="logout">
          <LogOut :size="15" class="shrink-0" /> Se déconnecter
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { onClickOutside } from '@vueuse/core'
import { Compass, ExternalLink, LogOut, Search, Settings, Wand } from 'lucide-vue-next'
import FankarrLogo from '@/components/FankarrLogo.vue'
import { useAuthStore } from '@/stores/auth'
import { useTourStore } from '@/stores/tour'
import { useLibrarySearch } from '@/composables/useLibrarySearch'
import { useUpdateCheck } from '@/composables/useUpdateCheck'

const router        = useRouter()
const auth          = useAuthStore()
const tour          = useTourStore()
const librarySearch = useLibrarySearch()

const { currentVersion, latestVersion, latestReleaseUrl, updateAvailable } = useUpdateCheck()

const initial = computed(() => auth.username?.charAt(0).toUpperCase() ?? '?')

const open    = ref(false)
const menuRef = ref<HTMLElement | null>(null)
onClickOutside(menuRef, () => { open.value = false })

function startTour() {
  open.value = false
  tour.start()
}

function openSetup() {
  open.value = false
  router.push('/setup')
}

async function logout() {
  open.value = false
  await auth.logout()
  router.push('/auth')
}
</script>
