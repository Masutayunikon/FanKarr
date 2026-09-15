<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="$emit('cancel')">
      <div class="bg-card border border-border rounded-card w-full max-w-lg flex flex-col max-h-[70vh] shadow-[0_24px_60px_rgb(0_0_0/0.55)]" role="dialog" aria-modal="true" aria-label="Choisir un dossier">

        <div class="flex items-center justify-between gap-4 px-5 py-4 border-b border-hover shrink-0">
          <div class="min-w-0">
            <p class="card-title">Choisir un dossier</p>
            <p class="text-meta text-muted truncate">{{ current }}</p>
          </div>
          <button @click="$emit('cancel')" class="btn-icon btn-sm border-transparent" aria-label="Fermer"><X :size="16" /></button>
        </div>

        <div class="px-5 py-3 border-b border-hover shrink-0 flex gap-2">
          <button @click="navigateTo('/')" class="btn-icon h-[42px] w-[42px]" :title="drivesRoot ? 'Lecteurs' : 'Retour à la racine'" :aria-label="drivesRoot ? 'Lecteurs' : 'Retour à la racine'">
            <House :size="15" />
          </button>
          <input
              v-model="inputPath"
              @keydown.enter="navigateTo(inputPath)"
              class="field flex-1"
              placeholder="/"
              aria-label="Chemin"
          />
          <button @click="navigateTo(inputPath)" class="btn-secondary h-[42px]">
            Aller
          </button>
        </div>

        <div v-if="parent !== null" class="px-5 shrink-0">
          <button
              @click="navigateTo(parent)"
              class="flex items-center gap-2 w-full py-2.5 text-meta text-secondary hover:text-primary transition-colors border-b border-hover"
          >
            <ArrowLeft :size="14" />
            Dossier parent
          </button>
        </div>

        <div class="overflow-y-auto flex-1">
          <div v-if="loading" class="flex items-center justify-center py-10 text-muted text-meta gap-2">
            <div class="w-4 h-4 border border-border border-t-accent rounded-full animate-spin" />
            Chargement…
          </div>
          <div v-else-if="error" class="px-5 py-4 text-meta text-err">{{ error }}</div>
          <div v-else-if="dirs.length === 0" class="px-5 py-4 text-meta text-muted">Aucun sous-dossier</div>
          <button
              v-for="dir in dirs"
              :key="dir"
              @click="navigateTo(joinPath(current, dir))"
              class="flex items-center gap-3 w-full px-5 min-h-10 py-2 text-body text-primary hover:bg-hover transition-colors border-b border-hover text-left"
          >
            <Folder :size="15" :stroke-width="1.75" class="text-muted shrink-0" />
            {{ dir }}
          </button>
        </div>

        <div class="flex items-center justify-between gap-4 px-5 py-4 border-t border-hover shrink-0">
          <span class="text-meta text-muted truncate">{{ current }}</span>
          <button @click="selectCurrent()" class="btn-primary">
            Choisir
          </button>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ArrowLeft, Folder, House, X } from 'lucide-vue-next'

const props = defineProps<{ initialPath?: string }>()
const emit  = defineEmits<{ select: [path: string]; cancel: [] }>()

const current    = ref(props.initialPath || '/')
const inputPath  = ref(current.value)
const dirs       = ref<string[]>([])
const parent     = ref<string | null>(null)
const loading    = ref(false)
const error      = ref('')
const drivesRoot = ref(false)   // true quand la liste affiche les lecteurs Windows

function selectCurrent() {
  emit('select', current.value.replace(/\/+$/, '') || '/')
}

function joinPath(base: string, name: string): string {
  // Lecteur Windows (ex. "C:\") : déjà absolu
  if (/^[A-Za-z]:\\$/.test(name)) return name
  if (base === '/') return `/${name}`
  const cleanBase = base.replace(/[\\/]+$/, '')
  return `${cleanBase}/${name}`
}

async function navigateTo(p: string) {
  if (!p) return
  loading.value = true
  error.value   = ''
  try {
    const res = await fetch(`/api/browse?path=${encodeURIComponent(p)}`, { credentials: 'include' })
    if (!res.ok) {
      error.value = (await res.json()).error ?? "Impossible d'ouvrir ce dossier."
      return
    }
    const data  = await res.json()
    current.value    = data.path
    inputPath.value  = data.path
    parent.value     = data.parent
    dirs.value       = data.dirs
    drivesRoot.value = data.drivesRoot ?? false
  } catch {
    error.value = 'Impossible de lire ce dossier.'
  } finally {
    loading.value = false
  }
}

watch(() => props.initialPath, v => { if (v) navigateTo(v) }, { immediate: true })
</script>