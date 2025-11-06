<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { supabase, type Player, type Session } from '../lib/supabase'
import { startNewRound, getWordForPlayer } from '../lib/gameLogic'
import { UI_STRINGS } from '../lib/constants'

const props = defineProps<{
  sessionCode: string
  playerId: string
  playerName: string
  isHost: boolean
}>()

const emit = defineEmits<{
  back: []
}>()

const players = ref<Player[]>([])
const session = ref<Session | null>(null)
const currentWord = ref<string>('')
const isImpostor = ref<boolean>(false)
const loading = ref(false)
const wordRevealed = ref(false)

let playersSubscription: any = null
let sessionSubscription: any = null

const canStartNewRound = computed(() => {
  return props.isHost && !loading.value
})

onMounted(async () => {
  await loadGameState()
  
  // Subscribe to changes
  playersSubscription = supabase
    .channel(`game:${props.sessionCode}:players`)
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
  
  sessionSubscription = supabase
    .channel(`game:${props.sessionCode}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'sessions',
        filter: `code=eq.${props.sessionCode}`,
      },
      () => {
        loadGameState()
      }
    )
    .subscribe()
})

onUnmounted(() => {
  if (playersSubscription) {
    playersSubscription.unsubscribe()
  }
  if (sessionSubscription) {
    sessionSubscription.unsubscribe()
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

async function loadGameState() {
  await loadPlayers()
  
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('code', props.sessionCode)
    .single()
  
  if (!error && data) {
    session.value = data
    
    if (data.current_word && data.impostors) {
      // Show word or impostor status
      const impostorIds = data.impostors as string[]
      isImpostor.value = impostorIds.includes(props.playerId)
      currentWord.value = getWordForPlayer(props.playerId, data.current_word, impostorIds)
    }
  }
}

async function newRound() {
  if (!canStartNewRound.value) return
  
  loading.value = true
  wordRevealed.value = false
  
  try {
    // Generate new round
    const round = startNewRound(players.value, session.value?.impostor_count || 1)
    
    // Update session with new round data
    const { error } = await supabase
      .from('sessions')
      .update({
        current_word: round.word,
        impostors: round.impostorIds,
        round_number: (session.value?.round_number || 0) + 1,
      })
      .eq('code', props.sessionCode)
    
    if (error) throw error
    
    // Reload game state
    await loadGameState()
  } catch (err) {
    console.error('Error starting new round:', err)
    alert(UI_STRINGS.ERRORS.NEW_ROUND)
  } finally {
    loading.value = false
  }
}

function revealWord() {
  wordRevealed.value = true
}
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen p-4">
    <div class="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
      <!-- Header -->
      <div class="text-center mb-6">
        <h2 class="text-3xl font-bold text-purple-600 mb-2">
          🎮 Juego en curso
        </h2>
        <div class="flex justify-between items-center mb-2">
          <span class="text-sm text-gray-600">Sesión: {{ sessionCode }}</span>
          <span class="text-sm text-gray-600">Ronda #{{ session?.round_number || 0 }}</span>
        </div>
        <p class="text-gray-600">
          <span class="font-bold text-purple-600">{{ playerName }}</span>
        </p>
      </div>
      
      <!-- Word reveal -->
      <div class="mb-6">
        <div v-if="!currentWord" class="text-center py-12">
          <p class="text-xl text-gray-600 mb-4">
            {{ isHost ? '👆 Iniciá una nueva ronda' : '⏳ Esperando que el host inicie la ronda...' }}
          </p>
        </div>
        
        <div v-else>
          <div v-if="!wordRevealed" class="text-center">
            <p class="text-lg text-gray-600 mb-4">
              Tocá para revelar tu palabra:
            </p>
            <button
              @click="revealWord"
              class="w-full py-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl text-white text-2xl font-bold hover:from-purple-600 hover:to-pink-600 transition transform active:scale-95"
            >
              👀 Revelar
            </button>
          </div>
          
          <div v-else class="text-center">
            <div 
              :class="[
                'p-8 rounded-2xl mb-4',
                isImpostor 
                  ? 'bg-gradient-to-br from-red-500 to-orange-500 text-white' 
                  : 'bg-gradient-to-br from-blue-500 to-green-500 text-white'
              ]"
            >
              <p class="text-sm mb-2 opacity-90">
                {{ isImpostor ? 'Sos un impostor!' : 'Tu palabra es:' }}
              </p>
              <p class="text-4xl font-bold">
                {{ currentWord }}
              </p>
            </div>
            
            <div class="text-sm text-gray-600 bg-gray-100 rounded-lg p-4">
              <p v-if="isImpostor" class="mb-2">
                🎭 Tenés que adivinar la palabra sin que te descubran!
              </p>
              <p v-else class="mb-2">
                🕵️ Hay {{ session?.impostor_count }} impostor(es) entre nosotros
              </p>
              <p>
                💬 Conversá con los demás jugadores (fuera de la app) para encontrar al impostor
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Players list -->
      <div class="mb-6">
        <h3 class="text-lg font-semibold text-gray-700 mb-3">
          Jugadores ({{ players.length }}):
        </h3>
        <div class="space-y-2 max-h-48 overflow-y-auto">
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
      </div>
      
      <!-- Actions -->
      <div class="space-y-3">
        <button
          v-if="isHost"
          @click="newRound"
          :disabled="!canStartNewRound"
          class="w-full bg-green-600 text-white py-4 rounded-lg text-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ loading ? 'Generando...' : '🔄 Nueva Ronda' }}
        </button>
        
        <button
          @click="emit('back')"
          class="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
        >
          ← Salir del juego
        </button>
      </div>
    </div>
  </div>
</template>
