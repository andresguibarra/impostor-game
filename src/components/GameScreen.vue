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
  <div class="flex flex-col items-center justify-center min-h-screen p-4 relative overflow-hidden">
    <!-- Spy-themed background elements -->
    <div class="absolute top-10 right-10 text-6xl opacity-10 flicker">🎯</div>
    <div class="absolute bottom-10 left-10 text-6xl opacity-10 flicker" style="animation-delay: 0.8s;">🔍</div>
    
    <div class="dossier-card backdrop-blur-xl rounded-xl shadow-2xl p-8 max-w-md w-full card-stealth relative z-10">
      <!-- Header with game info -->
      <div class="text-center mb-6">
        <div class="text-5xl mb-3 flicker">🎯</div>
        <h2 class="text-4xl font-bold text-gradient-spy mb-4 uppercase tracking-tight" style="font-family: 'Courier New', monospace;">
          Misión Activa
        </h2>
        <div class="flex justify-between items-center mb-3 gap-3">
          <div class="flex-1 bg-slate-800/50 rounded-lg p-3 border-2 border-red-600/50">
            <span class="text-xs font-bold text-red-400 uppercase tracking-wider">📍 Código</span>
            <p class="text-lg font-black text-red-400">{{ sessionCode }}</p>
          </div>
          <div class="flex-1 bg-slate-800/50 rounded-lg p-3 border-2 border-blue-600/50">
            <span class="text-xs font-bold text-blue-400 uppercase tracking-wider">🔄 Ronda</span>
            <p class="text-lg font-black text-blue-400">#{{ session?.round_number || 0 }}</p>
          </div>
        </div>
        <div class="bg-slate-800/50 rounded-lg p-3 border-2 border-yellow-600/50">
          <p class="text-base font-bold text-gradient-intel uppercase tracking-wide">
            {{ playerName }} 🕵️
          </p>
        </div>
      </div>
      
      <!-- Word reveal section -->
      <div class="mb-6">
        <div v-if="!currentWord" class="text-center py-12 bg-slate-800/50 rounded-lg border-2 border-slate-600">
          <p class="text-xl font-bold text-slate-300 mb-2 uppercase tracking-wide">
            {{ isHost ? '👆 Iniciar ronda' : '⏳ Esperando...' }}
          </p>
          <p class="text-3xl flicker">🔒</p>
        </div>
        
        <div v-else>
          <div v-if="!wordRevealed" class="text-center">
            <p class="text-lg font-bold text-slate-200 mb-4 bg-slate-800/50 rounded-lg p-4 border-2 border-yellow-600/50 uppercase tracking-wide">
              <span class="text-2xl mr-2">👁️</span>
              Pulsar para revelar
            </p>
            <button
              @click="revealWord"
              class="w-full py-16 bg-gradient-to-br from-red-600 via-orange-600 to-red-700 rounded-xl text-white text-3xl font-bold hover:from-red-700 hover:via-orange-700 hover:to-red-800 transition-all transform hover:scale-105 active:scale-95 shadow-2xl pulse-danger uppercase tracking-wide"
            >
              <div class="text-6xl mb-2 flicker">🔓</div>
              REVELAR
            </button>
          </div>
          
          <div v-else class="text-center fade-in">
            <div 
              :class="[
                'p-8 rounded-xl mb-4 shadow-2xl border-4',
                isImpostor 
                  ? 'bg-gradient-impostor text-white border-red-600 pulse-danger' 
                  : 'bg-gradient-agent text-white border-blue-600'
              ]"
            >
              <div class="text-5xl mb-3 flicker">
                {{ isImpostor ? '🎭' : '📝' }}
              </div>
              <p class="text-base font-bold mb-2 opacity-90 uppercase tracking-wider">
                {{ isImpostor ? 'Eres el impostor' : 'Tu palabra:' }}
              </p>
              <p class="text-5xl font-black tracking-wide" style="font-family: 'Courier New', monospace;">
                {{ currentWord }}
              </p>
            </div>
            
            <div class="text-sm font-semibold text-slate-300 bg-slate-800/50 rounded-lg p-5 border-2 border-slate-600 space-y-3">
              <p v-if="isImpostor" class="flex items-start gap-2">
                <span class="text-2xl">🎭</span>
                <span>Debes adivinar la palabra sin ser descubierto</span>
              </p>
              <p v-else class="flex items-start gap-2">
                <span class="text-2xl">🔍</span>
                <span>Hay <span class="font-black text-red-400 text-lg">{{ session?.impostor_count }}</span> impostor(es) infiltrados</span>
              </p>
              <p class="flex items-start gap-2">
                <span class="text-2xl">💬</span>
                <span>Interroga a los demás agentes para descubrir al impostor</span>
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Players list with spy-styled cards -->
      <div class="mb-6">
        <h3 class="text-xl font-bold text-slate-300 mb-3 flex items-center gap-2 uppercase tracking-wide">
          <span class="text-2xl">👥</span>
          Agentes ({{ players.length }}):
        </h3>
        <div class="space-y-2 max-h-48 overflow-y-auto">
          <div
            v-for="(player, index) in players"
            :key="player.id"
            class="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border-2 border-slate-600 shadow-md"
            :style="{ animationDelay: `${index * 0.05}s` }"
          >
            <span class="font-bold text-slate-200 flex items-center gap-2">
              <span class="text-xl">🕵️</span>
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
      </div>
      
      <!-- Actions with spy-themed buttons -->
      <div class="space-y-3">
        <button
          v-if="isHost"
          @click="newRound"
          :disabled="!canStartNewRound"
          class="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-5 rounded-lg text-xl font-bold hover:from-green-700 hover:to-green-800 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl btn-spy uppercase tracking-wide"
        >
          <span class="text-2xl mr-2">{{ loading ? '⏳' : '🔄' }}</span>
          {{ loading ? 'Generando...' : 'Nueva ronda' }}
        </button>
        
        <button
          @click="emit('back')"
          class="w-full bg-slate-700 text-slate-300 py-4 rounded-lg font-bold hover:bg-slate-600 transition-all transform hover:scale-105 active:scale-95 shadow-lg uppercase tracking-wide"
        >
          <span class="text-xl mr-2">←</span>
          Abortar misión
        </button>
      </div>
    </div>
  </div>
</template>
