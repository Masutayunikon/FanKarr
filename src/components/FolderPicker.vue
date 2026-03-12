<template>
  <!-- Overlay -->
  <div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4" @click.self="$emit('cancel')">
    <div class="bg-[#0d1219] border border-[#1e2d3d] w-full max-w-lg flex flex-col" style="max-height: 70vh">

      <!-- Header -->
      <div class="flex items-center justify-between px-5 py-4 border-b border-[#1e2d3d] shrink-0">
        <div>
          <div class="text-[10px] text-[#e8513a] tracking-widest mb-0.5">CHOISIR UN DOSSIER</div>
          <div class="text-xs text-[#5a7a94] font-mono truncate max-w-xs">{{ current }}</div>
        </div>
        <button @click="$emit('cancel')" class="text-[#5a7a94] hover:text-white transition-colors cursor-pointer text-lg leading-none">✕</button>
      </div>

      <!-- Chemin éditable -->
      <div class="px-5 py-3 border-b border-[#1e2d3d] shrink-0 flex gap-2">
        <input
            v-model="inputPath"
            @keydown.enter="navigateTo(inputPath)"
            class="flex-1 bg-[#121920] border border-[#1e2d3d] text-xs text-white px-3 py-2 font-mono outline-none focus:border-[#e8513a] transition-colors"
            placeholder="/"
        />
        <button @click="navigateTo(inputPath)"
                class="border border-[#1e2d3d] text-[#5a7a94] px-3 py-2 text-xs tracking-widest hover:border-[#e8513a] hover:text-[#e8513a] transition-colors cursor-pointer">
          OK
        </button>
      </div>

      <!-- Navigation retour -->
      <div v-if="parent !== null" class="px-5 shrink-0">
        <button @click="navigateTo(parent)"
                class="flex items-center gap-2 w-full py-2.5 text-xs text-[#5a7a94] hover:text-white transition-colors cursor-pointer border-b border-[#1e2d3d]">
          <svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          ..
        </button>
      </div>

      <!-- Liste dossiers -->
      <div class="overflow-y-auto flex-1">
        <div v-if="loading" class="flex items-center justify-center py-10 text-[#5a7a94] text-xs">
          <div class="w-4 h-4 border border-white/10 border-t-[#e8513a] rounded-full animate-spin mr-2"/>
          Chargement...
        </div>
        <div v-else-if="error" class="px-5 py-4 text-xs text-red-400">{{ error }}</div>
        <div v-else-if="dirs.length === 0" class="px-5 py-4 text-xs text-[#5a7a94]">Aucun sous-dossier</div>
        <button
            v-for="dir in dirs"
            :key="dir"
            @click="navigateTo(joinPath(current, dir))"
            class="flex items-center gap-3 w-full px-5 py-2.5 text-xs text-[#c8d8e8] hover:bg-white/5 transition-colors cursor-pointer border-b border-[#1e2d3d]/50 text-left"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>
          </svg>
          {{ dir }}
        </button>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between px-5 py-4 border-t border-[#1e2d3d] shrink-0">
        <span class="text-[10px] text-[#5a7a94] font-mono truncate max-w-xs">{{ current }}</span>
        <button @click="$emit('select', current)"
                class="bg-[#e8513a] text-white px-5 py-2 text-xs tracking-widest hover:opacity-85 transition-opacity cursor-pointer">
          CHOISIR
        </button>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ initialPath?: string }>()
const emit  = defineEmits<{ select: [path: string]; cancel: [] }>()

const current   = ref(props.initialPath || '/')
const inputPath = ref(current.value)
const dirs      = ref<string[]>([])
const parent    = ref<string | null>(null)
const loading   = ref(false)
const error     = ref('')

function joinPath(base: string, name: string): string {
  return base === '/' ? `/${name}` : `${base}/${name}`
}

async function navigateTo(p: string) {
  if (!p) return
  loading.value = true
  error.value   = ''
  try {
    const res = await fetch(`/api/browse?path=${encodeURIComponent(p)}`, { credentials: 'include' })
    if (!res.ok) {
      const data = await res.json()
      error.value = data.error ?? 'Erreur'
      return
    }
    const data = await res.json()
    current.value   = data.path
    inputPath.value = data.path
    parent.value    = data.parent
    dirs.value      = data.dirs
  } catch {
    error.value = 'Impossible de lire ce dossier'
  } finally {
    loading.value = false
  }
}

watch(() => props.initialPath, v => {
  if (v) navigateTo(v)
}, { immediate: true })
</script>