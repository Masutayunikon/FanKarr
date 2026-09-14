<template>
  <div class="flex flex-col gap-4">

    <Teleport defer to="#settings-actions">
      <button @click="exportLogs" :disabled="entries.length === 0" class="btn-secondary pointer-fine:h-[38px]">
        <Download :size="15" /> Exporter
      </button>
      <button @click="showConfirm = true" class="btn-danger pointer-fine:h-[38px]">Vider les journaux</button>
    </Teleport>

    <!-- Filtres -->
    <div class="flex items-center justify-between gap-x-4 gap-y-2.5 flex-wrap">
      <div class="flex items-center gap-1.5 flex-wrap">
        <button
            v-for="l in levels" :key="l.value"
            @click="filterLevel = l.value; load()"
            class="chip"
            :class="{
              'is-active': filterLevel === l.value,
              'border-err/30 text-err hover:text-err': l.value === 'error' && (counts.error ?? 0) > 0 && filterLevel !== 'error',
            }"
            :aria-pressed="filterLevel === l.value"
        >
          {{ l.label }}<span
              class="chip-count"
              :class="{
                'text-err! font-bold': l.value === 'error' && (counts.error ?? 0) > 0 && filterLevel !== 'error',
                'text-accent! font-bold': l.value === 'warn' && (counts.warn ?? 0) > 0 && filterLevel !== 'warn',
              }"
          >{{ l.value === 'all' ? totalCount : (counts[l.value] ?? 0) }}</span>
        </button>
      </div>

      <div class="flex items-center gap-2.5 flex-wrap">
        <select v-model="filterSource" @change="load()" class="field h-[34px] pointer-coarse:h-10 py-0 rounded-full w-auto text-[13px]" aria-label="Source">
          <option value="">Toutes les sources</option>
          <option v-for="s in sources" :key="s" :value="s">{{ s }}</option>
        </select>
        <div class="segmented" role="group" aria-label="Nombre d'entrées">
          <button
              v-for="n in [100, 500, 2000]" :key="n"
              @click="limit = n; load()"
              class="segmented-item"
              :class="{ 'is-active': limit === n }"
              :aria-pressed="limit === n"
          >{{ n === 2000 ? 'Tout' : n }}</button>
        </div>
        <button @click="load" :disabled="loading" class="btn-icon pointer-fine:w-[34px] pointer-fine:h-[34px]" title="Rafraîchir" aria-label="Rafraîchir">
          <RefreshCw :size="15" :class="{ 'animate-spin': loading }" />
        </button>
      </div>
    </div>

    <!-- Chargement -->
    <div v-if="loading && entries.length === 0" class="flex items-center justify-center gap-2 py-16 text-muted text-body">
      <div class="w-4 h-4 border border-border border-t-accent rounded-full animate-spin" />
      Chargement…
    </div>

    <!-- Vide -->
    <div v-else-if="entries.length === 0" class="card flex items-center justify-center py-16 text-muted text-body">
      Aucune entrée{{ filterLevel !== 'all' || filterSource ? ' pour ce filtre' : '' }}.
    </div>

    <!-- Table -->
    <section v-else class="bg-card rounded-card overflow-hidden">
      <div class="overflow-x-auto">
        <div class="min-w-[640px]">
          <div class="grid grid-cols-[92px_128px_104px_minmax(0,1fr)] items-center h-[34px] px-5 border-b border-hover tag-label tracking-[0.12em]">
            <span>Heure</span><span>Niveau</span><span>Source</span><span>Message</span>
          </div>
          <div
              v-for="(entry, i) in entries" :key="i"
              class="grid grid-cols-[92px_128px_104px_minmax(0,1fr)] items-start gap-y-1 px-5 py-2 border-b border-hover last:border-b-0 hover:bg-hover/30 transition-colors"
          >
            <span class="text-meta text-muted tabular-nums pt-px" :title="fullDate(entry.at)">{{ formatTime(entry.at) }}</span>
            <span>
              <span class="pill h-5 px-2 text-[10.5px] gap-1" :class="levelInfo(entry.level).class">
                <TriangleAlert v-if="entry.level === 'error'" :size="11" :stroke-width="2.25" />
                {{ levelInfo(entry.level).label }}
              </span>
            </span>
            <span class="text-meta text-muted truncate pt-px">{{ entry.source }}</span>
            <span class="text-body break-words" :class="entry.level === 'error' ? 'text-err' : 'text-primary'">
              {{ entry.msg }}
              <span v-if="entry.meta" class="text-meta text-muted ml-2">{{ JSON.stringify(entry.meta) }}</span>
            </span>
          </div>
        </div>
      </div>
    </section>

    <p class="text-meta text-muted">{{ entries.length }} entrée{{ entries.length > 1 ? 's' : '' }} affichée{{ entries.length > 1 ? 's' : '' }} · fichier de {{ formatSize(fileSize) }}</p>

    <!-- Confirmation -->
    <Teleport to="body">
      <div v-if="showConfirm" class="modal-backdrop" @click.self="showConfirm = false">
        <div class="modal max-w-sm" role="dialog" aria-modal="true" aria-labelledby="logs-clear-title">
          <div class="flex flex-col gap-1">
            <h3 id="logs-clear-title" class="card-title">Vider les journaux ?</h3>
            <p class="text-meta text-muted">Cette action est irréversible.</p>
          </div>
          <div class="flex gap-2.5 justify-end">
            <button @click="showConfirm = false" class="btn-ghost">Annuler</button>
            <button @click="doClear" class="btn-danger">Vider</button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Download, RefreshCw, TriangleAlert } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
