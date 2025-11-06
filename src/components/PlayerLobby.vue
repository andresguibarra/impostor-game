<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { supabase, type Player, type Session } from '../lib/supabase'

const props = defineProps<{
  sessionCode: string
  playerId: string
  playerName: string
}>()

const emit = defineEmits<{
  gameStarted: []
  back: []
}>()

const players = ref<Player[]>([])
const session = ref<Session | null>(null)

let playersSubscription: any = null
let sessionSubscription: any = null

onMounted(async () => {
  // Load initial data
  await loadPlayers()
  await loadSession()
  
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
  
  // Subscribe to session changes (to detect game start)
  sessionSubscription = supabase
    .channel(`session:${props.sessionCode}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'sessions',
        filter: `code=eq.${props.sessionCode}`,
      },
      (payload: any) => {
        if (payload.new.round_number > 0) {
          emit('gameStarted')
        }
        loadSession()
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

async function loadSession() {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('code', props.sessionCode)
    .single()
  
  if (!error && data) {
    session.value = data
  }
}
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen p-4 relative overflow-hidden">
    <!-- Animated background decorations -->
    <div class="absolute top-10 left-10 text-6xl opacity-20 emoji-float">⏳</div>
    <div class="absolute bottom-20 right-10 text-6xl opacity-20 emoji-float" style="animation-delay: 0.7s;">🎉</div>
    <div class="absolute top-1/2 right-10 text-5xl opacity-20 rotate-slow">🎪</div>
    
    <div class="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-8 max-w-md w-full card-animate relative z-10 border-4 border-cyan-400">
      <!-- Header with playful styling -->
      <div class="text-center mb-6">
        <div class="text-7xl mb-4 bounce-subtle">⏳</div>
        <h2 class="text-4xl font-black text-gradient-party mb-4" style="font-family: 'Comic Sans MS', cursive, sans-serif;">
          ¡ESPERANDO!
        </h2>
        <div class="bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl p-5 mb-4 shadow-xl">
          <p class="text-sm text-white font-bold mb-1 opacity-90">📍 SESIÓN:</p>
          <p class="text-4xl font-black text-white tracking-[0.2em]">
            {{ sessionCode }}
          </p>
        </div>
        <div class="bg-gradient-to-r from-fuchsia-100 to-pink-100 rounded-2xl p-4 border-3 border-fuchsia-300">
          <p class="text-lg font-semibold text-gray-700">
            Hola, <span class="font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-600 to-pink-600 text-xl">{{ playerName }}</span>! 👋
          </p>
        </div>
      </div>
      
      <!-- Fun waiting animation -->
      <div class="flex justify-center mb-6 bg-gradient-to-r from-amber-100 to-orange-100 rounded-2xl py-8 border-3 border-amber-300">
        <div class="flex gap-3">
          <div class="text-5xl animate-pulse" style="animation-delay: 0s;">🎮</div>
          <div class="text-5xl animate-pulse" style="animation-delay: 0.3s;">🎯</div>
          <div class="text-5xl animate-pulse" style="animation-delay: 0.6s;">🎪</div>
        </div>
      </div>
      
      <!-- Game info with vibrant design -->
      <div v-if="session" class="mb-6 p-5 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-2xl border-3 border-purple-400">
        <p class="text-base font-black text-purple-800 flex items-center gap-2">
          <span class="text-2xl">🎭</span>
          <span>IMPOSTORES EN JUEGO: <span class="text-2xl text-gradient-party">{{ session.impostor_count }}</span></span>
        </p>
      </div>
      
      <!-- Players list with animated cards -->
      <div class="mb-6">
        <h3 class="text-xl font-black text-gray-800 mb-3 flex items-center gap-2">
          <span class="text-2xl">👥</span>
          JUGADORES ({{ players.length }}):
        </h3>
        <div class="space-y-2 max-h-64 overflow-y-auto">
          <div
            v-for="(player, index) in players"
            :key="player.id"
            class="flex items-center justify-between p-4 bg-gradient-to-r from-lime-100 to-green-100 rounded-xl border-2 border-lime-300 shadow-md slide-in-up"
            :style="{ animationDelay: `${index * 0.1}s` }"
          >
            <span class="font-black text-gray-800 flex items-center gap-2">
              <span class="text-2xl">🎮</span>
              {{ player.name }}
            </span>
            <span
              v-if="player.id === playerId"
              class="text-xs bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-3 py-1 rounded-full font-black shadow-lg pulse-glow"
            >
              VOS
            </span>
          </div>
        </div>
      </div>
      
      <!-- Waiting message with fun design -->
      <div class="text-center mb-6 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl p-5 border-3 border-amber-300">
        <p class="text-lg font-black text-gray-700 flex items-center justify-center gap-2">
          <span class="text-3xl bounce-subtle">⏰</span>
          <span>Esperando al host...</span>
        </p>
        <p class="text-sm font-semibold text-gray-600 mt-2">
          ¡El juego comenzará pronto! 🎊
        </p>
      </div>
      
      <!-- Back button -->
      <button
        @click="emit('back')"
        class="w-full bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800 py-4 rounded-2xl font-black hover:from-gray-400 hover:to-gray-500 transition-all transform hover:scale-105 active:scale-95 shadow-lg"
      >
        <span class="text-xl mr-2">←</span>
        SALIR
      </button>
    </div>
  </div>
</template>
