<template>
  <nav aria-label="Navigation principale" class="shrink-0 bg-sidebar border-t border-card pb-[env(safe-area-inset-bottom)]">
    <div class="flex h-16">
      <RouterLink
          v-for="item in items"
          :key="item.to"
          :to="item.to ?? '/'"
          :data-tour="item.tour"
          :aria-current="isActive(item) ? 'page' : undefined"
          class="flex-1 min-w-0 flex flex-col items-center justify-center gap-1 text-[11.5px] transition-colors"
          :class="isActive(item) ? 'text-accent font-bold' : 'text-muted font-medium hover:text-secondary'"
      >
        <span class="relative">
          <component :is="item.icon" :size="22" :stroke-width="1.75" />
          <span
              v-if="item.badge && item.badgeStyle === 'dot'"
              class="absolute -top-0.5 -right-1 w-[7px] h-[7px] rounded-full bg-accent ring-2 ring-sidebar"
          />
          <span
              v-else-if="item.badge"
              class="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-on-accent text-[10.5px] font-bold tabular-nums flex items-center justify-center ring-2 ring-sidebar"
          >{{ item.badge }}</span>
        </span>
        <span class="max-w-full px-1 truncate">{{ item.label }}</span>
      </RouterLink>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import type { NavItem } from '@/types/nav'

defineProps<{ items: NavItem[] }>()

const route = useRoute()

const isActive = (item: NavItem) => !!item.to && route.path.startsWith(item.to)
</script>
