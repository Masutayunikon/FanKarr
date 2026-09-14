<template>
  <div class="flex items-center justify-between gap-5">
    <div class="flex-1 min-w-0 flex flex-col gap-[3px]">
      <p class="text-sm font-medium text-primary">{{ label }}</p>
      <p v-if="description" class="text-meta text-muted">{{ description }}</p>
    </div>
    <button
        type="button"
        role="switch"
        :aria-checked="modelValue"
        :aria-label="label"
        @click="$emit('update:modelValue', !modelValue)"
        class="switch"
    >
      <span class="switch-knob" />
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ modelValue: boolean; label: string; description?: string }>()
defineEmits(['update:modelValue'])
</script>
