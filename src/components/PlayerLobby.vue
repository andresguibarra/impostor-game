<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { supabase, type Player, type Session } from '../lib/supabase'
import NeonButton from './NeonButton.vue'

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
const toast = ref('')
const showToast = ref(false)

let playersSubscription: any = null
let sessionSubscription: any = null

function displayToast(message: string) {
  toast.value = message
  showToast.value = true
  setTimeout(() => {
    showToast.value = false
  }, 2000)
}

async function copyCode() {
  try {
    await navigator.clipboard.writeText(props.sessionCode)
    displayToast('Código copiado ✅')
  } catch (err) {
    console.error('Error copying code:', err)
  }
}

async function shareInvite() {
  const gameUrl = `${window.location.origin}?join=${props.sessionCode}`
  
  if (navigator.share) {
    try {
      await navigator.share({
        title: '¡Unite al juego del Impostor!',
        text: `Unite a mi partida con el código: ${props.sessionCode}`,
        url: gameUrl,
      })
    } catch (err) {
      // User cancelled or error
      console.error('Error sharing:', err)
    }
  } else {
    // Fallback: copy link to clipboard
    try {
      await navigator.clipboard.writeText(gameUrl)
      displayToast('Link copiado 📋')
    } catch (err) {
      console.error('Error copying link:', err)
    }
  }
}

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
  <div class="flex flex-col items-center justify-center min-h-screen p-4 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
    
    <div class="neon-card-impostor shadow-2xl p-8 max-w-lg w-full relative z-10">
      <!-- Header -->
      <div class="text-center mb-6">
        <div class="text-7xl mb-4">⏳</div>
        <h2 class="text-4xl font-black impostor-title mb-4">
          ¡ESPERANDO!
        </h2>
        <div class="bg-gradient-to-br from-cyan-600/90 to-blue-600/90 backdrop-blur-md rounded-2xl p-5 mb-3 shadow-[0_0_30px_rgba(6,182,212,0.5)] border-2 border-cyan-400/50">
          <p class="text-sm text-white font-bold mb-2 opacity-90">📍 SESIÓN:</p>
          <button 
            @click="copyCode"
            class="text-4xl font-black text-white tracking-[0.2em] [text-shadow:0_0_20px_rgba(255,255,255,0.5)] hover:scale-105 transition-transform cursor-pointer"
          >
            {{ sessionCode }}
          </button>
          <p class="text-xs text-white/70 mt-2">👆 Tocá para copiar</p>
        </div>
        
        <!-- Share button -->
        <button
          @click="shareInvite"
          class="w-full py-3 px-5 bg-gradient-to-br from-emerald-600/80 to-teal-600/80 backdrop-blur-md text-white rounded-xl font-bold text-base hover:from-emerald-700/90 hover:to-teal-700/90 transition-all hover:-translate-y-0.5 cursor-pointer border-2 border-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2 mb-4"
        >
          <span class="text-xl">🔗</span>
          <span>Compartir invitación</span>
        </button>
        
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
        @click="emit('back')"
        class="w-full"
      >
        SALIR
      </NeonButton>
    </div>
    
    <!-- Toast notification -->
    <Transition name="toast">
      <div
        v-if="showToast"
        class="fixed top-8 left-1/2 -translate-x-1/2 bg-gradient-to-br from-green-500 to-emerald-600 text-white px-6 py-3 rounded-2xl font-black shadow-[0_0_30px_rgba(34,197,94,0.6)] border-2 border-green-300/50 z-50"
      >
        {{ toast }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translate(-50%, -20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -20px);
}

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
