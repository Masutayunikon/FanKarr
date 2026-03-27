<template>
  <div class="flex items-start justify-between gap-4">
    <div>
      <p class="text-sm text-primary">{{ label }}</p>
      <p class="text-xs text-muted mt-0.5">{{ description }}</p>
    </div>
    <button
        @click="$emit('update:modelValue', !modelValue)"
        class="relative shrink-0 w-10 h-[22px] rounded-full transition-colors duration-200 mt-0.5"
        :class="modelValue ? 'bg-accent' : 'bg-border'"
    >
      <span
          class="absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white transition-transform duration-200"
          :class="modelValue ? 'translate-x-[18px]' : 'translate-x-0'"
      />
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ modelValue: boolean; label: string; description?: string }>()
defineEmits(['update:modelValue'])
</script>