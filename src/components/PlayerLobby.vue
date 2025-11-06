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
    <!-- Spy-themed background elements -->
    <div class="absolute top-10 left-10 text-6xl opacity-10 flicker">⏳</div>
    <div class="absolute bottom-20 right-10 text-6xl opacity-10 flicker" style="animation-delay: 0.7s;">📡</div>
    <div class="absolute top-1/2 right-10 text-5xl opacity-10 flicker" style="animation-delay: 1.5s;">🔒</div>
    
    <div class="dossier-card backdrop-blur-xl rounded-xl shadow-2xl p-8 max-w-md w-full card-stealth relative z-10">
      <!-- Header with spy styling -->
      <div class="text-center mb-6">
        <div class="text-6xl mb-4 flicker">⏳</div>
        <h2 class="text-4xl font-bold text-gradient-agent mb-4 uppercase tracking-tight" style="font-family: 'Courier New', monospace;">
          En Espera
        </h2>
        <div class="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-5 mb-4 shadow-xl">
          <p class="text-sm text-blue-200 font-bold mb-1 opacity-90 uppercase tracking-wider">📍 Misión:</p>
          <p class="text-4xl font-black text-white tracking-[0.2em]" style="font-family: 'Courier New', monospace;">
            {{ sessionCode }}
          </p>
        </div>
        <div class="bg-slate-800/50 rounded-lg p-4 border-2 border-slate-600">
          <p class="text-lg font-semibold text-slate-300">
            Agente: <span class="font-black text-gradient-intel text-xl">{{ playerName }}</span> 🕵️
          </p>
        </div>
      </div>
      
      <!-- Waiting animation with spy theme -->
      <div class="flex justify-center mb-6 bg-slate-800/50 rounded-lg py-8 border-2 border-slate-600">
        <div class="flex gap-3">
          <div class="text-5xl animate-pulse" style="animation-delay: 0s;">🎯</div>
          <div class="text-5xl animate-pulse" style="animation-delay: 0.3s;">🔍</div>
          <div class="text-5xl animate-pulse" style="animation-delay: 0.6s;">🕵️</div>
        </div>
      </div>
      
      <!-- Game info with spy design -->
      <div v-if="session" class="mb-6 p-5 bg-slate-800/50 rounded-lg border-2 border-red-600/50">
        <p class="text-base font-bold text-red-400 flex items-center gap-2 uppercase tracking-wide">
          <span class="text-2xl">🎭</span>
          <span>Impostores activos: <span class="text-2xl text-gradient-spy">{{ session.impostor_count }}</span></span>
        </p>
      </div>
      
      <!-- Players list with spy-themed cards -->
      <div class="mb-6">
        <h3 class="text-xl font-bold text-slate-300 mb-3 flex items-center gap-2 uppercase tracking-wide">
          <span class="text-2xl">👥</span>
          Agentes ({{ players.length }}):
        </h3>
        <div class="space-y-2 max-h-64 overflow-y-auto">
          <div
            v-for="(player, index) in players"
            :key="player.id"
            class="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border-2 border-slate-600 shadow-md slide-in-stealth"
            :style="{ animationDelay: `${index * 0.1}s` }"
          >
            <span class="font-bold text-slate-200 flex items-center gap-2">
              <span class="text-2xl">🕵️</span>
              {{ player.name }}
            </span>
            <span
              v-if="player.id === playerId"
              class="text-xs bg-gradient-intel text-slate-900 px-3 py-1 rounded-full font-black shadow-lg pulse-intel"
            >
              VOS
            </span>
          </div>
        </div>
      </div>
      
      <!-- Waiting message with spy design -->
      <div class="text-center mb-6 bg-slate-800/50 rounded-lg p-5 border-2 border-yellow-600/50">
        <p class="text-lg font-bold text-slate-200 flex items-center justify-center gap-2 uppercase tracking-wide">
          <span class="text-3xl flicker">⏰</span>
          <span>Esperando al líder...</span>
        </p>
        <p class="text-sm font-semibold text-slate-400 mt-2">
          La misión comenzará pronto
        </p>
      </div>
      
      <!-- Back button -->
      <button
        @click="emit('back')"
        class="w-full bg-slate-700 text-slate-300 py-4 rounded-lg font-bold hover:bg-slate-600 transition-all transform hover:scale-105 active:scale-95 shadow-lg uppercase tracking-wide"
      >
        <span class="text-xl mr-2">←</span>
        Abortar
      </button>
    </div>
  </div>
</template>
