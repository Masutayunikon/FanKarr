<template>
  <div class="flex flex-col md:flex-row min-h-full">

    <nav
        v-if="groups.length > 1"
        ref="navRef"
        data-tour="settings-menu"
        class="md:w-[236px] shrink-0 md:sticky md:top-0 md:self-start md:h-screen md:overflow-y-auto border-b md:border-b-0 md:border-r border-card
               px-4 md:px-3.5 py-4 md:py-[26px] flex md:flex-col gap-1 md:gap-[18px] overflow-x-auto"
    >
      <h1 class="hidden md:block font-display text-2xl font-bold text-primary ml-2.5">Paramètres</h1>
      <div v-for="group in groups" :key="group.label" class="flex md:flex-col gap-1 md:gap-0.5 shrink-0">
        <span class="hidden md:block tag-label px-2.5 pb-2">{{ group.label }}</span>
        <RouterLink
            v-for="link in group.links"
            :key="link.to"
            :to="link.to"
            class="flex items-center h-9 pointer-coarse:h-10 px-2.5 rounded-lg text-body whitespace-nowrap transition-colors"
            :class="route.path === link.to ? 'bg-hover text-primary font-semibold' : 'text-secondary hover:text-primary hover:bg-hover/60'"
        >
          {{ link.label }}
        </RouterLink>
      </div>
    </nav>

    <div class="flex-1 min-w-0 px-4 md:px-10 pt-[26px] pb-16">
      <div class="max-w-[960px] flex flex-col gap-5">
        <header class="flex items-end justify-between gap-5 flex-wrap">
          <div class="flex flex-col gap-1 min-w-0">
            <h2 class="font-display text-[26px] font-bold text-primary leading-tight">{{ page.title }}</h2>
            <p v-if="page.description" class="text-body text-muted">{{ page.description }}</p>
          </div>
          <div id="settings-actions" class="flex items-center gap-2.5 empty:hidden" />
        </header>
        <RouterView />
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route  = useRoute()
const auth   = useAuthStore()
const navRef = ref<HTMLElement | null>(null)

watch(() => route.path, async () => {
  await nextTick()
  const nav = navRef.value
  if (!nav || nav.scrollWidth <= nav.clientWidth) return
  nav.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ inline: 'center', block: 'nearest' })
}, { immediate: true })

const pages: Record<string, { title: string; description: string }> = {
  '/settings/profile'          : { title: 'Mon profil',                  description: 'Votre compte, votre mot de passe et l’apparence de l’application.' },
  '/settings/users'            : { title: 'Utilisateurs et invitations', description: 'Les invités parcourent la médiathèque et demandent des séries. Ils ne voient ni l’activité ni les paramètres.' },
  '/settings/media-management' : { title: 'Gestion des médias',          description: 'Où FanKarr prend les fichiers, où il les range, et comment il les importe.' },
  '/settings/import-management': { title: 'Gestion des séries',          description: 'Les opérations d’entretien sur les fichiers déjà importés.' },
  '/settings/catalogue'        : { title: 'Catalogue Fankai',            description: 'D’où viennent les séries, les épisodes et les torrents.' },
  '/settings/download-client'  : { title: 'Clients de téléchargement',   description: 'Les clients qui reçoivent les torrents envoyés par FanKarr.' },
  '/settings/jellyfin'         : { title: 'Jellyfin et API',             description: 'Le serveur média qui lit la bibliothèque, et l’API ouverte aux applications tierces.' },
  '/settings/logs'             : { title: 'Journaux',                    description: 'Ce que le serveur a fait, du plus récent au plus ancien.' },
  '/settings/advanced'         : { title: 'Avancé',                      description: 'Mises à jour, diagnostic et opérations à ne sortir qu’en cas de besoin.' },
}

const page = computed(() => pages[route.path] ?? { title: 'Paramètres', description: '' })

const groups = computed(() => {
  const link = (to: string) => ({ to, label: pages[to]!.title })
  if (!auth.isAdmin) return [{ label: 'Compte', links: [link('/settings/profile')] }]
  return [
    { label: 'Compte',   links: [link('/settings/profile'), link('/settings/users')] },
    { label: 'Médias',   links: [link('/settings/media-management'), link('/settings/import-management'), link('/settings/catalogue')] },
    { label: 'Services', links: [link('/settings/download-client'), link('/settings/jellyfin')] },
    { label: 'Système',  links: [link('/settings/logs'), link('/settings/advanced')] },
  ]
})
</script>
