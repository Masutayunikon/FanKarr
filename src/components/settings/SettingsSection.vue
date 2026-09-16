<template>
  <section class="card flex flex-col gap-3.5">
    <div v-if="title || $slots.actions" class="flex items-start justify-between gap-4 flex-wrap">
      <div class="flex flex-col gap-0.5 min-w-0 flex-1 basis-[280px]">
        <h3 class="card-title">{{ title }}</h3>
        <p v-if="description || $slots.description" class="text-meta text-muted">
          <slot name="description">{{ description }}</slot>
        </p>
      </div>
      <div v-if="$slots.actions" class="flex items-center gap-2.5 flex-wrap shrink-0">
        <slot name="actions" />
      </div>
    </div>
    <slot />
  </section>
</template>

<script setup lang="ts">
defineProps<{ title?: string; description?: string }>()
</script>
