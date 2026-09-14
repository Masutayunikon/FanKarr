<template>
  <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-x-4 gap-y-2.5 md:flex-wrap">
    <!-- Onglets à compteurs -->
    <div class="chip-row">
      <button
          v-for="t in tabs" :key="t.value"
          @click="emit('update:activeTab', t.value)"
          class="chip"
          :class="{
            'is-active': activeTab === t.value,
            'border-err/30 text-err hover:text-err': t.tone === 'err' && t.count > 0 && activeTab !== t.value,
          }"
          :aria-pressed="activeTab === t.value"
      >
        {{ t.label }}<span
            class="chip-count"
            :class="{
              'text-accent! font-bold': t.tone === 'accent' && t.count > 0 && activeTab !== t.value,
              'text-err! font-bold': t.tone === 'err' && t.count > 0 && activeTab !== t.value,
            }"
        >{{ t.count }}</span>
      </button>
    </div>

    <div class="flex items-center gap-2.5 flex-wrap">
      <label class="w-full sm:w-60 h-[34px] pointer-coarse:h-10 rounded-full bg-card border border-border-light flex items-center gap-[9px] pl-3.5 pr-1.5 cursor-text focus-within:border-accent transition-colors">
        <Search :size="15" :stroke-width="1.75" class="text-muted shrink-0" />
        <input
            :value="search"
            @input="emit('update:search', ($event.target as HTMLInputElement).value)"
            @keydown.esc="emit('update:search', '')"
            type="text" placeholder="Filtrer" aria-label="Filtrer les torrents"
            class="flex-1 min-w-0 bg-transparent outline-none text-[13px] text-primary placeholder:text-muted"
        />
        <button v-if="search" @click="emit('update:search', '')" aria-label="Effacer" class="w-6 h-6 rounded-full flex items-center justify-center text-muted hover:text-primary">
          <X :size="13" />
        </button>
      </label>

      <label class="flex items-center gap-[9px] text-meta text-secondary cursor-pointer select-none">
        Masquer les importés
        <button
            type="button" role="switch" :aria-checked="hideImported"
            @click="emit('update:hideImported', !hideImported)"
            class="switch w-9 h-5"
        ><span class="switch-knob w-3.5 h-3.5" :class="{ 'translate-x-4!': hideImported }" /></button>
      </label>

      <!-- Tri, colonnes, seeds -->
      <div ref="optionsRef" class="relative">
        <button
            @click="optionsOpen = !optionsOpen"
            class="w-[34px] h-[34px] pointer-coarse:w-10 pointer-coarse:h-10 rounded-full border flex items-center justify-center transition-colors relative"
            :class="optionsOpen || activeSort !== 'none' || seedingOnly ? 'border-accent/40 text-accent' : 'border-border-light text-secondary hover:text-primary hover:bg-hover'"
            aria-label="Tri et affichage" aria-haspopup="menu" :aria-expanded="optionsOpen"
        >
          <SlidersHorizontal :size="15" />
        </button>
        <div v-if="optionsOpen" class="menu absolute top-full right-0 mt-1.5 w-60 z-20" role="menu">
          <p class="tag-label px-3 pt-1.5 pb-1">Trier</p>
          <button
              v-for="s in sortOptions" :key="s.value"
              role="menuitem"
              @click="emit('sort', s.value)"
              class="menu-item justify-between"
              :class="{ 'text-primary! bg-hover': activeSort === s.value }"
          >
            {{ s.label }}
            <ArrowUp v-if="activeSort === s.value && sortDir === 'asc'" :size="14" class="text-accent" />
            <ArrowDown v-else-if="activeSort === s.value && sortDir === 'desc'" :size="14" class="text-accent" />
          </button>

          <div class="h-px bg-hover my-1" />
          <p class="tag-label px-3 pt-1.5 pb-1">Afficher</p>
          <label v-for="col in columnOptions" :key="col.key" class="menu-item cursor-pointer">
            <input type="checkbox" :checked="columns[col.key]" @change="emit('toggle-col', col.key)" class="w-4 h-4 rounded" />
            {{ col.label }}
          </label>

          <div class="h-px bg-hover my-1" />
          <label class="menu-item cursor-pointer justify-between">
            Seeds uniquement
            <button
                type="button" role="switch" :aria-checked="seedingOnly"
                @click="emit('update:seedingOnly', !seedingOnly)"
                class="switch w-9 h-5"
            ><span class="switch-knob w-3.5 h-3.5" :class="{ 'translate-x-4!': seedingOnly }" /></button>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ArrowDown, ArrowUp, Search, SlidersHorizontal, X } from 'lucide-vue-next'
import { onClickOutside } from '@vueuse/core'

export interface ActivityTab { value: string; label: string; count: number; tone?: 'accent' | 'err' }

defineProps<{
  search       : string
  activeSort   : string
  sortDir      : 'asc' | 'desc'
  activeTab    : string
  seedingOnly  : boolean
  hideImported : boolean
  columns      : Record<string, boolean>
  tabs         : ActivityTab[]
  columnOptions: { key: string; label: string }[]
  sortOptions  : { label: string; value: string }[]
}>()

const emit = defineEmits<{
  'update:search'      : [value: string]
  'update:activeTab'   : [value: string]
  'update:seedingOnly' : [value: boolean]
  'update:hideImported': [value: boolean]
  'sort'               : [value: string]
  'toggle-col'         : [key: string]
}>()

const optionsOpen = ref(false)
const optionsRef  = ref<HTMLElement | null>(null)

onClickOutside(optionsRef, () => { optionsOpen.value = false })
</script>