import { formatSize } from '@/utils/format'

const { add: toast } = useToast()

const entries      = ref<any[]>([])
const allEntries   = ref<any[]>([])
const fileSize     = ref(0)
const loading      = ref(true)
const showConfirm  = ref(false)
const filterLevel  = ref('all')
const filterSource = ref('')
const limit        = ref(100)

const levels = [
  { label: 'Tout',          value: 'all'   },
  { label: 'Info',          value: 'info'  },
  { label: 'Avertissements', value: 'warn' },
  { label: 'Erreurs',       value: 'error' },
  { label: 'Debug',         value: 'debug' },
]

// Compteurs et sources
const counts = computed(() => {
  const c: Record<string, number> = {}
  for (const e of allEntries.value) c[e.level] = (c[e.level] ?? 0) + 1
  return c
})
const totalCount = computed(() => allEntries.value.length)
const sources = computed(() => [...new Set(allEntries.value.map(e => e.source).filter(Boolean))].sort())

async function fetchLogs(level: string, source: string, max: number) {
  const params = new URLSearchParams({ limit: String(max), level, ...(source ? { source } : {}) })
  const res = await fetch(`/api/logs?${params}`, { credentials: 'include' })
  return res.ok ? await res.json() : null
}

async function load() {
  loading.value = true
  try {
    const [filtered, all] = await Promise.all([
      fetchLogs(filterLevel.value, filterSource.value, limit.value),
      fetchLogs('all', '', 2000),
    ])
    if (filtered) { entries.value = filtered.entries; fileSize.value = filtered.size }
    if (all) allEntries.value = all.entries
  } finally {
    loading.value = false
  }
}

async function doClear() {
  showConfirm.value = false
  await fetch('/api/logs/clear', { method: 'POST', credentials: 'include' })
  toast('Journaux vidés', 'success')
  await load()
}

// Fichier texte
function exportLogs() {
  const lines = entries.value.map(e => `${e.at}\t${e.level.toUpperCase()}\t${e.source}\t${e.msg}${e.meta ? `\t${JSON.stringify(e.meta)}` : ''}`)
  const blob  = new Blob([lines.join('\n') + '\n'], { type: 'text/plain;charset=utf-8' })
  const url   = URL.createObjectURL(blob)
  const a     = document.createElement('a')
  a.href      = url
  a.download  = `fankarr-journaux-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  return d.toDateString() === new Date().toDateString() ? time : `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} ${time.slice(0, 5)}`
}

function fullDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR')
}

function levelInfo(level: string): { label: string; class: string } {
  return ({
    debug: { label: 'Debug',         class: 'pill-muted' },
    info : { label: 'Info',          class: 'border-transparent px-0 text-muted' },
    warn : { label: 'Avertissement', class: 'pill-wait' },
    error: { label: 'Erreur',        class: 'pill-err' },
  } as Record<string, { label: string; class: string }>)[level] ?? { label: level, class: 'pill-muted' }
}

onMounted(load)
</script>
