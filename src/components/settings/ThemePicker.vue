<template>
  <div class="grid grid-cols-3 gap-3.5" role="radiogroup" aria-label="Couleur de l'interface">
    <button
        v-for="theme in themes"
        :key="theme.id"
        type="button"
        role="radio"
        :aria-checked="current === theme.id"
        @click="setTheme(theme.id)"
        class="flex flex-col gap-2 text-left cursor-pointer group"
    >
      <span
          class="h-[74px] rounded-field border-2 bg-sidebar p-2.5 flex items-end gap-2 transition-colors"
          :class="current === theme.id ? '' : 'border-border-light group-hover:border-border'"
          :style="current === theme.id ? { borderColor: theme.color } : undefined"
      >
        <span class="w-[22px] h-[22px] rounded-full shrink-0" :style="{ background: theme.color }" />
        <span class="flex-1 h-2 rounded" :style="{ background: `color-mix(in srgb, ${theme.color} 35%, transparent)` }" />
      </span>
      <span class="text-meta" :class="current === theme.id ? 'font-bold text-primary' : 'font-medium text-secondary'">
        {{ theme.label }}<template v-if="current === theme.id"> · actif</template>
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { useTheme } from '@/composables/useTheme'

const { themes, current, setTheme } = useTheme()
</script>
