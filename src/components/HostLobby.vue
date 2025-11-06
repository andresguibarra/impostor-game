<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import QRCodeVue from 'qrcode'
import { supabase, type Player } from '../lib/supabase'
import { GAME_SETTINGS, UI_STRINGS } from '../lib/constants'

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

let playersSubscription: any = null

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
  <div class="flex flex-col items-center justify-center min-h-screen p-4 relative overflow-hidden">
    <!-- Animated background decorations -->
    <div class="absolute top-20 right-10 text-5xl opacity-20 emoji-float">🎮</div>
    <div class="absolute bottom-20 left-10 text-5xl opacity-20 emoji-float" style="animation-delay: 1s;">👥</div>
    
    <div class="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-8 max-w-md w-full card-animate relative z-10 border-4 border-lime-400">
      <!-- Header with vibrant styling -->
      <div class="text-center mb-6">
        <div class="text-6xl mb-3 bounce-subtle">🎮</div>
        <h2 class="text-4xl font-black text-gradient-party mb-4" style="font-family: 'Comic Sans MS', cursive, sans-serif;">
          LOBBY HOST
        </h2>
        <div class="bg-gradient-to-r from-fuchsia-500 to-pink-500 rounded-2xl p-5 mb-4 shadow-xl pulse-glow">
          <p class="text-sm text-white font-bold mb-1 opacity-90">🔑 CÓDIGO DE SESIÓN:</p>
          <p class="text-5xl font-black text-white tracking-[0.3em]">
            {{ sessionCode }}
          </p>
        </div>
      </div>
      
      <!-- QR Code Button and Modal -->
      <div class="text-center mb-6">
        <button
          @click="showQR = !showQR"
          class="px-8 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-2xl font-black text-lg hover:from-purple-600 hover:to-indigo-700 transition-all transform hover:scale-105 active:scale-95 shadow-xl btn-party"
        >
          <span class="text-2xl mr-2">{{ showQR ? '❌' : '📱' }}</span>
          {{ showQR ? 'OCULTAR QR' : 'MOSTRAR QR' }}
        </button>
        
        <!-- QR Modal with animation -->
        <div v-if="showQR && qrCodeUrl" class="mt-4 p-6 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl border-4 border-purple-400 slide-in-up">
          <div class="flex justify-center mb-3">
            <div class="relative">
              <img :src="qrCodeUrl" alt="QR Code" class="border-4 border-white rounded-2xl shadow-2xl" />
              <div class="absolute -top-3 -right-3 bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white text-4xl rounded-full p-2 animate-pulse">
                📱
              </div>
            </div>
          </div>
          <p class="text-base font-black text-purple-700 flex items-center justify-center gap-2">
            <span class="text-2xl">👆</span>
            ¡Escaneá para unirte!
          </p>
        </div>
      </div>
      
      <!-- Impostor count with fun controls -->
      <div class="mb-6 bg-gradient-to-r from-orange-100 to-red-100 rounded-2xl p-5 border-3 border-orange-400">
        <label class="block text-base font-black text-orange-700 mb-3 flex items-center justify-center gap-2">
          <span class="text-2xl">🎭</span>
          <span>IMPOSTORES EN JUEGO</span>
        </label>
        <div class="flex items-center justify-center gap-4">
          <button
            @click="decrementImpostors"
            :disabled="impostorCount <= 1"
            class="w-14 h-14 bg-gradient-to-br from-red-400 to-orange-500 text-white rounded-xl font-black text-3xl hover:from-red-500 hover:to-orange-600 transition-all transform hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            −
          </button>
          <span class="text-6xl font-black text-gradient-party w-20 text-center">
            {{ impostorCount }}
          </span>
          <button
            @click="incrementImpostors"
            :disabled="impostorCount >= Math.floor(players.length / 2)"
            class="w-14 h-14 bg-gradient-to-br from-lime-400 to-green-500 text-white rounded-xl font-black text-3xl hover:from-lime-500 hover:to-green-600 transition-all transform hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            +
          </button>
        </div>
      </div>
      
      <!-- Players list with colorful cards -->
      <div class="mb-6">
        <h3 class="text-xl font-black text-gray-800 mb-3 flex items-center gap-2">
          <span class="text-2xl">👥</span>
          JUGADORES CONECTADOS ({{ players.length }}):
        </h3>
        <div class="space-y-2 max-h-64 overflow-y-auto">
          <div
            v-for="(player, index) in players"
            :key="player.id"
            class="flex items-center justify-between p-4 bg-gradient-to-r from-cyan-100 to-blue-100 rounded-xl border-2 border-cyan-300 shadow-md transform hover:scale-105 transition-all"
            :style="{ animationDelay: `${index * 0.1}s` }"
          >
            <span class="font-black text-gray-800 flex items-center gap-2">
              <span class="text-2xl">{{ index === 0 ? '👑' : '🎮' }}</span>
              {{ player.name }}
            </span>
            <span
              v-if="player.id === playerId"
              class="text-xs bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white px-3 py-1 rounded-full font-black shadow-lg"
            >
              VOS
            </span>
          </div>
        </div>
        
        <p v-if="players.length < 2" class="text-sm text-orange-700 font-black mt-3 text-center bg-orange-100 rounded-xl py-3 px-4 border-2 border-orange-300">
          <span class="text-2xl">⚠️</span> Necesitás al menos 2 jugadores
        </p>
      </div>
      
      <!-- Actions with vibrant buttons -->
      <div class="space-y-3">
        <button
          @click="startGame"
          :disabled="loading || players.length < 2"
          class="w-full bg-gradient-to-r from-lime-400 to-green-500 text-white py-5 rounded-2xl text-2xl font-black hover:from-lime-500 hover:to-green-600 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl btn-party pulse-glow"
        >
          <span class="text-3xl mr-2">🚀</span>
          {{ loading ? '⏳ INICIANDO...' : '¡INICIAR JUEGO!' }}
        </button>
        
        <button
          @click="emit('back')"
          class="w-full bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800 py-4 rounded-2xl font-black hover:from-gray-400 hover:to-gray-500 transition-all transform hover:scale-105 active:scale-95 shadow-lg"
        >
          <span class="text-xl mr-2">←</span>
          SALIR
        </button>
      </div>
    </div>
  </div>
</template>
