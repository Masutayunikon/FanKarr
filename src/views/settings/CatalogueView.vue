<template>
  <div class="flex flex-col gap-6">

    <div>
      <h2 class="text-base font-semibold text-primary">Catalogue Fankai</h2>
      <p class="text-sm text-muted mt-1">
        Données locales synchronisées depuis GitLab. Mise à jour automatique toutes les 6h.
      </p>
    </div>

    <!-- Bannière données manquantes -->
    <div
        v-if="status.empty"
        class="border border-accent/30 bg-accent-muted rounded-lg p-4 flex items-center justify-between gap-4"
    >
      <div>
        <p class="text-xs text-accent font-medium mb-1">Données manquantes</p>
        <p class="text-sm text-secondary">
          {{ status.exists ? 'Le catalogue est vide.' : 'Aucun catalogue trouvé.' }}
          Téléchargez les données pour utiliser FanKarr.
        </p>
      </div>
      <button @click="update" :disabled="updating" class="btn-primary whitespace-nowrap">
        {{ updating ? 'Téléchargement...' : 'Télécharger' }}
      </button>
    </div>

    <!-- Statut -->
    <div class="settings-card">
      <p class="text-xs text-muted mb-1">Statut</p>
      <p class="text-sm text-primary font-medium">
        {{ status.empty ? 'Aucune donnée chargée' : `${status.count} séries disponibles` }}
      </p>
    </div>

    <!-- Action -->
    <div>
      <button @click="update" :disabled="updating" class="btn-primary">
        {{ updating ? 'Mise à jour...' : 'Mettre à jour maintenant' }}
      </button>
      <p class="text-xs text-muted mt-2">Force la synchronisation sans attendre le cache de 6h.</p>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from '@/composables/useToast'

const { add: toast } = useToast()

const updating = ref(false)
const status   = ref({ exists: false, count: 0, empty: true })

onMounted(async () => {
  const res = await fetch('/api/torrents/status', { credentials: 'include' })
  if (res.ok) status.value = await res.json()
})

async function update() {
  updating.value = true
  try {
    const res = await fetch('/api/update', { method: 'POST', credentials: 'include' })
    if (res.ok) {
      const { count } = await res.json()
      status.value = { exists: true, count, empty: count === 0 }
      toast(`${count} séries chargées ✓`, 'success')
    } else {
      const { error } = await res.json()
      toast(error ?? 'Erreur lors de la mise à jour', 'error')
    }
  } catch {
    toast('Impossible de contacter le serveur', 'error')
  } finally {
    updating.value = false
  }
}
</script>