<script setup lang="ts">
import { ref, onMounted } from 'vue'
import QRCodeVue from 'qrcode'
import { GAME_SETTINGS } from '../lib/constants'
import NeonButton from './NeonButton.vue'

const props = defineProps<{
  sessionCode: string
  showShareButton?: boolean
}>()

const qrCodeUrl = ref('')
const showQR = ref(false)
const toast = ref('')
const showToast = ref(false)

function displayToast(message: string) {
  toast.value = message
  showToast.value = true
  setTimeout(() => {
    showToast.value = false
  }, 2000)
}

async function shareInvite() {
  const gameUrl = `${window.location.origin}?join=${props.sessionCode}`

  if (navigator.share) {
    try {
      await navigator.share({
        title: '¡Unite al juego del Impostor!',
        text: `Unite a mi partida con el código: ${props.sessionCode}`,
        url: gameUrl,
      })
    } catch (err) {
      // User cancelled or error
      console.error('Error sharing:', err)
    }
  } else {
    // Fallback: copy link to clipboard
    try {
      await navigator.clipboard.writeText(gameUrl)
      displayToast('Link copiado 📋')
    } catch (err) {
      console.error('Error copying link:', err)
    }
  }
}

onMounted(async () => {
  // Generate QR code with deep link
  const gameUrl = `${window.location.origin}?join=${props.sessionCode}`
  try {
    qrCodeUrl.value = await QRCodeVue.toDataURL(gameUrl, {
      width: GAME_SETTINGS.QR_CODE_WIDTH,
      margin: GAME_SETTINGS.QR_CODE_MARGIN,
      color: {
        dark: '#7c3aed',
        light: '#ffffff',
      },
    })
  } catch (err) {
    console.error('Error generating QR code:', err)
  }
})
</script>

<template>
  <div>
    <!-- Session Code Card -->
    <div
      class="bg-gradient-to-br from-purple-600/90 to-fuchsia-600/90 backdrop-blur-md rounded-2xl p-5 mb-3 shadow-[0_0_30px_rgba(168,85,247,0.5)] border-2 border-purple-400/50 cursor-pointer"
      @click="shareInvite()"
    >
      <p class="text-sm text-white font-bold mb-2 opacity-90">
        🔑 CÓDIGO DE SESIÓN:
      </p>
      <div
        class="text-5xl font-black text-white tracking-[0.3em] [text-shadow:0_0_20px_rgba(255,255,255,0.5)] hover:scale-105 transition-transform"
      >
        {{ sessionCode }}
      </div>
      <p class="text-xs text-white/70 mt-2">
        👆 Tocá para compartir
      </p>
    </div>

    <!-- Share button (only for player lobby) -->
    <button
      v-if="showShareButton"
      @click="shareInvite"
      class="w-full py-3 px-5 bg-gradient-to-br from-emerald-600/80 to-teal-600/80 backdrop-blur-md text-white rounded-xl font-bold text-base hover:from-emerald-700/90 hover:to-teal-700/90 transition-all hover:-translate-y-0.5 cursor-pointer border-2 border-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2 mb-4"
    >
      <span class="text-xl">🔗</span>
      <span>Compartir invitación</span>
    </button>

    <!-- QR Code Button -->
    <div class="text-center mb-6">
      <NeonButton
        :variant="showQR ? 'back' : 'secondary'"
        :icon="showQR ? '❌' : '📱'"
        size="md"
        @click="showQR = !showQR"
        class="w-full"
      >
        {{ showQR ? 'OCULTAR QR' : 'MOSTRAR QR' }}
      </NeonButton>

      <!-- QR Modal -->
      <div
        v-if="showQR && qrCodeUrl"
        class="mt-4 p-6 bg-slate-800/80 backdrop-blur-md rounded-2xl border-2 border-purple-500/50 slide-in-up"
      >
        <div class="flex justify-center mb-3">
          <div class="relative">
            <img :src="qrCodeUrl" alt="QR Code" class="border-4 border-slate-700 rounded-2xl shadow-2xl" />
            <div
              class="absolute -top-3 -right-3 bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white text-4xl rounded-full p-2 animate-pulse"
            >
              📱
            </div>
          </div>
        </div>
        <p class="text-base font-black text-purple-300 flex items-center justify-center gap-2">
          <span class="text-2xl">👆</span>
          ¡Escaneá para unirte!
        </p>
      </div>
    </div>

    <!-- Toast notification -->
    <Transition name="toast">
      <div
        v-if="showToast"
        class="fixed top-8 left-1/2 -translate-x-1/2 bg-gradient-to-br from-green-500 to-emerald-600 text-white px-6 py-3 rounded-2xl font-black shadow-[0_0_30px_rgba(34,197,94,0.6)] border-2 border-green-300/50 z-50"
      >
        {{ toast }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translate(-50%, -20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -20px);
}

.slide-in-up {
  animation: slideInUp 0.3s ease-out;
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
