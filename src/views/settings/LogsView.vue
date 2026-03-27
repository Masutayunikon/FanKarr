<template>
  <div class="flex flex-col gap-4">

    <!-- Actions -->
    <div class="flex items-center justify-between">
      <span class="text-xs text-muted">{{ entries.length }} entrées · {{ formatSize(fileSize) }}</span>
      <div class="flex gap-2">
        <button @click="load" class="btn-secondary text-xs">↺ Rafraîchir</button>
        <button @click="showConfirm = true" class="btn-ghost text-xs text-red-400 hover:text-red-300">Effacer</button>
      </div>
    </div>

    <!-- Filtres -->
    <div class="flex flex-wrap items-center gap-2">
      <div class="flex gap-1">
        <button
            v-for="l in levels" :key="l.value"
            @click="filterLevel = l.value; load()"
            class="px-3 py-1 text-xs rounded-lg border transition-colors"
            :class="filterLevel === l.value
            ? 'border-accent text-accent bg-accent-muted'
            : 'border-border text-muted hover:border-secondary'"
        >
          {{ l.label }}
        </button>
      </div>

      <select v-model="filterSource" @change="load()" class="settings-input w-auto text-xs py-1">
        <option value="">Toutes les sources</option>
        <option value="organize">organize</option>
        <option value="api">api</option>
        <option value="auth">auth</option>
      </select>

      <div class="flex items-center gap-1 ml-auto">
        <span class="text-xs text-muted mr-1">Afficher</span>
        <button
            v-for="n in [100, 500, 2000]" :key="n"
            @click="limit = n; load()"
            class="px-2 py-1 text-xs rounded-lg border transition-colors"
            :class="limit === n
            ? 'border-accent text-accent bg-accent-muted'
            : 'border-border text-muted hover:border-secondary'"
        >
          {{ n === 2000 ? 'Tout' : n }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center gap-2 py-16 text-muted text-sm">
      <div class="w-4 h-4 border border-border border-t-accent rounded-full animate-spin" />
      Chargement...
    </div>

    <!-- Vide -->
    <div v-else-if="entries.length === 0" class="flex items-center justify-center py-16 text-muted text-sm">
      Aucun log
    </div>

    <!-- Table -->
    <div v-else class="settings-card p-0 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-xs font-mono">
          <thead>
          <tr class="border-b border-border">
            <th class="text-left text-muted px-4 py-2.5 w-36 font-normal">Horodatage</th>
            <th class="text-left text-muted px-3 py-2.5 w-16 font-normal">Niveau</th>
            <th class="text-left text-muted px-3 py-2.5 w-24 font-normal">Source</th>
            <th class="text-left text-muted px-3 py-2.5 font-normal">Message</th>
          </tr>
          </thead>
          <tbody>
          <tr
              v-for="(entry, i) in entries" :key="i"
              class="border-b border-border/50 hover:bg-hover transition-colors"
              :class="entry.level === 'error' ? 'bg-red-500/5' : entry.level === 'warn' ? 'bg-yellow-500/5' : ''"
          >
            <td class="px-4 py-2 text-muted whitespace-nowrap">{{ formatDate(entry.at) }}</td>
            <td class="px-3 py-2 whitespace-nowrap">
                <span class="px-1.5 py-0.5 rounded text-[10px]" :class="levelClass(entry.level)">
                  {{ entry.level.toUpperCase() }}
                </span>
            </td>
            <td class="px-3 py-2 text-muted whitespace-nowrap">{{ entry.source }}</td>
            <td class="px-3 py-2 text-primary break-all">
              {{ entry.msg }}
              <span v-if="entry.meta" class="text-muted ml-2">{{ JSON.stringify(entry.meta) }}</span>
            </td>
          </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Confirm effacement -->
    <Teleport to="body">
      <div v-if="showConfirm" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" @click.self="showConfirm = false">
        <div class="bg-card border border-border rounded-xl p-6 max-w-sm w-full flex flex-col gap-4">
          <div>
            <h3 class="text-sm font-semibold text-primary mb-1">Effacer les logs ?</h3>
            <p class="text-xs text-muted">Cette action est irréversible.</p>
          </div>
          <div class="flex gap-2">
            <button @click="doClear" class="btn-primary bg-red-500 hover:bg-red-400">Effacer</button>
            <button @click="showConfirm = false" class="btn-secondary">Annuler</button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from '@/composables/useToast'

const { add: toast } = useToast()

const entries      = ref<any[]>([])
const fileSize     = ref(0)
const loading      = ref(true)
const showConfirm  = ref(false)
const filterLevel  = ref('all')
const filterSource = ref('')
const limit        = ref(100)

const levels = [
  { label: 'Tous',  value: 'all'   },
  { label: 'Info',  value: 'info'  },
  { label: 'Warn',  value: 'warn'  },
  { label: 'Error', value: 'error' },
  { label: 'Debug', value: 'debug' },
]

async function load() {
  loading.value = true
  try {
    const params = new URLSearchParams({
      limit: String(limit.value),
      level: filterLevel.value,
      ...(filterSource.value ? { source: filterSource.value } : {}),
    })
    const res = await fetch(`/api/logs?${params}`, { credentials: 'include' })
    if (res.ok) {
      const data     = await res.json()
      entries.value  = data.entries
      fileSize.value = data.size
    }
  } finally {
    loading.value = false
  }
}

async function doClear() {
  showConfirm.value = false
  await fetch('/api/logs/clear', { method: 'POST', credentials: 'include' })
  toast('Logs effacés', 'success')
  await load()
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
      + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatSize(bytes: number): string {
  if (bytes < 1024)             return `${bytes} B`
  if (bytes < 1024 * 1024)      return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function levelClass(level: string): string {
  return ({
    debug: 'bg-border text-muted',
    info : 'bg-blue-500/10 text-blue-400',
    warn : 'bg-yellow-500/10 text-yellow-400',
    error: 'bg-red-500/10 text-red-400',
  } as Record<string, string>)[level] ?? 'bg-border text-muted'
}

onMounted(load)
</script>