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
    <!-- Spy-themed background elements -->
    <div class="absolute top-20 right-10 text-5xl opacity-10 flicker">🎯</div>
    <div class="absolute bottom-20 left-10 text-5xl opacity-10 flicker" style="animation-delay: 1s;">📡</div>
    
    <div class="dossier-card backdrop-blur-xl rounded-xl shadow-2xl p-8 max-w-md w-full card-stealth relative z-10">
      <!-- Header with spy styling -->
      <div class="text-center mb-6">
        <div class="text-5xl mb-3 flicker">🎯</div>
        <h2 class="text-4xl font-bold text-gradient-spy mb-4 uppercase tracking-tight" style="font-family: 'Courier New', monospace;">
          Centro de Control
        </h2>
        <div class="bg-gradient-to-r from-red-600 to-red-700 rounded-lg p-5 mb-4 shadow-xl pulse-danger">
          <p class="text-sm text-red-200 font-bold mb-1 opacity-90 uppercase tracking-wider">🔑 Código de acceso:</p>
          <p class="text-5xl font-black text-white tracking-[0.3em]" style="font-family: 'Courier New', monospace;">
            {{ sessionCode }}
          </p>
        </div>
      </div>
      
      <!-- QR Code Button and Modal -->
      <div class="text-center mb-6">
        <button
          @click="showQR = !showQR"
          class="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-bold text-lg hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-105 active:scale-95 shadow-xl btn-spy uppercase tracking-wide"
        >
          <span class="text-2xl mr-2">{{ showQR ? '❌' : '📱' }}</span>
          {{ showQR ? 'Ocultar QR' : 'Mostrar QR' }}
        </button>
        
        <!-- QR Modal with spy animation -->
        <div v-if="showQR && qrCodeUrl" class="mt-4 p-6 bg-slate-800/90 rounded-lg border-2 border-blue-500 slide-in-stealth">
          <div class="flex justify-center mb-3">
            <div class="relative">
              <img :src="qrCodeUrl" alt="QR Code" class="border-4 border-slate-700 rounded-lg shadow-2xl" />
              <div class="absolute -top-3 -right-3 bg-gradient-intel text-slate-900 text-3xl rounded-full p-2 pulse-intel">
                📱
              </div>
            </div>
          </div>
          <p class="text-base font-bold text-blue-400 flex items-center justify-center gap-2 uppercase tracking-wide">
            <span class="text-2xl">👆</span>
            Escanear para infiltrarse
          </p>
        </div>
      </div>
      
      <!-- Impostor count with spy controls -->
      <div class="mb-6 bg-slate-800/50 rounded-lg p-5 border-2 border-red-600/50">
        <label class="block text-base font-bold text-red-400 mb-3 flex items-center justify-center gap-2 uppercase tracking-wider">
          <span class="text-2xl">🎭</span>
          <span>Impostores activos</span>
        </label>
        <div class="flex items-center justify-center gap-4">
          <button
            @click="decrementImpostors"
            :disabled="impostorCount <= 1"
            class="w-14 h-14 bg-gradient-to-br from-red-600 to-red-700 text-white rounded-lg font-black text-3xl hover:from-red-700 hover:to-red-800 transition-all transform hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            −
          </button>
          <span class="text-6xl font-black text-gradient-spy w-20 text-center">
            {{ impostorCount }}
          </span>
          <button
            @click="incrementImpostors"
            :disabled="impostorCount >= Math.floor(players.length / 2)"
            class="w-14 h-14 bg-gradient-to-br from-red-600 to-red-700 text-white rounded-lg font-black text-3xl hover:from-red-700 hover:to-red-800 transition-all transform hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            +
          </button>
        </div>
      </div>
      
      <!-- Players list with spy cards -->
      <div class="mb-6">
        <h3 class="text-xl font-bold text-slate-300 mb-3 flex items-center gap-2 uppercase tracking-wide">
          <span class="text-2xl">👥</span>
          Agentes conectados ({{ players.length }}):
        </h3>
        <div class="space-y-2 max-h-64 overflow-y-auto">
          <div
            v-for="(player, index) in players"
            :key="player.id"
            class="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border-2 border-slate-600 shadow-md transform hover:scale-105 transition-all"
            :style="{ animationDelay: `${index * 0.1}s` }"
          >
            <span class="font-bold text-slate-200 flex items-center gap-2">
              <span class="text-2xl">{{ index === 0 ? '👑' : '🕵️' }}</span>
              {{ player.name }}
            </span>
            <span
              v-if="player.id === playerId"
              class="text-xs bg-gradient-intel text-slate-900 px-3 py-1 rounded-full font-black shadow-lg"
            >
              VOS
            </span>
          </div>
        </div>
        
        <p v-if="players.length < 2" class="text-sm text-yellow-400 font-bold mt-3 text-center bg-yellow-900/30 rounded-lg py-3 px-4 border-2 border-yellow-600/50 uppercase tracking-wide">
          <span class="text-2xl">⚠️</span> Mínimo 2 agentes requeridos
        </p>
      </div>
      
      <!-- Actions with spy-themed buttons -->
      <div class="space-y-3">
        <button
          @click="startGame"
          :disabled="loading || players.length < 2"
          class="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-5 rounded-lg text-xl font-bold hover:from-green-700 hover:to-green-800 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl btn-spy pulse-intel uppercase tracking-wide"
        >
          <span class="text-2xl mr-2">{{ loading ? '⏳' : '🚀' }}</span>
          {{ loading ? 'Iniciando...' : 'Iniciar misión' }}
        </button>
        
        <button
          @click="emit('back')"
          class="w-full bg-slate-700 text-slate-300 py-4 rounded-lg font-bold hover:bg-slate-600 transition-all transform hover:scale-105 active:scale-95 shadow-lg uppercase tracking-wide"
        >
          <span class="text-xl mr-2">←</span>
          Abortar
        </button>
      </div>
    </div>
  </div>
</template>
