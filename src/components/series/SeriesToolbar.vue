<template>
  <div>
    <!-- Toolbar -->
    <div class="shrink-0 px-4 md:px-6 py-3 border-b border-border flex flex-col gap-2">

      <!-- Ligne 1 : recherche + filtres -->
      <div class="flex items-center gap-2">

        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" :size="14" />
          <input
              :value="search"
              @input="emit('update:search', ($event.target as HTMLInputElement).value)"
              type="text"
              placeholder="Rechercher…"
              class="settings-input pl-9 w-full py-1.5 text-sm"
          />
        </div>

        <!-- Filtres -->
        <div class="relative shrink-0" ref="filterRef">
          <button
              @click="filterOpen = !filterOpen"
              class="btn-secondary flex items-center gap-1.5 py-1.5 px-2.5 relative"
              :class="hasActiveFilter ? 'border-accent text-accent' : ''"
              title="Filtres"
          >
            <SlidersHorizontal :size="15" />
            <span class="hidden md:inline text-xs">Filtres</span>
            <ChevronDown class="hidden md:inline transition-transform" :size="12" :class="filterOpen ? 'rotate-180' : ''" />
            <span v-if="hasActiveFilter" class="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-accent" />
          </button>

          <div
              v-if="filterOpen"
              class="absolute top-full right-0 mt-1 bg-card border border-border rounded-xl p-3 z-20 w-52 flex flex-col gap-3 shadow-xl"
          >
            <div>
              <p class="text-xs text-muted mb-1.5">Disponibilité</p>
              <div class="flex flex-col gap-1">
                <button
                    v-for="f in filtersDisponibilite" :key="f.value"
                    @click="emit('update:activeFilter', f.value)"
                    class="flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors"
                    :class="activeFilter === f.value ? 'bg-active text-primary' : 'text-secondary hover:bg-hover'"
                >
                  {{ f.label }}
                  <span v-if="activeFilter === f.value" class="w-1.5 h-1.5 rounded-full bg-accent" />
                </button>
              </div>
            </div>
            <div class="border-t border-border pt-3">
              <p class="text-xs text-muted mb-1.5">État import</p>
              <div class="flex flex-col gap-1">
                <button
                    v-for="f in filtersImport" :key="f.value"
                    @click="emit('update:activeFilter', f.value)"
                    class="flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors"
                    :class="activeFilter === f.value ? 'bg-active text-primary' : 'text-secondary hover:bg-hover'"
                >
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full shrink-0" :style="{ background: f.color }" />
                    {{ f.label }}
                  </div>
                  <span v-if="activeFilter === f.value" class="w-1.5 h-1.5 rounded-full bg-accent" />
                </button>
              </div>
            </div>
            <button
                v-if="hasActiveFilter"
                @click="emit('update:activeFilter', 'all')"
                class="text-xs text-muted hover:text-primary transition-colors text-left pt-1 border-t border-border"
            >
              Effacer les filtres
            </button>
          </div>
        </div>
      </div>

      <!-- Ligne 2 : tri + taille + count -->
      <div class="flex items-center gap-2 flex-wrap">
        <div class="flex items-center gap-1">
          <button
              v-for="s in sortOptions" :key="s.value"
              @click="emit('update:activeSort', s.value)"
              class="px-2.5 py-1 text-xs rounded-lg border transition-colors"
              :class="activeSort === s.value
              ? 'border-accent text-accent bg-accent-muted'
              : 'border-border text-muted hover:border-secondary'"
          >
            {{ s.label }}
          </button>
        </div>

        <div class="flex items-center gap-1 border-l border-border pl-2 ml-auto">
          <button
              v-for="(_, size) in posterSizes" :key="size"
              @click="emit('update:posterSize', size)"
              class="w-7 h-7 text-[10px] rounded-md border transition-colors flex items-center justify-center"
              :class="posterSize === size
              ? 'border-accent text-accent bg-accent-muted'
              : 'border-border text-muted hover:border-secondary'"
          >
            {{ size }}
          </button>
        </div>

        <span class="text-xs text-muted">{{ count }} série{{ count > 1 ? 's' : '' }}</span>
      </div>
    </div>

    <!-- Légende barres -->
    <div class="shrink-0 px-4 md:px-6 py-2 flex items-center gap-4 border-b border-border">
      <div v-for="l in legend" :key="l.label" class="flex items-center gap-1.5">
        <span class="w-3 h-1.5 rounded-full" :style="{ background: l.color }" />
        <span class="text-[11px] text-muted">{{ l.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Search, SlidersHorizontal, ChevronDown } from 'lucide-vue-next'
import { onClickOutside } from '@vueuse/core'

defineProps<{
  search              : string
  activeFilter        : string
  activeSort          : string
  posterSize          : string
  posterSizes         : Record<string, string>
  count               : number
  hasActiveFilter     : boolean
  filtersDisponibilite: { label: string; value: string }[]
  filtersImport       : { label: string; value: string; color: string }[]
  sortOptions         : { label: string; value: string }[]
  legend              : { label: string; color: string }[]
}>()

const emit = defineEmits<{
  'update:search'      : [value: string]
  'update:activeFilter': [value: string]
  'update:activeSort'  : [value: string]
  'update:posterSize'  : [value: string]
}>()

const filterOpen = ref(false)
const filterRef  = ref<HTMLElement | null>(null)

onClickOutside(filterRef, () => { filterOpen.value = false })
</script>
