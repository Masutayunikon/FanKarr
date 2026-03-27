<template>
  <div class="px-3 py-3 border-t border-border">
    <p class="text-xs text-muted mb-2 uppercase tracking-widest">Thème</p>
    <div class="flex gap-2">
      <button
          v-for="theme in themes"
          :key="theme.id"
          :title="theme.label"
          @click="setTheme(theme.id)"
          class="w-6 h-6 rounded-full border-2 transition-all duration-150 flex items-center justify-center"
          :style="{ backgroundColor: theme.color }"
          :class="current === theme.id
          ? 'border-primary scale-110'
          : 'border-transparent opacity-50 hover:opacity-80'"
      >
        <span v-if="current === theme.id" class="block w-1.5 h-1.5 rounded-full bg-white/80" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const STORAGE_KEY = 'fankarr-theme'

const themes = [
  { id: 'indigo',  label: 'Indigo Électrique', color: '#7B7EF8' },
  { id: 'crimson', label: 'Crimson Night',      color: '#E74C3C' },
  { id: 'teal',    label: 'Teal Froid',         color: '#00CDBF' },
]

const current = ref('indigo')

function setTheme(id) {
  current.value = id
  document.documentElement.setAttribute('data-theme', id)
  localStorage.setItem(STORAGE_KEY, id)
}

onMounted(() => {
  const saved = localStorage.getItem(STORAGE_KEY) ?? 'indigo'
  setTheme(saved)
})
</script>