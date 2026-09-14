<template>
  <div data-tour="series-toolbar" class="flex flex-col gap-[18px]">

    <header class="flex items-center justify-between gap-x-4 gap-y-3 flex-wrap min-h-11">
      <div class="flex items-baseline gap-3.5">
        <h1 class="page-title tracking-[0.01em]">Médiathèque</h1>
        <span class="text-[13px] text-muted">{{ count }} série{{ count > 1 ? 's' : '' }}</span>
      </div>

      <div class="flex items-center gap-2.5 w-full md:w-auto">
        <label class="flex-1 md:flex-none md:w-[320px] h-10 rounded-full bg-card border border-border-light flex items-center gap-2.5 pl-4 pr-2 cursor-text focus-within:border-accent transition-colors">
          <Search :size="16" :stroke-width="1.75" class="text-muted shrink-0" />
          <input
              data-library-search
              :value="search"
              @input="emit('update:search', ($event.target as HTMLInputElement).value)"
              @keydown.esc="emit('update:search', '')"
              type="text"
              :placeholder="selectable ? 'Rechercher dans la médiathèque' : 'Rechercher une série'"
              aria-label="Rechercher une série"
              class="flex-1 min-w-0 bg-transparent outline-none text-sm text-primary placeholder:text-muted"
          />
          <button v-if="search" @click="emit('update:search', '')" aria-label="Effacer la recherche" class="w-7 h-7 rounded-full flex items-center justify-center text-muted hover:text-primary hover:bg-hover transition-colors">
            <X :size="14" />
          </button>
        </label>

        <button
            v-if="selectable"
            data-tour="series-select"
            @click="emit('update:selecting', !selecting)"
            class="h-10 px-4 rounded-full border text-body font-medium flex items-center gap-2 shrink-0 transition-colors"
            :class="selecting ? 'border-accent text-accent bg-accent-muted' : 'border-border-light text-secondary hover:text-primary hover:bg-hover'"
            :title="selecting ? 'Quitter la sélection' : 'Sélectionner plusieurs séries'"
        >
          <SquareCheck :size="16" :stroke-width="1.75" />
          <span class="hidden sm:inline">Sélectionner</span>
        </button>
      </div>
    </header>

    <!-- Filtres, tri et taille  -->
    <div ref="rowRef" class="relative">
      <div class="chip-row md:justify-between md:gap-x-4 md:gap-y-2.5" @scroll="moreOpen = false; sortOpen = false">
        <div class="flex items-center gap-1.5 md:flex-wrap md:shrink md:min-w-0">
          <button
              v-for="f in filters" :key="f.value"
              @click="emit('update:activeFilter', f.value)"
              class="chip shrink-0"
              :class="{ 'is-active': activeFilter === f.value }"
              :aria-pressed="activeFilter === f.value"
          >
            {{ f.label }}<span class="chip-count" :class="{ 'text-accent! font-bold': f.attention && f.count > 0 && activeFilter !== f.value }">{{ f.count }}</span>
          </button>

          <button
              v-if="moreFilters.length"
              ref="moreBtnRef"
              @click="toggleMore"
              class="chip shrink-0 pr-3"
              :class="{ 'is-active': activeMore }"
              aria-haspopup="menu"
              :aria-expanded="moreOpen"
          >
            {{ activeMore ? activeMore.label : 'Plus' }}<span v-if="activeMore" class="chip-count">{{ activeMore.count }}</span>
            <ChevronDown :size="14" class="transition-transform" :class="{ 'rotate-180': moreOpen }" />
          </button>
        </div>

        <div class="flex items-center gap-2">
          <button ref="sortBtnRef" @click="toggleSort" class="chip shrink-0 pr-3" aria-haspopup="menu" :aria-expanded="sortOpen">
            {{ sortOptions.find(s => s.value === activeSort)?.label }}
            <ChevronDown :size="14" class="transition-transform" :class="{ 'rotate-180': sortOpen }" />
          </button>

          <!-- Sur mobile, la grille garde deux colonnes -->
          <div class="segmented max-sm:hidden" role="group" aria-label="Taille des affiches">
            <button
                v-for="(_, size) in posterSizes" :key="size"
                @click="emit('update:posterSize', size)"
                class="segmented-item w-[34px] justify-center px-0 text-[11.5px] font-bold"
                :class="posterSize === size ? 'bg-hover text-primary' : 'text-muted'"
                :aria-pressed="posterSize === size"
                :title="`Affiches ${size}`"
            >
              {{ size }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="moreOpen" ref="moreMenuRef" role="menu" class="menu absolute top-full mt-1.5 w-56 z-20" :style="{ left: `${menuLeft}px` }">
        <button
            v-for="f in moreFilters" :key="f.value"
            role="menuitem"
            @click="emit('update:activeFilter', activeFilter === f.value ? 'all' : f.value); moreOpen = false"
            class="menu-item justify-between"
            :class="{ 'text-primary! bg-hover': activeFilter === f.value }"
        >
          {{ f.label }}<span class="text-meta text-muted">{{ f.count }}</span>
        </button>
      </div>

      <div v-if="sortOpen" ref="sortMenuRef" role="menu" class="menu absolute top-full mt-1.5 w-44 z-20" :style="{ left: `${menuLeft}px` }">
        <button
            v-for="s in sortOptions" :key="s.value"
            role="menuitem"
            @click="emit('update:activeSort', s.value); sortOpen = false"
            class="menu-item justify-between"
            :class="{ 'text-primary! bg-hover': activeSort === s.value }"
        >
          {{ s.label }}<Check v-if="activeSort === s.value" :size="14" class="text-accent" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Check, ChevronDown, Search, SquareCheck, X } from 'lucide-vue-next'
