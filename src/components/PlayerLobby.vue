<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { supabase, type Player, type Session } from '../lib/supabase'
import NeonButton from './NeonButton.vue'
import SessionCodeCard from './SessionCodeCard.vue'
import { Gamepad2, Sparkles, Drama, Users, Crown } from 'lucide-vue-next'

const props = defineProps<{
  gameCode: string
}>()

const router = useRouter()

const players = ref<Player[]>([])
const session = ref<Session | null>(null)
const isJoiningGame = ref(false) // Flag to prevent cleanup when joining game

// Get session data from localStorage or props
const sessionCode = computed(() => props.gameCode || localStorage.getItem('gameCode') || '')
const playerId = computed(() => localStorage.getItem('playerId') || '')
const playerName = computed(() => localStorage.getItem('playerName') || '')

let playersSubscription: any = null
let sessionSubscription: any = null

// Cleanup function to remove player from database
async function cleanupPlayerSession() {
  try {
    const playerIdToDelete = playerId.value
    if (playerIdToDelete) {
      console.log('Cleaning up player:', playerIdToDelete)
      await supabase
        .from('players')
        .delete()
        .eq('id', playerIdToDelete)
    }
  } catch (err) {
    console.error('Error in player cleanup:', err)
  }
}

onMounted(async () => {
  // Check if session exists
  if (!sessionCode.value) {
    router.push('/')
    return
  }

  // Load initial data and verify session exists
  await loadPlayers()
  await loadSession()
  
  // If loadSession redirected us, don't continue
  if (!session.value) {
    return
  }
  
  // Check if player still exists in database (might have been removed on refresh)
  // and re-add them if necessary
  await ensurePlayerExists()
  
  // Subscribe to player changes with unique channel name
  playersSubscription = supabase
    .channel(`player-lobby-players-${sessionCode.value}-${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'players',
        filter: `session_id=eq.${sessionCode.value}`,
      },
      async () => {
        console.log('Player change detected in player lobby')
        await loadPlayers()
      }
    )
    .subscribe((status) => {
      console.log('Player lobby players subscription status:', status)
    })
  
  // Subscribe to session changes (to detect game start) with unique channel name
  sessionSubscription = supabase
    .channel(`player-lobby-session-${sessionCode.value}-${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'sessions',
        filter: `code=eq.${sessionCode.value}`,
      },
      async (payload: any) => {
        console.log('Session change detected in player lobby')
        if (payload.new.round_number > 0) {
          isJoiningGame.value = true // Mark that we're joining the game
          router.push(`/game/${sessionCode.value}`)
        }
        await loadSession()
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'sessions',
        filter: `code=eq.${sessionCode.value}`,
      },
      () => {
        console.log('Session deleted, redirecting to home')
        localStorage.removeItem('gameCode')
        localStorage.removeItem('playerId')
        localStorage.removeItem('playerName')
        localStorage.removeItem('isHost')
        router.push('/')
      }
    )
    .subscribe((status) => {
      console.log('Player lobby session subscription status:', status)
    })

  // Listen for page unload to cleanup player
  window.addEventListener('beforeunload', () => {
    // Only cleanup if not joining game
    if (!isJoiningGame.value) {
      cleanupPlayerSession()
    }
  })
})

