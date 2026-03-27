<template>
  <Teleport to="body">
    <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <TransitionGroup name="toast">
        <div
            v-for="t in toasts"
            :key="t.id"
            @click="remove(t.id)"
            class="flex items-center gap-3 px-4 py-3 rounded-xl border text-sm cursor-pointer min-w-64 max-w-sm"
            :class="{
            'bg-card border-green-500/30 text-green-400' : t.type === 'success',
            'bg-card border-red-500/30   text-red-400'   : t.type === 'error',
            'bg-card border-accent/30    text-accent'    : t.type === 'info',
          }"
        >
          <svg v-if="t.type === 'success'" width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" stroke-width="2" fill="none" class="shrink-0">
            <polyline points="2 7 5.5 10.5 12 3"/>
          </svg>
          <svg v-else-if="t.type === 'error'" width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" stroke-width="2" fill="none" class="shrink-0">
            <line x1="3" y1="3" x2="11" y2="11"/><line x1="11" y1="3" x2="3" y2="11"/>
          </svg>
          <svg v-else width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" stroke-width="2" fill="none" class="shrink-0">
            <circle cx="7" cy="7" r="5"/><line x1="7" y1="5" x2="7" y2="7.5"/><circle cx="7" cy="9.5" r="0.5" fill="currentColor"/>
          </svg>

          <span class="flex-1 text-xs leading-snug">{{ t.message }}</span>

          <!-- Badge count si groupé -->
          <span
              v-if="t.count && t.count > 1"
              class="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
              :class="{
              'bg-green-500/20 text-green-400' : t.type === 'success',
              'bg-red-500/20   text-red-400'   : t.type === 'error',
              'bg-accent/20    text-accent'     : t.type === 'info',
            }"
          >
            ×{{ t.count }}
          </span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast'
const { toasts, remove } = useToast()
</script>

<style scoped>
.toast-enter-active { transition: all 0.2s ease; }
.toast-leave-active { transition: all 0.15s ease; }
.toast-enter-from   { opacity: 0; transform: translateY(8px) scale(0.97); }
.toast-leave-to     { opacity: 0; transform: translateY(4px) scale(0.97); }
</style>