import { onClickOutside } from '@vueuse/core'

export interface LibraryFilter { value: string; label: string; count: number; attention?: boolean }

const props = defineProps<{
  search       : string
  activeFilter : string
  activeSort   : string
  posterSize   : string
  posterSizes  : Record<string, string>
  count        : number
  filters      : LibraryFilter[]
  moreFilters  : LibraryFilter[]
  sortOptions  : { label: string; value: string }[]
  selectable?  : boolean
  selecting?   : boolean
}>()

const emit = defineEmits<{
  'update:search'      : [value: string]
  'update:activeFilter': [value: string]
  'update:activeSort'  : [value: string]
  'update:posterSize'  : [value: string]
  'update:selecting'   : [value: boolean]
}>()

const activeMore = computed(() => props.moreFilters.find(f => f.value === props.activeFilter) ?? null)

const moreOpen    = ref(false)
const sortOpen    = ref(false)
const rowRef      = ref<HTMLElement | null>(null)
const moreBtnRef  = ref<HTMLElement | null>(null)
const sortBtnRef  = ref<HTMLElement | null>(null)
const moreMenuRef = ref<HTMLElement | null>(null)
const sortMenuRef = ref<HTMLElement | null>(null)
const menuLeft    = ref(0)

onClickOutside(moreMenuRef, () => { moreOpen.value = false }, { ignore: [moreBtnRef] })
onClickOutside(sortMenuRef, () => { sortOpen.value = false }, { ignore: [sortBtnRef] })

// Menu sous son bouton, aligné à droite s'il déborde de la ligne
function placeMenu(btn: HTMLElement | null, width: number) {
  if (!btn || !rowRef.value) return
  const row = rowRef.value.getBoundingClientRect()
  const b   = btn.getBoundingClientRect()
  const left = b.left - row.left + width > row.width ? b.right - row.left - width : b.left - row.left
  menuLeft.value = Math.max(0, left)
}

function toggleMore() {
  sortOpen.value = false
  moreOpen.value = !moreOpen.value
  if (moreOpen.value) placeMenu(moreBtnRef.value, 224)
}

function toggleSort() {
  moreOpen.value = false
  sortOpen.value = !sortOpen.value
  if (sortOpen.value) placeMenu(sortBtnRef.value, 176)
}
</script>
