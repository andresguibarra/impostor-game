<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import QRCodeVue from 'qrcode'
import { supabase, type Player } from '../lib/supabase'
import { GAME_SETTINGS, UI_STRINGS } from '../lib/constants'
import NeonButton from './NeonButton.vue'

const props = defineProps<{
  sessionCode: string
  playerId: string
  playerName: string
}>()

const emit = defineEmits<{
  startGame: []
  back: []
}>()

const players = ref<Player[]>([])
const impostorCount = ref(1)
const qrCodeUrl = ref('')
const showQR = ref(false)
const loading = ref(false)
const toast = ref('')
const showToast = ref(false)

let playersSubscription: any = null

function displayToast(message: string) {
  toast.value = message
  showToast.value = true
  setTimeout(() => {
    showToast.value = false
  }, 2000)
}

async function copyCode() {
  try {
    await navigator.clipboard.writeText(props.sessionCode)
    displayToast('Código copiado ✅')
  } catch (err) {
    console.error('Error copying code:', err)
  }
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

  // Load initial players
  await loadPlayers()

  // Subscribe to player changes
  playersSubscription = supabase
    .channel(`session:${props.sessionCode}:players`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'players',
        filter: `session_id=eq.${props.sessionCode}`,
      },
      () => {
        loadPlayers()
      }
    )
    .subscribe()
})

onUnmounted(() => {
  if (playersSubscription) {
    playersSubscription.unsubscribe()
  }
})

async function loadPlayers() {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('session_id', props.sessionCode)
    .order('joined_at', { ascending: true })

  if (!error && data) {
    players.value = data
  }
}

async function startGame() {
  if (players.value.length < GAME_SETTINGS.MIN_PLAYERS) {
    alert(UI_STRINGS.MESSAGES.MIN_PLAYERS)
    return
  }

  loading.value = true

  try {
    // Update session to start game
    const { error } = await supabase
      .from('sessions')
      .update({
        impostor_count: impostorCount.value,
        round_number: 1,
      })
      .eq('code', props.sessionCode)

    if (error) throw error

    emit('startGame')
  } catch (err) {
    console.error('Error starting game:', err)
    alert(UI_STRINGS.ERRORS.START_GAME)
  } finally {
    loading.value = false
  }
}

function incrementImpostors() {
  if (impostorCount.value < Math.floor(players.value.length / 2)) {
    impostorCount.value++
  }
}

function decrementImpostors() {
  if (impostorCount.value > 1) {
    impostorCount.value--
  }
}
</script>

