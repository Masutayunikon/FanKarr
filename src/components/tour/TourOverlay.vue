<template>
  <Teleport to="body">
    <div
        v-if="step"
        ref="rootRef"
        class="fixed inset-0 z-[60]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
    >
      <div class="absolute inset-0" />

      <div
          v-if="spot"
          class="absolute rounded-card pointer-events-none transition-all duration-200 motion-reduce:transition-none"
          :style="{
            top: `${spot.top}px`, left: `${spot.left}px`, width: `${spot.width}px`, height: `${spot.height}px`,
            boxShadow: '0 0 0 2px var(--accent), 0 0 0 9999px rgb(14 10 8 / 0.72)',
          }"
      />
      <div v-else class="absolute inset-0 bg-sidebar/72 pointer-events-none" />

      <div
          ref="bubbleRef"
          class="absolute bg-card border border-border rounded-card px-5 py-4 w-[340px] max-w-[calc(100vw-24px)] shadow-[0_24px_60px_rgb(0_0_0/0.55)] flex flex-col gap-3 transition-[top,left] duration-200 motion-reduce:transition-none"
          :style="{ top: `${bubble.top}px`, left: `${bubble.left}px` }"
      >
        <div class="flex items-start gap-3">
          <div class="flex-1 min-w-0">
            <p class="tag-label text-accent tabular-nums">{{ tour.index + 1 }} / {{ tour.steps.length }}</p>
            <h2 id="tour-title" class="font-display text-lg font-bold text-primary mt-1 leading-snug">{{ step.title }}</h2>
          </div>
          <button @click="tour.finish()" aria-label="Fermer la visite" class="w-8 h-8 -mr-2 -mt-1 rounded-full flex items-center justify-center text-muted hover:text-primary hover:bg-hover transition-colors">
            <X :size="15" />
          </button>
        </div>

        <p id="tour-body" class="text-body text-secondary leading-relaxed" aria-live="polite">{{ step.body }}</p>

        <div class="flex items-center gap-2 pt-1">
          <button @click="tour.finish()" class="text-meta text-muted hover:text-primary transition-colors px-1">Passer</button>
          <div class="flex-1" />
          <button v-if="tour.index > 0" @click="tour.prev()" class="btn-ghost btn-sm">Précédent</button>
          <button ref="primaryRef" @click="tour.next()" class="btn-primary btn-sm px-4">
            {{ tour.isLast ? 'Terminer' : 'Suivant' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEventListener, useMediaQuery } from '@vueuse/core'
import { X } from 'lucide-vue-next'
import { useTourStore } from '@/stores/tour'
import { clampRect, computeBubblePosition, type Rect } from '@/utils/tour-position'
import type { TourStep } from '@/tour/steps'

const PAD = 6

const tour   = useTourStore()
const route  = useRoute()
const router = useRouter()

const isDesktop      = useMediaQuery('(min-width: 768px)')
const reducedMotion  = useMediaQuery('(prefers-reduced-motion: reduce)')

const rootRef    = ref<HTMLElement | null>(null)
const bubbleRef  = ref<HTMLElement | null>(null)
const primaryRef = ref<HTMLButtonElement | null>(null)
const spot       = ref<Rect | null>(null)
const bubble     = ref({ top: window.innerHeight / 2 - 80, left: Math.max(12, window.innerWidth / 2 - 160) })

const step = computed(() => tour.current)

let token         = 0
let expectedPath  = ''
let lostAt        = 0
let raf           = 0
let previousFocus : HTMLElement | null = null
let observed      : HTMLElement | null = null

const resizeObserver   = new ResizeObserver(() => scheduleUpdate())
const mutationObserver = new MutationObserver(records => {
  if (records.some(r => !rootRef.value?.contains(r.target))) scheduleUpdate()
})

function findTarget(s: TourStep): HTMLElement | null {
  if (!isDesktop.value || !s.target) return null
  for (const name of s.target) {
    for (const el of document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)) {
      if (el.getClientRects().length > 0) return el
    }
  }
  return null
}

