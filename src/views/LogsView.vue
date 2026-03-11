<template>
  <div class="max-w-5xl mx-auto px-8 py-8">

    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div class="flex items-center gap-4">
        <button @click="$router.push('/')"
                class="text-[#5a7a94] text-xs tracking-widest hover:text-[#e8513a] transition-colors cursor-pointer">
          ← CATALOGUE
        </button>
        <h1 class="text-xl font-black text-white font-sans">Logs</h1>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-[10px] text-[#5a7a94] tracking-widest">{{ formatSize(fileSize) }}</span>
        <button @click="confirmClear"
                class="border border-[#1e2d3d] text-[#5a7a94] px-4 py-1.5 text-xs tracking-widest hover:border-red-500 hover:text-red-500 transition-colors cursor-pointer">
          EFFACER
        </button>
        <button @click="load"
                class="border border-[#1e2d3d] text-[#5a7a94] px-4 py-1.5 text-xs tracking-widest hover:border-[#e8513a] hover:text-[#e8513a] transition-colors cursor-pointer">
          ↺ RAFRAÎCHIR
        </button>
      </div>
    </div>

    <!-- Filtres -->
    <div class="flex flex-wrap items-center gap-3 mb-5">

      <!-- Niveau -->
      <div class="flex gap-1">
        <button v-for="l in levels" :key="l.value" @click="filterLevel = l.value; load()"
                class="px-3 py-1 text-[10px] tracking-widest border transition-colors cursor-pointer"
                :class="filterLevel === l.value
              ? 'border-[#e8513a] text-[#e8513a]'
              : 'border-[#1e2d3d] text-[#5a7a94] hover:border-[#5a7a94]'">
          {{ l.label }}
        </button>
      </div>

      <!-- Source -->
      <select v-model="filterSource" @change="load()"
              class="bg-[#0d1219] border border-[#1e2d3d] text-[#5a7a94] px-3 py-1 text-[10px] tracking-widest outline-none cursor-pointer">
        <option value="">Toutes les sources</option>
        <option value="organize">organize</option>
        <option value="api">api</option>
        <option value="auth">auth</option>
      </select>

      <!-- Limite / tout afficher -->
      <div class="flex items-center gap-2 ml-auto">
        <span class="text-[10px] text-[#5a7a94] tracking-widest">AFFICHER</span>
        <button v-for="n in [100, 500, 2000]" :key="n" @click="limit = n; load()"
                class="px-2 py-1 text-[10px] tracking-widest border transition-colors cursor-pointer"
                :class="limit === n
              ? 'border-[#e8513a] text-[#e8513a]'
              : 'border-[#1e2d3d] text-[#5a7a94] hover:border-[#5a7a94]'">
          {{ n === 2000 ? 'TOUT' : n }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center gap-3 min-h-48 text-[#5a7a94]">
      <div class="w-4 h-4 border-2 border-white/10 border-t-[#e8513a] rounded-full animate-spin"/>
      <span class="text-sm">Chargement...</span>
    </div>

    <!-- Vide -->
    <div v-else-if="entries.length === 0" class="flex items-center justify-center min-h-48 text-[#5a7a94] text-sm">
      Aucun log
    </div>

    <!-- Table logs -->
    <div v-else class="bg-[#0d1219] border border-[#1e2d3d] overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-xs font-mono">
          <thead>
          <tr class="border-b border-[#1e2d3d]">
            <th class="text-left text-[10px] text-[#5a7a94] tracking-widest px-4 py-2.5 w-40">HORODATAGE</th>
            <th class="text-left text-[10px] text-[#5a7a94] tracking-widest px-3 py-2.5 w-16">NIVEAU</th>
            <th class="text-left text-[10px] text-[#5a7a94] tracking-widest px-3 py-2.5 w-24">SOURCE</th>
            <th class="text-left text-[10px] text-[#5a7a94] tracking-widest px-3 py-2.5">MESSAGE</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="(entry, i) in entries" :key="i"
              class="border-b border-[#1e2d3d]/50 hover:bg-white/[0.02] transition-colors"
              :class="entry.level === 'error' ? 'bg-red-500/5' : entry.level === 'warn' ? 'bg-yellow-500/5' : ''">
            <td class="px-4 py-2 text-[#5a7a94] whitespace-nowrap">{{ formatDate(entry.at) }}</td>
            <td class="px-3 py-2 whitespace-nowrap">
                <span class="text-[10px] tracking-widest px-1.5 py-0.5 rounded"
                      :class="levelClass(entry.level)">
                  {{ entry.level.toUpperCase() }}
                </span>
            </td>
            <td class="px-3 py-2 text-[#5a7a94] whitespace-nowrap">{{ entry.source }}</td>
            <td class="px-3 py-2 text-[#c8d8e8] break-all">
              {{ entry.msg }}
              <span v-if="entry.meta" class="text-[#5a7a94] ml-2">
                  {{ JSON.stringify(entry.meta) }}
                </span>
            </td>
          </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer count -->
      <div class="px-4 py-2.5 border-t border-[#1e2d3d] flex items-center justify-between">
        <span class="text-[10px] text-[#5a7a94] tracking-widest">{{ entries.length }} entrées affichées</span>
        <span class="text-[10px] text-[#5a7a94]">{{ formatSize(fileSize) }} sur disque</span>
      </div>
    </div>

    <!-- Confirm clear -->
    <div v-if="showConfirm" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div class="bg-[#0d1219] border border-[#1e2d3d] p-6 max-w-sm w-full">
        <h3 class="text-sm font-bold text-white mb-2">Effacer les logs ?</h3>
        <p class="text-[11px] text-[#5a7a94] mb-6">Cette action est irréversible.</p>
        <div class="flex gap-3">
          <button @click="doClear"
                  class="bg-red-500 text-white px-5 py-2 text-xs tracking-widest hover:opacity-85 transition-opacity cursor-pointer">
            EFFACER
          </button>
          <button @click="showConfirm = false"
                  class="border border-[#1e2d3d] text-[#5a7a94] px-5 py-2 text-xs tracking-widest hover:border-white/30 transition-colors cursor-pointer">
            ANNULER
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from '@/composables/useToast'

const { add: toast } = useToast()

const entries     = ref<any[]>([])
const fileSize    = ref(0)
const loading     = ref(true)
const showConfirm = ref(false)
const filterLevel  = ref('all')
const filterSource = ref('')
const limit        = ref(100)

const levels = [
  { label: 'TOUS',    value: 'all'   },
  { label: 'INFO',    value: 'info'  },
  { label: 'WARN',    value: 'warn'  },
  { label: 'ERROR',   value: 'error' },
  { label: 'DEBUG',   value: 'debug' },
]

async function load() {
  loading.value = true
  try {
    const params = new URLSearchParams({
      limit : String(limit.value),
      level : filterLevel.value,
      ...(filterSource.value ? { source: filterSource.value } : {})
    })
    const res = await fetch(`/api/logs?${params}`, { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      entries.value  = data.entries
      fileSize.value = data.size
    }
  } finally {
    loading.value = false
  }
}

function confirmClear() { showConfirm.value = true }

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
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function levelClass(level: string): string {
  return {
    debug: 'bg-[#1e2d3d] text-[#5a7a94]',
    info : 'bg-blue-500/10 text-blue-400',
    warn : 'bg-yellow-500/10 text-yellow-400',
    error: 'bg-red-500/10 text-red-400',
  }[level] ?? 'bg-[#1e2d3d] text-[#5a7a94]'
}

onMounted(load)
</script>