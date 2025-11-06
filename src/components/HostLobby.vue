<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import QRCodeVue from 'qrcode'
import { supabase, type Player } from '../lib/supabase'

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
      width: 300,
      margin: 2,
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
  if (players.value.length < 2) {
    alert('Necesitás al menos 2 jugadores para empezar')
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
    alert('Error al iniciar el juego')
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
  <div class="flex flex-col items-center justify-center min-h-screen p-4">
    <div class="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
      <!-- Header -->
      <div class="text-center mb-6">
        <h2 class="text-3xl font-bold text-purple-600 mb-2">
          🎮 Lobby de Host
        </h2>
        <div class="bg-purple-100 rounded-lg p-4 mb-4">
          <p class="text-sm text-gray-600 mb-1">Código de sesión:</p>
          <p class="text-4xl font-bold text-purple-600 tracking-wider">
            {{ sessionCode }}
          </p>
        </div>
      </div>
      
      <!-- QR Code -->
      <div class="text-center mb-6">
        <button
          @click="showQR = !showQR"
          class="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition"
        >
          {{ showQR ? '❌ Ocultar QR' : '📱 Mostrar QR' }}
        </button>
        
        <div v-if="showQR && qrCodeUrl" class="mt-4 flex justify-center">
          <img :src="qrCodeUrl" alt="QR Code" class="border-4 border-purple-600 rounded-lg" />
        </div>
        
        <p v-if="showQR" class="text-sm text-gray-600 mt-2">
          Escaneá para unirte
        </p>
      </div>
      
      <!-- Impostor count -->
      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Cantidad de impostores:
        </label>
        <div class="flex items-center justify-center gap-4">
          <button
            @click="decrementImpostors"
            :disabled="impostorCount <= 1"
            class="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg font-bold text-xl hover:bg-purple-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            -
          </button>
          <span class="text-4xl font-bold text-purple-600 w-16 text-center">
            {{ impostorCount }}
          </span>
          <button
            @click="incrementImpostors"
            :disabled="impostorCount >= Math.floor(players.length / 2)"
            class="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg font-bold text-xl hover:bg-purple-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            +
          </button>
        </div>
      </div>
      
      <!-- Players list -->
      <div class="mb-6">
        <h3 class="text-lg font-semibold text-gray-700 mb-3">
          Jugadores conectados ({{ players.length }}):
        </h3>
        <div class="space-y-2 max-h-64 overflow-y-auto">
          <div
            v-for="player in players"
            :key="player.id"
            class="flex items-center justify-between p-3 bg-gray-100 rounded-lg"
          >
            <span class="font-medium text-gray-800">
              {{ player.name }}
            </span>
            <span
              v-if="player.id === playerId"
              class="text-xs bg-purple-600 text-white px-2 py-1 rounded-full"
            >
              VOS
            </span>
          </div>
        </div>
        
        <p v-if="players.length < 2" class="text-sm text-orange-600 mt-3 text-center">
          ⚠️ Necesitás al menos 2 jugadores
        </p>
      </div>
      
      <!-- Actions -->
      <div class="space-y-3">
        <button
          @click="startGame"
          :disabled="loading || players.length < 2"
          class="w-full bg-green-600 text-white py-4 rounded-lg text-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ loading ? 'Iniciando...' : '🚀 Iniciar Juego' }}
        </button>
        
        <button
          @click="emit('back')"
          class="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
        >
          ← Salir
        </button>
      </div>
    </div>
  </div>
</template>