onUnmounted(() => {
  // Only cleanup if not joining game (meaning user is actually leaving)
  if (!isJoiningGame.value) {
    cleanupPlayerSession()
  }
  
  if (playersSubscription) {
    playersSubscription.unsubscribe()
  }
  if (sessionSubscription) {
    sessionSubscription.unsubscribe()
  }
  
  // Remove event listener
  window.removeEventListener('beforeunload', cleanupPlayerSession)
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
  
  // If session not found or error, redirect to home
  if (error) {
    console.error('Error loading session:', error)
    if (error.code === 'PGRST116') {
      console.log('Session no longer exists, redirecting to home')
      localStorage.removeItem('gameCode')
      localStorage.removeItem('playerId')
      localStorage.removeItem('playerName')
      localStorage.removeItem('isHost')
      router.push('/')
      return
    }
  }
  
  if (data) {
    session.value = data
  } else {
    console.log('No session data found, redirecting to home')
    localStorage.removeItem('gameCode')
    localStorage.removeItem('playerId')
    localStorage.removeItem('playerName')
    localStorage.removeItem('isHost')
    router.push('/')
  }
}

async function ensurePlayerExists() {
  // Check if player exists in database
  const { data: existingPlayer, error: checkError } = await supabase
    .from('players')
    .select('*')
    .eq('id', playerId.value)
    .eq('session_id', sessionCode.value)
    .single()
  
  // If player doesn't exist (e.g., removed on page refresh), re-add them
  if (checkError && checkError.code === 'PGRST116') {
    console.log('Player not found in database, re-adding:', playerId.value)
    const { error: insertError } = await supabase
      .from('players')
      .insert({
        id: playerId.value,
        name: playerName.value,
        session_id: sessionCode.value,
      })
    
    if (insertError) {
      console.error('Error re-adding player:', insertError)
    } else {
      console.log('Player successfully re-added to session')
      // Reload players to update the UI
      await loadPlayers()
    }
  } else if (!checkError && existingPlayer) {
    console.log('Player already exists in database')
  } else if (checkError) {
    console.error('Error checking player existence:', checkError)
  }
}

async function goBack() {
  // Mark that we're intentionally leaving (not joining game)
  isJoiningGame.value = false
  
  // Cleanup player from database
  await cleanupPlayerSession()
  
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
        <h2 class="text-4xl font-black impostor-title mb-4">
          Hola, <span class="font-black text-fuchsia-400">{{ playerName }}</span>! 👋
        </h2>
        
        <!-- Session Code Card Component -->
        <SessionCodeCard :session-code="sessionCode" :show-share-button="true" />
        
        <!-- Combined Waiting animation and message -->
        <div class="bg-slate-800/60 backdrop-blur-md rounded-2xl p-6 border-2 border-amber-500/50">
          <div class="flex justify-center mb-4">
            <div class="flex gap-3">
              <Gamepad2 :size="48" class="animate-pulse text-purple-400" style="animation-delay: 0s;" />
              <Sparkles :size="48" class="animate-pulse text-yellow-400" style="animation-delay: 0.3s;" />
              <Drama :size="48" class="animate-pulse text-red-400" style="animation-delay: 0.6s;" />
            </div>
          </div>
          <p class="text-lg font-black text-amber-400 flex items-center justify-center gap-2">
            <span class="text-3xl">⏰</span>
            <span>Esperando al host...</span>
          </p>
          <p class="text-sm font-semibold text-gray-400 mt-2">
            ¡El juego comenzará pronto! 🎊
          </p>
        </div>
      </div>
      
      <!-- Game info -->
      <div v-if="session" class="mb-6 p-5 bg-slate-800/60 backdrop-blur-md rounded-2xl border-2 border-purple-500/50">
        <p class="text-base font-black text-purple-300 flex items-center gap-2">
          <Drama :size="24" />
          <span>IMPOSTORES EN JUEGO: <span class="text-2xl impostor-title">{{ session.impostor_count }}</span></span>
        </p>
      </div>
      
      <!-- Players list -->
      <div class="mb-6">
        <h3 class="text-xl font-black text-cyan-400 mb-3 flex items-center gap-2">
          <Users :size="24" />
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
              <Crown v-if="index === 0" :size="20" class="text-yellow-400" />
              <Gamepad2 v-else :size="20" />
              {{ player.name }}
            </span>
            <span
              v-if="player.id === playerId"
              class="text-xs bg-gradient-to-br from-cyan-500 to-blue-600 text-white px-3 py-1 rounded-full font-black shadow-lg"
            >
              YO
            </span>
          </div>
        </div>
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
