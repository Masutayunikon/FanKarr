<template>
  <div class="min-h-screen bg-[#080c10] text-[#c8d8e8] font-mono">
    <RouterView v-slot="{ Component }">
      <keep-alive include="CatalogView">
        <component :is="Component" />
      </keep-alive>
    </RouterView>
    <ToastContainer />
  </div>
</template>

<script setup lang="ts">
import ToastContainer from '@/components/ToastContainer.vue'
</script>