<template>
  <div
    class="flex flex-col items-center justify-center min-h-screen p-4 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">

    <div class="neon-card-impostor shadow-2xl p-8 max-w-lg w-full relative z-10">
      <!-- Header -->
      <div class="text-center mb-6">
        <div class="flex mb-4 justify-center items-center gap-3">
          <div class="text-3xl mr-2">🎮</div>
          <h2 class="text-3xl font-black impostor-title">
            Creando Partida
          </h2>
        </div>
        <div
          class="bg-gradient-to-br from-purple-600/90 to-fuchsia-600/90 backdrop-blur-md rounded-2xl p-5 mb-3 shadow-[0_0_30px_rgba(168,85,247,0.5)] border-2 border-purple-400/50"
          @click="shareInvite">
          <p class="text-sm text-white font-bold mb-2 opacity-90">🔑 CÓDIGO DE SESIÓN:</p>
          <div
            class="text-5xl font-black text-white tracking-[0.3em] [text-shadow:0_0_20px_rgba(255,255,255,0.5)] hover:scale-105 transition-transform cursor-pointer">
            {{ sessionCode }}
          </div>
          <p class="text-xs text-white/70 mt-2">👆 Tocá para compartir</p>
        </div>
      </div>

      <!-- QR Code Button -->
      <div class="text-center mb-6">
        <NeonButton :variant="showQR ? 'back' : 'secondary'" :icon="showQR ? '❌' : '📱'" size="md"
          @click="showQR = !showQR" class="w-full">
          {{ showQR ? 'OCULTAR QR' : 'MOSTRAR QR' }}
        </NeonButton>

        <!-- QR Modal -->
        <div v-if="showQR && qrCodeUrl"
          class="mt-4 p-6 bg-slate-800/80 backdrop-blur-md rounded-2xl border-2 border-purple-500/50 slide-in-up">
          <div class="flex justify-center mb-3">
            <div class="relative">
              <img :src="qrCodeUrl" alt="QR Code" class="border-4 border-slate-700 rounded-2xl shadow-2xl" />
              <div
                class="absolute -top-3 -right-3 bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white text-4xl rounded-full p-2 animate-pulse">
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

      <!-- Impostor count -->
      <div class="mb-6 bg-slate-800/60 backdrop-blur-md rounded-2xl p-5 border-2 border-orange-500/50">
        <label class="block text-base font-black text-amber-400 mb-3 flex items-center justify-center gap-2">
          <span class="text-2xl">🎭</span>
          <span>IMPOSTORES EN JUEGO</span>
        </label>
        <div class="flex items-center justify-center gap-4">
          <button @click="decrementImpostors" :disabled="impostorCount <= 1"
            class="w-14 h-14 bg-gradient-to-br from-red-500/80 to-orange-600/80 backdrop-blur-md text-white rounded-xl font-black text-3xl hover:from-red-600 hover:to-orange-700 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg cursor-pointer border-2 border-red-400/50">
            −
          </button>
          <span class="text-6xl font-black impostor-title w-20 text-center">
            {{ impostorCount }}
          </span>
          <button @click="incrementImpostors" :disabled="impostorCount >= Math.floor(players.length / 2)"
            class="w-14 h-14 bg-gradient-to-br from-lime-500/80 to-green-600/80 backdrop-blur-md text-white rounded-xl font-black text-3xl hover:from-lime-600 hover:to-green-700 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg cursor-pointer border-2 border-lime-400/50">
            +
          </button>
        </div>
      </div>

      <!-- Players list -->
      <div class="mb-6">
        <h3 class="text-lg font-black text-cyan-400 mb-3 flex items-center justify-center gap-2">
          <span class="text-2xl">👥</span>
          JUGADORES CONECTADOS ({{ players.length }})
        </h3>
        <div class="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
          <div v-for="(player, index) in players" :key="player.id"
            class="flex items-center justify-between p-4 bg-slate-800/60 backdrop-blur-md rounded-xl border-2 border-cyan-500/40 shadow-md hover:border-cyan-400/60 transition-all">
            <span class="font-black text-white flex items-center gap-2">
              <span class="text-2xl">{{ index === 0 ? '👑' : '🎮' }}</span>
              {{ player.name }}
            </span>
            <span v-if="player.id === playerId"
              class="text-xs bg-gradient-to-br from-fuchsia-500 to-pink-600 text-white px-3 py-1 rounded-full font-black shadow-lg">
              VOS
            </span>
          </div>
        </div>

        <p v-if="players.length < 2"
          class="text-sm text-amber-400 font-black mt-3 flex justify-center items-center bg-slate-800/60 backdrop-blur-md rounded-xl py-3 px-4 border-2 border-amber-500/50">
          <span class="text-2xl mr-2">⚠️</span> Necesitás al menos 2 jugadores
        </p>
      </div>

      <!-- Actions -->
      <div class="space-y-3">
        <NeonButton variant="success" icon="🚀" :disabled="loading || players.length < 2" @click="startGame"
          class="w-full">
          {{ loading ? '⏳ INICIANDO...' : '¡INICIAR JUEGO!' }}
        </NeonButton>

        <NeonButton variant="back" icon="←" size="md" @click="emit('back')" class="w-full">
          SALIR
        </NeonButton>
      </div>
    </div>

    <!-- Toast notification -->
    <Transition name="toast">
      <div v-if="showToast"
        class="fixed top-8 left-1/2 -translate-x-1/2 bg-gradient-to-br from-green-500 to-emerald-600 text-white px-6 py-3 rounded-2xl font-black shadow-[0_0_30px_rgba(34,197,94,0.6)] border-2 border-green-300/50 z-50">
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

.neon-card-impostor {
  background: rgba(15, 15, 30, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 2rem;
  border: 4px solid transparent;
  background-image:
    linear-gradient(rgba(15, 15, 30, 0.95), rgba(15, 15, 30, 0.95)),
    linear-gradient(135deg,
      #00ff87 0%,
      #60efff 25%,
      #a855f7 50%,
      #ec4899 75%,
      #ef4444 100%);
  background-origin: border-box;
  background-clip: padding-box, border-box;
  animation: neonPulse 3s ease-in-out infinite;
}

@keyframes neonPulse {

  0%,
  100% {
    box-shadow: 0 0 40px rgba(0, 255, 135, 0.4), 0 0 80px rgba(168, 85, 247, 0.3);
  }

  50% {
    box-shadow: 0 0 60px rgba(96, 239, 255, 0.5), 0 0 100px rgba(236, 72, 153, 0.4);
  }
}

.impostor-title {
  background: linear-gradient(135deg, #ff6b00 0%, #ff8c00 25%, #ffa500 50%, #ff8c00 75%, #ff6b00 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 4px 12px rgba(255, 140, 0, 0.6));
}

.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(30, 41, 59, 0.5);
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(6, 182, 212, 0.6);
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(6, 182, 212, 0.8);
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
