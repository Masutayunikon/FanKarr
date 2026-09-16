<template>
  <RouterLink
      :to="item.to ?? '/'"
      :data-tour="item.tour"
      class="group flex items-center gap-3 h-10 px-3 rounded-lg text-sm font-medium transition-colors"
      :class="isActive ? 'bg-hover text-primary' : 'text-secondary hover:bg-hover/60 hover:text-primary'"
  >
    <component
        :is="item.icon"
        :size="18"
        :stroke-width="1.75"
        class="shrink-0 transition-colors"
        :class="isActive ? 'text-accent' : 'text-muted group-hover:text-secondary'"
    />
    <span class="flex-1 truncate">{{ item.label }}</span>

    <span
        v-if="item.badge && item.badgeStyle === 'dot'"
        class="flex items-center gap-1.5 text-xs font-bold text-secondary"
    >
      <span class="w-1.5 h-1.5 rounded-full bg-accent" />{{ item.badge }}
    </span>
    <span
        v-else-if="item.badge"
        class="min-w-[22px] h-5 px-[7px] rounded-full bg-accent-muted text-accent text-xs font-bold flex items-center justify-center"
    >
      {{ item.badge }}
    </span>
  </RouterLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import type { NavItem } from '@/types/nav'

const props = defineProps<{ item: NavItem }>()

const route = useRoute()

const isActive = computed(() => !!props.item.to && route.path.startsWith(props.item.to))
</script>
