<script setup lang="ts">
import { ref, onMounted } from 'vue'
import QRCodeVue from 'qrcode'
import { GAME_SETTINGS } from '../lib/constants'
import { MousePointerClick, Key, Link2, X, Smartphone, Scan } from 'lucide-vue-next'

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
      <p class="text-sm text-white font-bold mb-2 opacity-90 flex items-center justify-center gap-1">
        <Key :size="14" /> CÓDIGO DE SESIÓN:
      </p>
      <div
        class="text-5xl font-black text-white tracking-[0.3em] [text-shadow:0_0_20px_rgba(255,255,255,0.5)] hover:scale-105 transition-transform"
      >
        {{ sessionCode }}
      </div>
      <p class="text-xs text-white/70 mt-2 flex items-center justify-center gap-1">
        <MousePointerClick :size="12" />
        Tocá para compartir
      </p>
    </div>

    <!-- Share button (only for player lobby) -->
    <button
      v-if="showShareButton"
      @click="shareInvite"
      class="w-full py-3 px-5 bg-gradient-to-br from-emerald-600/80 to-teal-600/80 backdrop-blur-md text-white rounded-xl font-bold text-base hover:from-emerald-700/90 hover:to-teal-700/90 transition-all hover:-translate-y-0.5 cursor-pointer border-2 border-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2 mb-4"
    >
      <Link2 :size="20" />
      <span>Compartir invitación</span>
    </button>

    <!-- QR Code Button -->
    <div class="text-center mb-6">
      <button
        @click="showQR = !showQR"
        :class="[
          'w-full font-black rounded-3xl transition-all cursor-pointer backdrop-blur-md flex items-center justify-center py-4 px-6 text-xl',
          showQR 
            ? 'bg-gradient-to-br from-slate-600/70 to-slate-700/80 border-2 border-slate-400/50 text-slate-200 shadow-[0_0_10px_rgba(71,85,105,0.3),0_4px_12px_rgba(0,0,0,0.25)] hover:shadow-[0_0_15px_rgba(71,85,105,0.4),0_5px_15px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_0_8px_rgba(71,85,105,0.3),0_2px_8px_rgba(0,0,0,0.2)] [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]'
            : 'bg-gradient-to-br from-cyan-500/90 to-cyan-600/95 border-3 border-cyan-300/80 text-white shadow-[0_0_20px_rgba(6,182,212,0.5),0_4px_15px_rgba(0,0,0,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.7),0_6px_20px_rgba(0,0,0,0.4)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_0_15px_rgba(6,182,212,0.4),0_2px_10px_rgba(0,0,0,0.3)] [text-shadow:0_0_10px_rgba(103,232,249,0.8),0_0_20px_rgba(6,182,212,0.6),2px_2px_4px_rgba(0,0,0,0.5)]'
        ]"
      >
        <component :is="showQR ? X : Smartphone" :size="24" class="mr-2" />
        {{ showQR ? 'OCULTAR QR' : 'MOSTRAR QR' }}
      </button>

      <!-- QR Modal -->
      <div
        v-if="showQR && qrCodeUrl"
        class="mt-4 p-6 bg-slate-800/80 backdrop-blur-md rounded-2xl border-2 border-purple-500/50 slide-in-up"
      >
        <div class="flex justify-center mb-3">
          <div class="relative">
            <img :src="qrCodeUrl" alt="QR Code" class="border-4 border-slate-700 rounded-2xl shadow-2xl" />
            <div
              class="absolute -top-3 -right-3 bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white rounded-full p-2 animate-pulse"
            >
              <Smartphone :size="32" />
            </div>
          </div>
        </div>
        <p class="text-base font-black text-purple-300 flex items-center justify-center gap-2">
          <Scan :size="20" />
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
