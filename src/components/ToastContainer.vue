<template>
  <Teleport to="body">
    <div class="fixed bottom-4 right-4 left-4 sm:left-auto z-[70] flex flex-col items-end gap-2 pointer-events-none" role="status" aria-live="polite">
      <TransitionGroup name="toast">
        <div
            v-for="t in toasts"
            :key="t.id"
            @click="remove(t.id)"
            class="pointer-events-auto flex items-center gap-3 pl-3.5 pr-4 py-3 rounded-card border bg-card cursor-pointer w-full sm:w-auto sm:min-w-72 max-w-sm shadow-[0_16px_40px_rgb(0_0_0/0.5)]"
            :class="{
            'border-ok/30'     : t.type === 'success',
            'border-err/35'    : t.type === 'error',
            'border-accent/35' : t.type === 'info',
          }"
        >
          <span
              class="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
              :class="{
              'bg-ok/15 text-ok'            : t.type === 'success',
              'bg-err/15 text-err'          : t.type === 'error',
              'bg-accent-muted text-accent' : t.type === 'info',
            }"
          >
            <Check v-if="t.type === 'success'" :size="13" :stroke-width="2.75" />
            <X v-else-if="t.type === 'error'" :size="13" :stroke-width="2.75" />
            <Info v-else :size="13" :stroke-width="2.5" />
          </span>

          <span class="flex-1 text-meta text-primary leading-snug">{{ t.message }}</span>

          <!-- Nbre de messages regroupés -->
          <span
              v-if="t.count && t.count > 1"
              class="shrink-0 pill h-5 px-2 text-[10.5px]"
              :class="{
              'pill-ok'     : t.type === 'success',
              'pill-err'    : t.type === 'error',
              'pill-active' : t.type === 'info',
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
import { Check, Info, X } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
const { toasts, remove } = useToast()
</script>

<style scoped>
.toast-enter-active { transition: all 0.2s ease; }
.toast-leave-active { transition: all 0.15s ease; }
.toast-enter-from   { opacity: 0; transform: translateY(8px) scale(0.97); }
.toast-leave-to     { opacity: 0; transform: translateY(4px) scale(0.97); }
</style>