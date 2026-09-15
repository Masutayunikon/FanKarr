<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="emit('close')">
      <div class="modal max-w-sm" role="dialog" aria-modal="true" aria-labelledby="reject-title">
        <div class="flex flex-col gap-1">
          <h2 id="reject-title" class="card-title">Refuser la demande</h2>
          <p class="text-meta text-muted truncate">{{ serieName }}</p>
        </div>
        <div class="flex flex-col gap-[7px]">
          <label for="reject-message" class="field-label">Motif (facultatif)</label>
          <input id="reject-message" ref="inputRef" v-model="message" type="text" class="field" placeholder="Visible par l'invité" @keyup.enter="emit('confirm', message)" />
        </div>
        <div class="flex gap-2.5 justify-end">
          <button @click="emit('close')" class="btn-ghost">Annuler</button>
          <button @click="emit('confirm', message)" class="btn-danger">Refuser</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

defineProps<{ serieName: string }>()
const emit = defineEmits<{ close: []; confirm: [message: string] }>()

const message  = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
onMounted(() => inputRef.value?.focus())
</script>