function waitForTarget(s: TourStep, timeout = 4000): Promise<HTMLElement | null> {
  return new Promise(resolve => {
    const found = findTarget(s)
    if (found || !s.target || !isDesktop.value) return resolve(found)
    const obs   = new MutationObserver(() => {
      const el = findTarget(s)
      if (el) { cleanup(); resolve(el) }
    })
    const timer = setTimeout(() => { cleanup(); resolve(null) }, timeout)
    function cleanup() { obs.disconnect(); clearTimeout(timer) }
    obs.observe(document.body, { childList: true, subtree: true })
  })
}

function scheduleUpdate() {
  if (raf) return
  raf = requestAnimationFrame(() => { raf = 0; update() })
}

function update() {
  const s = step.value
  if (!s) return
  const viewport = { width: window.innerWidth, height: window.innerHeight }
  const el = findTarget(s)

  if (el !== observed) {
    if (observed) resizeObserver.unobserve(observed)
    if (el) resizeObserver.observe(el)
    observed = el
  }

  let rect: Rect | null = null
  if (el) {
    const r = el.getBoundingClientRect()
    rect   = clampRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 }, viewport)
    lostAt = 0
  } else if (spot.value) {
    // Cible démontée le temps d'un rechargement (grille des séries) : on garde le cadre un instant
    if (!lostAt) { lostAt = performance.now(); setTimeout(scheduleUpdate, 320) }
    if (performance.now() - lostAt < 300) rect = spot.value
  }
  spot.value = rect

  const size = bubbleRef.value
      ? { width: bubbleRef.value.offsetWidth, height: bubbleRef.value.offsetHeight }
      : { width: 320, height: 160 }
  const pos = computeBubblePosition(rect, size, viewport, s.placement)
  bubble.value = { top: pos.top, left: pos.left }
}

async function showStep() {
  const s = step.value
  if (!s) return
  const current = ++token
  spot.value = null
  lostAt     = 0

  if (s.route && route.path !== s.route) {
    expectedPath = s.route
    try { await router.push(s.route) } catch {}
    if (current !== token) return
  }
  expectedPath = route.path

  await nextTick()
  update()
  const el = await waitForTarget(s)
  if (current !== token) return

  if (el) {
    const r = el.getBoundingClientRect()
    if (r.top < 0 || r.bottom > window.innerHeight) {
      el.scrollIntoView({ block: r.height > window.innerHeight ? 'start' : 'center', behavior: reducedMotion.value ? 'auto' : 'smooth' })
    }
  }
  await nextTick()
  update()
  primaryRef.value?.focus({ preventScroll: true })
}

function onKeydown(e: KeyboardEvent) {
  if (!step.value) return
  if (e.key === 'Escape')     { e.preventDefault(); tour.finish(); return }
  if (e.key === 'ArrowRight') { e.preventDefault(); tour.next(); return }
  if (e.key === 'ArrowLeft')  { e.preventDefault(); tour.prev(); return }
  if (e.key === 'Tab' && bubbleRef.value) {
    const focusables = [...bubbleRef.value.querySelectorAll<HTMLElement>('button')]
    if (focusables.length === 0) return
    const i = focusables.indexOf(document.activeElement as HTMLElement)
    const nextIndex = e.shiftKey ? (i <= 0 ? focusables.length - 1 : i - 1) : (i + 1) % focusables.length
    e.preventDefault()
    focusables[nextIndex]?.focus()
  }
}

useEventListener(window, 'keydown', onKeydown)
useEventListener(window, 'resize', scheduleUpdate)
useEventListener(document, 'scroll', scheduleUpdate, { capture: true, passive: true })

watch(() => tour.active, (active) => {
  if (active) {
    previousFocus = document.activeElement as HTMLElement | null
    mutationObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] })
  } else {
    token++
    mutationObserver.disconnect()
    resizeObserver.disconnect()
    observed   = null
    spot.value = null
    previousFocus?.focus?.({ preventScroll: true })
    previousFocus = null
  }
}, { immediate: true })

watch(() => [tour.active, tour.index], () => { if (tour.active) showStep() }, { immediate: true })

// Navigation manuelle (bouton précédent du navigateur…) : on arrête la visite
watch(() => route.path, (path) => {
  if (tour.active && path !== expectedPath) tour.finish()
})

onBeforeUnmount(() => {
  mutationObserver.disconnect()
  resizeObserver.disconnect()
  if (raf) cancelAnimationFrame(raf)
})
</script>
