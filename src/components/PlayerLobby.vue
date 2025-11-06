<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { supabase, type Player, type Session } from '../lib/supabase'
import NeonButton from './NeonButton.vue'
import SessionCodeCard from './SessionCodeCard.vue'

const props = defineProps<{
  gameCode: string
}>()

const router = useRouter()

const players = ref<Player[]>([])
const session = ref<Session | null>(null)

// Get session data from localStorage or props
const sessionCode = computed(() => props.gameCode || localStorage.getItem('gameCode') || '')
const playerId = computed(() => localStorage.getItem('playerId') || '')
const playerName = computed(() => localStorage.getItem('playerName') || '')

let playersSubscription: any = null
let sessionSubscription: any = null

onMounted(async () => {
  // Check if session exists
  if (!sessionCode.value) {
    router.push('/')
    return
  }

  // Load initial data
  await loadPlayers()
  await loadSession()
  
  // Subscribe to player changes
  playersSubscription = supabase
    .channel(`session:${sessionCode.value}:players`)
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
  
  // Subscribe to session changes (to detect game start)
  sessionSubscription = supabase
    .channel(`session:${sessionCode.value}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'sessions',
        filter: `code=eq.${sessionCode.value}`,
      },
      (payload: any) => {
        if (payload.new.round_number > 0) {
          router.push(`/game/${sessionCode.value}`)
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
    .eq('session_id', sessionCode.value)
    .order('joined_at', { ascending: true })
  
  if (!error && data) {
    players.value = data
  }
}

async function loadSession() {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('code', sessionCode.value)
    .single()
  
  if (!error && data) {
    session.value = data
  }
}

async function goBack() {
  // Delete player from database
  try {
    await supabase
      .from('players')
      .delete()
      .eq('id', playerId.value)
  } catch (err) {
    console.error('Error deleting player:', err)
  }
  
  // Clear localStorage
  localStorage.removeItem('gameCode')
  localStorage.removeItem('playerId')
  localStorage.removeItem('playerName')
  localStorage.removeItem('isHost')
  router.push('/')
}
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen p-4 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
    
    <div class="neon-card-impostor shadow-2xl p-8 max-w-lg w-full relative z-10">
      <!-- Header -->
      <div class="text-center mb-6">
        <div class="text-7xl mb-4">⏳</div>
        <h2 class="text-4xl font-black impostor-title mb-4">
          ¡ESPERANDO!
        </h2>
        
        <!-- Session Code Card Component -->
        <SessionCodeCard :session-code="sessionCode" :show-share-button="true" />
        
        <div class="bg-slate-800/60 backdrop-blur-md rounded-2xl p-4 border-2 border-fuchsia-500/50">
          <p class="text-lg font-semibold text-gray-300">
            Hola, <span class="font-black text-fuchsia-400 text-xl">{{ playerName }}</span>! 👋
          </p>
        </div>
      </div>
      
      <!-- Waiting animation -->
      <div class="flex justify-center mb-6 bg-slate-800/60 backdrop-blur-md rounded-2xl py-8 border-2 border-amber-500/50">
        <div class="flex gap-3">
          <div class="text-5xl animate-pulse" style="animation-delay: 0s;">🎮</div>
          <div class="text-5xl animate-pulse" style="animation-delay: 0.3s;">🎯</div>
          <div class="text-5xl animate-pulse" style="animation-delay: 0.6s;">🎪</div>
        </div>
      </div>
      
      <!-- Game info -->
      <div v-if="session" class="mb-6 p-5 bg-slate-800/60 backdrop-blur-md rounded-2xl border-2 border-purple-500/50">
        <p class="text-base font-black text-purple-300 flex items-center gap-2">
          <span class="text-2xl">🎭</span>
          <span>IMPOSTORES EN JUEGO: <span class="text-2xl impostor-title">{{ session.impostor_count }}</span></span>
        </p>
      </div>
      
      <!-- Players list -->
      <div class="mb-6">
        <h3 class="text-xl font-black text-cyan-400 mb-3 flex items-center gap-2">
          <span class="text-2xl">👥</span>
          JUGADORES ({{ players.length }}):
        </h3>
        <div class="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
          <div
            v-for="(player, index) in players"
            :key="player.id"
            class="flex items-center justify-between p-4 bg-slate-800/60 backdrop-blur-md rounded-xl border-2 border-lime-500/40 shadow-md hover:border-lime-400/60 transition-all slide-in-up"
            :style="{ animationDelay: `${index * 0.1}s` }"
          >
            <span class="font-black text-white flex items-center gap-2">
              <span class="text-2xl">🎮</span>
              {{ player.name }}
            </span>
            <span
              v-if="player.id === playerId"
              class="text-xs bg-gradient-to-br from-cyan-500 to-blue-600 text-white px-3 py-1 rounded-full font-black shadow-lg"
            >
              VOS
            </span>
          </div>
        </div>
      </div>
      
      <!-- Waiting message -->
      <div class="text-center mb-6 bg-slate-800/60 backdrop-blur-md rounded-2xl p-5 border-2 border-amber-500/50">
        <p class="text-lg font-black text-amber-400 flex items-center justify-center gap-2">
          <span class="text-3xl">⏰</span>
          <span>Esperando al host...</span>
        </p>
        <p class="text-sm font-semibold text-gray-400 mt-2">
          ¡El juego comenzará pronto! 🎊
        </p>
      </div>
      
      <!-- Back button -->
      <NeonButton
        variant="back"
        icon="←"
        size="md"
        @click="goBack"
        class="w-full"
      >
        SALIR
      </NeonButton>
    </div>
  </div>
</template>

<style scoped>

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
  0%, 100% { box-shadow: 0 0 40px rgba(0, 255, 135, 0.4), 0 0 80px rgba(168, 85, 247, 0.3); }
  50% { box-shadow: 0 0 60px rgba(96, 239, 255, 0.5), 0 0 100px rgba(236, 72, 153, 0.4); }
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
  background: rgba(132, 204, 22, 0.6);
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(132, 204, 22, 0.8);
}

.slide-in-up {
  animation: slideInUp 0.3s ease-out backwards;
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
