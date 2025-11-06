<script setup lang="ts">
import { ref, onMounted } from 'vue'
import QRCodeVue from 'qrcode'
import { MousePointerClick, Key } from 'lucide-vue-next'
import ShareModal from './ShareModal.vue'

const props = defineProps<{
  sessionCode: string
  showShareButton?: boolean
}>()

const qrCodeUrl = ref('')
const showShareModal = ref(false)
const toast = ref('')
const showToast = ref(false)

function displayToast(message: string) {
  toast.value = message
  showToast.value = true
  setTimeout(() => {
    showToast.value = false
  }, 2000)
}

function openShareModal() {
  showShareModal.value = true
}

function closeShareModal() {
  showShareModal.value = false
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
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
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
      @click="openShareModal"
    >
      <p class="text-sm text-white font-bold mb-2 opacity-90 flex items-center justify-center gap-1">
        <Key :size="14" /> CÓDIGO DE SESIÓN:
      </p>
      <div
        class="text-5xl font-black text-white tracking-[0.3em] [text-shadow:0_0_20px_rgba(255,255,255,0.5)] hover:scale-105 transition-transform"
      >
        {{ sessionCode }}
      </div>
      <p class="text-sm text-white/70 mt-2 flex items-center justify-center gap-1">
          <MousePointerClick :size="20" />
          Tocá para compartir
      </p>
    </div>

    <!-- Share Modal with Teleport -->
    <Teleport to="body">
      <ShareModal 
        :show="showShareModal"
        :session-code="sessionCode"
        :qr-code="qrCodeUrl"
        @close="closeShareModal"
        @share="shareInvite"
      />
    </Teleport>

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
</style>
