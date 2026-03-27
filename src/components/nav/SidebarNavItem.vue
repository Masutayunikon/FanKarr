<template>
  <div>
    <component
        :is="item.to ? RouterLink : 'button'"
        :to="item.to ?? undefined"
        class="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors duration-100 text-left group"
        :class="isActive
        ? 'bg-active text-primary'
        : 'text-secondary hover:bg-hover hover:text-primary'"
        @click="item.children && !item.to && toggleOpen()"
    >
      <component
          :is="iconComponent"
          :size="17"
          class="shrink-0 transition-colors"
          :class="isActive ? 'text-accent' : 'text-muted group-hover:text-secondary'"
      />
      <span class="flex-1 text-sm truncate">{{ item.label }}</span>

      <!-- Badge animé (ex: downloads actifs) -->
      <span
          v-if="item.badge"
          class="min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[10px] font-medium flex items-center justify-center"
      >
        {{ item.badge }}
      </span>

      <!-- Chevron (seulement si pas de badge) -->
      <ChevronRight
          v-else-if="item.children"
          :size="13"
          class="shrink-0 text-muted transition-transform duration-200"
          :class="isOpen ? 'rotate-90' : ''"
      />
    </component>

    <Transition name="slide">
      <div v-if="item.children && isOpen" class="ml-[34px] mt-0.5 flex flex-col gap-0.5">
        <RouterLink
            v-for="child in item.children"
            :key="child.to"
            :to="child.to"
            class="flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-colors duration-100"
            :class="route.path === child.to
            ? 'text-accent'
            : 'text-muted hover:text-secondary'"
        >
          <span
              class="w-1 h-1 rounded-full shrink-0 transition-colors"
              :class="route.path === child.to ? 'bg-accent' : 'bg-current opacity-40'"
          />
          <span class="text-xs">{{ child.label }}</span>
        </RouterLink>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ChevronRight } from 'lucide-vue-next'
import * as Icons from 'lucide-vue-next'
import type { NavItem } from '@/types/nav'

const props = defineProps<{ item: NavItem }>()

const route = useRoute()

const iconComponent = computed(() => {
  if (!props.item.icon) return Icons.Circle
  return (Icons as Record<string, unknown>)[props.item.icon] ?? Icons.Circle
})

const isActive = computed(() =>
    props.item.to
        ? route.path.startsWith(props.item.to)
        : props.item.children?.some(c => route.path.startsWith(c.to))
)

const isOpen = ref(isActive.value)

watch(isActive, (val) => { if (val) isOpen.value = true })

function toggleOpen() {
  isOpen.value = !isOpen.value
}
</script>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: max-height 0.2s ease, opacity 0.15s ease;
  max-height: 300px;
  overflow: hidden;
}
.slide-enter-from,
.slide-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>