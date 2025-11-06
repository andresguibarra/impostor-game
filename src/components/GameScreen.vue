<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { supabase, type Player, type Session } from '../lib/supabase'
import { startNewRound, getWordForPlayer } from '../lib/gameLogic'
import { UI_STRINGS } from '../lib/constants'

const props = defineProps<{
  gameCode: string
}>()

const router = useRouter()

const players = ref<Player[]>([])
const session = ref<Session | null>(null)
const currentWord = ref<string>('')
const isImpostor = ref<boolean>(false)
const loading = ref(false)
const wordRevealed = ref(false)

// Get session data from localStorage or props
const sessionCode = computed(() => props.gameCode || localStorage.getItem('gameCode') || '')
const playerId = computed(() => localStorage.getItem('playerId') || '')
const playerName = computed(() => localStorage.getItem('playerName') || '')
const isHost = computed(() => localStorage.getItem('isHost') === 'true')

let playersSubscription: any = null
let sessionSubscription: any = null

const canStartNewRound = computed(() => {
  return isHost.value && !loading.value
})

onMounted(async () => {
  // Check if session exists
  if (!sessionCode.value) {
    router.push('/')
    return
  }

  await loadGameState()
  
  // Subscribe to changes
  playersSubscription = supabase
    .channel(`game:${sessionCode.value}:players`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'players',
        filter: `session_id=eq.${sessionCode.value}`,
      },
      () => {
        loadPlayers()
      }
    )
    .subscribe()
  
  sessionSubscription = supabase
    .channel(`game:${sessionCode.value}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'sessions',
        filter: `code=eq.${sessionCode.value}`,
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
    .eq('session_id', sessionCode.value)
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
    .eq('code', sessionCode.value)
    .single()
  
  if (!error && data) {
    session.value = data
    
    if (data.current_word && data.impostors) {
      // Show word or impostor status
      const impostorIds = data.impostors as string[]
      isImpostor.value = impostorIds.includes(playerId.value)
      currentWord.value = getWordForPlayer(playerId.value, data.current_word, impostorIds)
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
      .eq('code', sessionCode.value)
    
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

function goBack() {
  localStorage.removeItem('gameCode')
  localStorage.removeItem('playerId')
  localStorage.removeItem('playerName')
  localStorage.removeItem('isHost')
  router.push('/')
}
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen p-4 relative overflow-hidden">
    <!-- Animated background decorations -->
    <div class="absolute top-10 right-10 text-6xl opacity-20 emoji-float">🎯</div>
    <div class="absolute bottom-10 left-10 text-6xl opacity-20 emoji-float" style="animation-delay: 0.8s;">🕵️</div>
    
    <div class="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-8 max-w-md w-full card-animate relative z-10 border-4 border-purple-400">
      <!-- Header with game info -->
      <div class="text-center mb-6">
        <div class="text-6xl mb-3 bounce-subtle">🎯</div>
        <h2 class="text-4xl font-black text-gradient-party mb-4" style="font-family: 'Comic Sans MS', cursive, sans-serif;">
          ¡A JUGAR!
        </h2>
        <div class="flex justify-between items-center mb-3 gap-3">
          <div class="flex-1 bg-gradient-to-r from-fuchsia-100 to-pink-100 rounded-xl p-3 border-2 border-fuchsia-300">
            <span class="text-xs font-bold text-fuchsia-700">📍 SESIÓN</span>
            <p class="text-lg font-black text-fuchsia-700">{{ sessionCode }}</p>
          </div>
          <div class="flex-1 bg-gradient-to-r from-cyan-100 to-blue-100 rounded-xl p-3 border-2 border-cyan-300">
            <span class="text-xs font-bold text-cyan-700">🎮 RONDA</span>
            <p class="text-lg font-black text-cyan-700">#{{ session?.round_number || 0 }}</p>
          </div>
        </div>
        <div class="bg-gradient-to-r from-amber-100 to-orange-100 rounded-xl p-3 border-2 border-amber-300">
          <p class="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-700 to-orange-700">
            {{ playerName }} 🎮
          </p>
        </div>
      </div>
      
      <!-- Word reveal section -->
      <div class="mb-6">
        <div v-if="!currentWord" class="text-center py-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl border-3 border-purple-300">
          <p class="text-xl font-black text-gray-700 mb-2">
            {{ isHost ? '👆 Iniciá la ronda' : '⏳ Esperando...' }}
          </p>
          <p class="text-3xl bounce-subtle">🎪</p>
        </div>
        
        <div v-else>
          <div v-if="!wordRevealed" class="text-center">
            <p class="text-lg font-black text-gray-700 mb-4 bg-gradient-to-r from-amber-100 to-yellow-100 rounded-xl p-4 border-2 border-amber-300">
              <span class="text-2xl mr-2">👀</span>
              ¡Tocá para ver tu palabra!
            </p>
            <button
              @click="revealWord"
              class="w-full py-16 bg-gradient-to-br from-fuchsia-500 via-purple-500 to-pink-500 rounded-3xl text-white text-3xl font-black hover:from-fuchsia-600 hover:via-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 active:scale-95 shadow-2xl pulse-glow"
            >
              <div class="text-6xl mb-2 bounce-subtle">👁️</div>
              ¡REVELAR!
            </button>
          </div>
          
          <div v-else class="text-center fade-in">
            <div 
              :class="[
                'p-8 rounded-3xl mb-4 shadow-2xl border-4',
                isImpostor 
                  ? 'bg-gradient-to-br from-red-500 via-orange-500 to-red-600 text-white border-red-400 pulse-glow' 
                  : 'bg-gradient-to-br from-blue-500 via-cyan-500 to-green-500 text-white border-blue-400'
              ]"
            >
              <div class="text-5xl mb-3 bounce-subtle">
                {{ isImpostor ? '🎭' : '📝' }}
              </div>
              <p class="text-base font-bold mb-2 opacity-90">
                {{ isImpostor ? '¡SOS EL IMPOSTOR!' : 'TU PALABRA:' }}
              </p>
              <p class="text-5xl font-black tracking-wide">
                {{ currentWord }}
              </p>
            </div>
            
            <div class="text-sm font-semibold text-gray-700 bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl p-5 border-2 border-gray-300 space-y-3">
              <p v-if="isImpostor" class="flex items-start gap-2">
                <span class="text-2xl">🎭</span>
                <span>¡Adiviná la palabra sin que te descubran!</span>
              </p>
              <p v-else class="flex items-start gap-2">
                <span class="text-2xl">🕵️</span>
                <span>Hay <span class="font-black text-red-600 text-lg">{{ session?.impostor_count }}</span> impostor(es) entre nosotros</span>
              </p>
              <p class="flex items-start gap-2">
                <span class="text-2xl">💬</span>
                <span>Hablá con los demás para descubrir al impostor</span>
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Players list with styled cards -->
      <div class="mb-6">
        <h3 class="text-xl font-black text-gray-800 mb-3 flex items-center gap-2">
          <span class="text-2xl">👥</span>
          JUGADORES ({{ players.length }}):
        </h3>
        <div class="space-y-2 max-h-48 overflow-y-auto">
          <div
            v-for="(player, index) in players"
            :key="player.id"
            class="flex items-center justify-between p-3 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-xl border-2 border-indigo-300 shadow-md"
            :style="{ animationDelay: `${index * 0.05}s` }"
          >
            <span class="font-black text-gray-800 flex items-center gap-2">
              <span class="text-xl">🎮</span>
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
      </div>
      
      <!-- Actions with vibrant buttons -->
      <div class="space-y-3">
        <button
          v-if="isHost"
          @click="newRound"
          :disabled="!canStartNewRound"
          class="w-full bg-gradient-to-r from-lime-400 to-green-500 text-white py-5 rounded-2xl text-xl font-black hover:from-lime-500 hover:to-green-600 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl btn-party"
        >
          <span class="text-2xl mr-2">{{ loading ? '⏳' : '🔄' }}</span>
          {{ loading ? 'GENERANDO...' : '¡NUEVA RONDA!' }}
        </button>
        
        <button
          @click="goBack"
          class="w-full bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800 py-4 rounded-2xl font-black hover:from-gray-400 hover:to-gray-500 transition-all transform hover:scale-105 active:scale-95 shadow-lg"
        >
          <span class="text-xl mr-2">←</span>
          SALIR DEL JUEGO
        </button>
      </div>
    </div>
  </div>
</template>
