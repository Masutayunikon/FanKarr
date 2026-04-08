<template>
  <Teleport to="body">
    <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" @click.self="$emit('cancel')">
      <div class="bg-card border border-border rounded-xl w-full max-w-lg flex flex-col" style="max-height: 70vh">

        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <p class="text-xs text-accent font-medium mb-0.5">Choisir un dossier</p>
            <p class="text-xs text-muted font-mono truncate max-w-xs">{{ current }}</p>
          </div>
          <button @click="$emit('cancel')" class="text-muted hover:text-primary transition-colors text-lg leading-none">✕</button>
        </div>

        <!-- Chemin éditable -->
        <div class="px-5 py-3 border-b border-border shrink-0 flex gap-2">
          <button @click="navigateTo('/')" class="btn-secondary px-2 text-muted hover:text-primary" title="Retour à la racine">
            <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </button>
          <input
              v-model="inputPath"
              @keydown.enter="navigateTo(inputPath)"
              class="settings-input flex-1 font-mono text-xs"
              placeholder="/"
          />
          <button @click="navigateTo(inputPath)" class="btn-secondary px-3 text-xs">
            OK
          </button>
        </div>

        <!-- Retour parent -->
        <div v-if="parent !== null" class="px-5 shrink-0">
          <button
              @click="navigateTo(parent)"
              class="flex items-center gap-2 w-full py-2.5 text-xs text-muted hover:text-primary transition-colors border-b border-border"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            ..
          </button>
        </div>

        <!-- Liste dossiers -->
        <div class="overflow-y-auto flex-1">
          <div v-if="loading" class="flex items-center justify-center py-10 text-muted text-xs gap-2">
            <div class="w-4 h-4 border border-border border-t-accent rounded-full animate-spin" />
            Chargement...
          </div>
          <div v-else-if="error" class="px-5 py-4 text-xs text-red-400">{{ error }}</div>
          <div v-else-if="dirs.length === 0" class="px-5 py-4 text-xs text-muted">Aucun sous-dossier</div>
          <button
              v-for="dir in dirs"
              :key="dir"
              @click="navigateTo(joinPath(current, dir))"
              class="flex items-center gap-3 w-full px-5 py-2.5 text-xs text-primary hover:bg-hover transition-colors border-b border-border/50 text-left"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" fill="none">
              <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>
            </svg>
            {{ dir }}
          </button>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between px-5 py-4 border-t border-border shrink-0">
          <span class="text-xs text-muted font-mono truncate max-w-xs">{{ current }}</span>
          <button @click="$emit('select', current.replace(/\\/+$/, '') || '/')" class="btn-primary">
            Choisir
          </button>
        </div>

      </div>
    </div>
  </Teleport>
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
  if (base === '/') return `/${name}`
  const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base
  return `${cleanBase}/${name}`
}

async function navigateTo(p: string) {
  if (!p) return
  loading.value = true
  error.value   = ''
  try {
    const res = await fetch(`/api/browse?path=${encodeURIComponent(p)}`, { credentials: 'include' })
    if (!res.ok) {
      error.value = (await res.json()).error ?? 'Erreur'
      return
    }
    const data  = await res.json()
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

watch(() => props.initialPath, v => { if (v) navigateTo(v) }, { immediate: true })
</script>