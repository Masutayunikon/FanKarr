<template>
  <div>
    <!-- Barre search + tri + colonnes -->
    <div class="flex items-center gap-2 mb-4">
      <div class="relative flex-1 max-w-xs">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" :size="14" />
        <input
            :value="search"
            @input="emit('update:search', ($event.target as HTMLInputElement).value)"
            type="text" placeholder="Rechercher..."
            class="settings-input pl-9 w-full py-1.5 text-sm"
        />
      </div>

      <!-- Tri -->
      <div class="relative shrink-0" ref="sortRef">
        <button @click="sortOpen = !sortOpen" class="btn-secondary flex items-center gap-1.5 py-1.5 px-2.5" :class="activeSort !== 'none' ? 'border-accent text-accent' : ''">
          <ArrowUpDown :size="14" />
          <span class="hidden md:inline text-xs">Trier</span>
          <span v-if="activeSort !== 'none'" class="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-accent" />
        </button>
        <div v-if="sortOpen" class="absolute top-full right-0 mt-1 bg-card border border-border rounded-xl p-2 z-20 w-48 flex flex-col gap-0.5 shadow-xl">
          <button v-for="s in sortOptions" :key="s.value" @click="handleSort(s.value)"
                  class="flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors"
                  :class="activeSort === s.value ? 'bg-active text-primary' : 'text-secondary hover:bg-hover'">
            {{ s.label }}
            <span v-if="activeSort === s.value && sortDir === 'asc'">↑</span>
            <span v-else-if="activeSort === s.value && sortDir === 'desc'">↓</span>
          </button>
        </div>
      </div>

      <!-- Colonnes -->
      <div class="relative shrink-0" ref="colRef">
        <button @click="colOpen = !colOpen" class="btn-secondary flex items-center gap-1.5 py-1.5 px-2.5" :class="colOpen ? 'border-accent text-accent' : ''">
          <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          <span class="hidden md:inline text-xs">Colonnes</span>
        </button>
        <div v-if="colOpen" class="absolute top-full right-0 mt-1 bg-card border border-border rounded-xl p-2 z-20 w-52 flex flex-col gap-0.5 shadow-xl">
          <p class="text-[10px] text-muted px-3 py-1">Colonnes affichées</p>
          <label v-for="col in columnOptions" :key="col.key" class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs cursor-pointer hover:bg-hover transition-colors">
            <input type="checkbox" :checked="columns[col.key]" @change="emit('toggle-col', col.key)" class="accent-accent" />
            {{ col.label }}
          </label>
        </div>
      </div>
    </div>

    <!-- Onglets + filtres -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex gap-1 bg-shell rounded-lg p-1 border border-border">
        <button @click="emit('update:activeTab', 'active')" class="px-4 py-1.5 text-xs rounded-md transition-colors" :class="activeTab === 'active' ? 'bg-active text-primary' : 'text-muted hover:text-primary'">
          En cours
          <span v-if="activeCount > 0" class="ml-1.5 text-[10px] text-accent">{{ activeCount }}</span>
        </button>
        <button @click="emit('update:activeTab', 'done')" class="px-4 py-1.5 text-xs rounded-md transition-colors" :class="activeTab === 'done' ? 'bg-active text-primary' : 'text-muted hover:text-primary'">
          Terminés
          <span v-if="doneCount > 0" class="ml-1.5 text-[10px] text-accent">{{ doneCount }}</span>
        </button>
      </div>

      <div v-if="activeTab === 'done'" class="flex items-center gap-3">
        <label class="flex items-center gap-1.5 cursor-pointer">
          <span class="text-xs text-muted">Seeds uniquement</span>
          <button @click="emit('update:seedingOnly', !seedingOnly)" class="relative shrink-0 w-10 h-[22px] rounded-full transition-colors duration-200" :class="seedingOnly ? 'bg-green-500' : 'bg-border'">
            <span class="absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white transition-transform duration-200" :class="seedingOnly ? 'translate-x-[18px]' : 'translate-x-0'" />
          </button>
        </label>
        <label class="flex items-center gap-1.5 cursor-pointer">
          <span class="text-xs text-muted">Masquer importés</span>
          <button @click="emit('update:hideImported', !hideImported)" class="relative shrink-0 w-10 h-[22px] rounded-full transition-colors duration-200" :class="hideImported ? 'bg-accent' : 'bg-border'">
            <span class="absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white transition-transform duration-200" :class="hideImported ? 'translate-x-[18px]' : 'translate-x-0'" />
          </button>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Search, ArrowUpDown } from 'lucide-vue-next'
import { onClickOutside } from '@vueuse/core'

const props = defineProps<{
  search      : string
  activeSort  : string
  sortDir     : 'asc' | 'desc'
  activeTab   : 'active' | 'done'
  seedingOnly : boolean
  hideImported: boolean
  columns     : Record<string, boolean>
  activeCount : number
  doneCount   : number
  columnOptions: { key: string; label: string }[]
  sortOptions  : { label: string; value: string }[]
}>()

const emit = defineEmits<{
  'update:search'     : [value: string]
  'update:activeTab'  : [value: 'active' | 'done']
  'update:seedingOnly': [value: boolean]
  'update:hideImported': [value: boolean]
  'sort'              : [value: string]
  'toggle-col'        : [key: string]
}>()

const sortOpen = ref(false)
const colOpen  = ref(false)
const sortRef  = ref<HTMLElement | null>(null)
const colRef   = ref<HTMLElement | null>(null)

onClickOutside(sortRef, () => { sortOpen.value = false })
onClickOutside(colRef,  () => { colOpen.value  = false })

function handleSort(val: string) {
  emit('sort', val)
  sortOpen.value = false
}
</script>
