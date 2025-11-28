<script setup lang="ts">
import { X, Send } from 'lucide-vue-next'
import { onMounted, onUnmounted, watch } from 'vue'

const props = defineProps<{
  show: boolean
  sessionCode: string
  qrCode: string
}>()

const emit = defineEmits<{
  close: []
  share: []
}>()

// Handle escape key to close modal
function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.show) {
    emit('close')
  }
}

// Add/remove event listener based on modal visibility
watch(() => props.show, (isVisible) => {
  if (isVisible) {
    document.addEventListener('keydown', handleEscape)
  } else {
    document.removeEventListener('keydown', handleEscape)
  }
})

onMounted(() => {
  if (props.show) {
    document.addEventListener('keydown', handleEscape)
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape)
})
</script>

<template>
  <Transition name="modal-fade">
    <div v-if="show" @click="emit('close')" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-lg p-4">
      <div @click.stop class="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 max-w-md w-full border-4 border-purple-500/50 shadow-[0_0_50px_rgba(168,85,247,0.5)] relative">
        <!-- Close button -->
        <button
          @click="emit('close')"
          class="absolute top-4 right-4 text-white/70 hover:text-white transition-colors cursor-pointer"
        >
          <X :size="24" />
        </button>

        <h3 class="text-3xl font-black text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400">
          ¡Compartí la partida!
        </h3>

        <!-- QR Code -->
        <div class="bg-white rounded-2xl p-4 mb-6 flex justify-center">
          <img v-if="qrCode" :src="qrCode" alt="QR Code" class="w-64 h-64" />
        </div>

        <!-- Session Code -->
        <div class="text-center mb-6">
          <p class="text-sm text-white/60 font-bold mb-2">CÓDIGO DE SESIÓN:</p>
          <p class="text-4xl font-black text-white tracking-widest">{{ sessionCode }}</p>
        </div>

        <!-- Share Button -->
        <button
          @click="emit('share')"
          class="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 rounded-2xl text-xl font-black hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(168,85,247,0.5)] border-2 border-purple-400/50 flex items-center justify-center gap-2"
        >
          <Send :size="24" />
          COMPARTIR
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Modal transitions */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active > div,
.modal-fade-leave-active > div {
  transition: transform 0.3s ease;
}

.modal-fade-enter-from > div,
.modal-fade-leave-to > div {
  transform: scale(0.9);
}
</style>
