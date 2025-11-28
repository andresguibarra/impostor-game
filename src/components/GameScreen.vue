<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { supabase, type Player, type Session } from '../lib/supabase'
import { startNewRound, getWordForPlayer } from '../lib/gameLogic'
import { UI_STRINGS } from '../lib/constants'
import { MapPin, Gamepad2, MousePointerClick, Loader2, Eye, RefreshCw, ArrowLeft, Sparkles, Drama, FileText, Search, MessageCircle, Users, Play } from 'lucide-vue-next'
import ShareModal from './ShareModal.vue'
import PlayerListModal from './PlayerListModal.vue'
import NeonButton from './NeonButton.vue'

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
const showCountdown = ref(false)
const countdown = ref(3)
const showShareModal = ref(false)
const showPlayerListModal = ref(false)
const qrCode = ref<string>('')

// Get session data from localStorage or props
const sessionCode = computed(() => props.gameCode || localStorage.getItem('gameCode') || '')
const playerId = computed(() => localStorage.getItem('playerId') || '')
const isHost = computed(() => localStorage.getItem('isHost') === 'true')

let playersSubscription: any = null
let sessionSubscription: any = null

const canStartNewRound = computed(() => {
  return isHost.value && !loading.value
})

// Check if it's the first round (round 1 with no current word assigned yet)
const isFirstRound = computed(() => {
  return session.value?.round_number === 1 && !session.value?.current_word
})

// Get the name of the first player who should start
const firstPlayerName = computed(() => {
  if (!session.value?.first_player_id) return null
  const firstPlayer = players.value.find(p => p.id === session.value?.first_player_id)
  return firstPlayer?.name || null
})

// Check if the current player is the first player
const isFirstPlayer = computed(() => {
  return session.value?.first_player_id === playerId.value
})

// Cleanup function to remove player from database
async function cleanupPlayer() {
  try {
    const playerIdToDelete = playerId.value
    if (playerIdToDelete) {
      console.log('Cleaning up player:', playerIdToDelete)
      
      const { data, error } = await supabase
        .from('players')
        .delete()
        .eq('id', playerIdToDelete)
        .select()

      if (error) {
        console.error('Error deleting player:', error)
      } else {
        console.log('Player deleted successfully:', data)
      }

      // If host, delete the session
      if (isHost.value && sessionCode.value) {
        console.log('Host deleting session:', sessionCode.value)
        const { error: sessionError } = await supabase
          .from('sessions')
          .delete()
          .eq('code', sessionCode.value)
        
        if (sessionError) {
          console.error('Error deleting session:', sessionError)
        } else {
          console.log('Session deleted successfully')
        }
      }
    }
  } catch (err) {
    console.error('Error in cleanup:', err)
  }
}

onMounted(async () => {
  // Check if session exists
  if (!sessionCode.value) {
    router.push('/')
    return
  }

  // Check if player still exists in database (might have been removed on refresh)
  // and re-add them if necessary
  await ensurePlayerExists()

  await loadGameState()

  // Subscribe to player changes with unique channel name
  playersSubscription = supabase
    .channel(`game-players-${sessionCode.value}-${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'players',
        filter: `session_id=eq.${sessionCode.value}`,
      },
      async () => {
        console.log('Player change detected')
        await loadPlayers()
      }
    )
    .subscribe((status) => {
      console.log('Players subscription status:', status)
    })

  // Subscribe to session changes with unique channel name
  sessionSubscription = supabase
    .channel(`game-session-${sessionCode.value}-${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'sessions',
        filter: `code=eq.${sessionCode.value}`,
      },
      async () => {
        console.log('Session change detected')
        await loadGameState()
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
      console.log('Session subscription status:', status)
    })

  // Listen for page unload to cleanup player
  window.addEventListener('beforeunload', () => {
    // Synchronous cleanup attempt
    cleanupPlayer()
  })
})

onUnmounted(() => {
  // Cleanup subscriptions
  if (playersSubscription) {
    playersSubscription.unsubscribe()
  }
  if (sessionSubscription) {
    sessionSubscription.unsubscribe()
  }
  
  // Remove event listener
  window.removeEventListener('beforeunload', cleanupPlayer)
})

async function loadPlayers() {
  console.log('loadPlayers called for session:', sessionCode.value)
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('session_id', sessionCode.value)
    .order('joined_at', { ascending: true })

  if (!error && data) {
    console.log('Players loaded:', data.length, 'players')
    players.value = data
  } else if (error) {
    console.error('Error loading players:', error)
  }
}

async function ensurePlayerExists() {
  // Check if player exists in database
  const playerIdValue = playerId.value
  const playerNameValue = localStorage.getItem('playerName') || 'Player'
  
  const { data: existingPlayer, error: checkError } = await supabase
    .from('players')
    .select('*')
    .eq('id', playerIdValue)
    .eq('session_id', sessionCode.value)
    .single()
  
  // If player doesn't exist (e.g., removed on page refresh), re-add them
  if (checkError && checkError.code === 'PGRST116') {
    console.log('Player not found in database during game, re-adding:', playerIdValue)
    const { error: insertError } = await supabase
      .from('players')
      .insert({
        id: playerIdValue,
        name: playerNameValue,
        session_id: sessionCode.value,
      })
    
    if (insertError) {
      console.error('Error re-adding player during game:', insertError)
    } else {
      console.log('Player successfully re-added to session during game')
      // Reload players to update the UI
      await loadPlayers()
    }
  } else if (!checkError && existingPlayer) {
    console.log('Player already exists in database during game')
  } else if (checkError) {
    console.error('Error checking player existence during game:', checkError)
  }
}

async function openShareModal() {
  showShareModal.value = true

  // Generate QR code
  const QRCode = (await import('qrcode')).default
  const gameUrl = `${window.location.origin}?join=${sessionCode.value}`
  qrCode.value = await QRCode.toDataURL(gameUrl, {
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  })
}

function closeShareModal() {
  showShareModal.value = false
}

function openPlayerListModal() {
  showPlayerListModal.value = true
}

function closePlayerListModal() {
  showPlayerListModal.value = false
}

async function shareInvite() {
  const gameUrl = `${window.location.origin}?join=${sessionCode.value}`

  if (navigator.share) {
    try {
      await navigator.share({
        title: '¡Unite al juego del Impostor!',
        text: `Unite a mi partida con el código: ${sessionCode.value}`,
        url: gameUrl,
      })
    } catch (err) {
      console.error('Error sharing:', err)
    }
  } else {
    // Fallback: copy link to clipboard
    try {
      await navigator.clipboard.writeText(gameUrl)
      alert('Link copiado al portapapeles')
    } catch (err) {
      console.error('Error copying link:', err)
    }
  }
}

async function startCountdown() {
  showCountdown.value = true
  countdown.value = 3

  return new Promise<void>((resolve) => {
    const interval = setInterval(() => {
      countdown.value--

      if (countdown.value <= 0) {
        clearInterval(interval)
        showCountdown.value = false
        resolve()
      }
    }, 1000)
  })
}

async function loadGameState() {
  await loadPlayers()

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

  if (!data) {
    console.log('No session data found, redirecting to home')
    localStorage.removeItem('gameCode')
    localStorage.removeItem('playerId')
    localStorage.removeItem('playerName')
    localStorage.removeItem('isHost')
    router.push('/')
    return
  }

  // Detect if it's a new round by comparing round numbers
  // Also trigger countdown when this is the first load and game has already started (first round)
  const isNewRound = session.value && data.round_number > session.value.round_number
  // First load is either when session is null OR when the previous session had no word (first round just started)
  const hasNoPreviousWord = !session.value?.current_word
  const isFirstLoad = data.current_word && data.impostors && hasNoPreviousWord

  session.value = data

  if (data.current_word && data.impostors) {
    // Show word or impostor status
    const impostorIds = data.impostors as string[]
    isImpostor.value = impostorIds.includes(playerId.value)
    currentWord.value = getWordForPlayer(playerId.value, data.current_word, impostorIds)

    // Hide word and show countdown if it's a new round or first load with game started
    if (isNewRound || isFirstLoad) {
      wordRevealed.value = false
      await startCountdown()
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

    // Determine the new round number
    // For the first round, keep it at 1; for subsequent rounds, increment
    const currentRoundNumber = session.value?.round_number || 0
    const newRoundNumber = isFirstRound.value ? 1 : currentRoundNumber + 1

    // Update session with new round data
    const { error } = await supabase
      .from('sessions')
      .update({
        current_word: round.word,
        impostors: round.impostorIds,
        round_number: newRoundNumber,
        first_player_id: round.firstPlayerId,
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

function toggleWordVisibility() {
  wordRevealed.value = !wordRevealed.value
}

async function goBack() {
  console.log('=== goBack called - starting cleanup ===')
  console.log('Player ID to delete:', playerId.value)
  console.log('Session code:', sessionCode.value)
  console.log('Is host:', isHost.value)
  
  try {
    // First, delete the player
    if (playerId.value) {
      const { error: deleteError } = await supabase
        .from('players')
        .delete()
        .eq('id', playerId.value)
      
      if (deleteError) {
        console.error('Error deleting player:', deleteError)
      } else {
        console.log('Player deleted successfully')
      }
      
      // Small delay to ensure the delete propagates
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    // If host, delete the session
    if (isHost.value && sessionCode.value) {
      const { error: sessionError } = await supabase
        .from('sessions')
        .delete()
        .eq('code', sessionCode.value)
      
      if (sessionError) {
        console.error('Error deleting session:', sessionError)
      } else {
        console.log('Session deleted successfully')
      }
    }
  } catch (err) {
    console.error('Error in goBack cleanup:', err)
  }
  
  console.log('=== Cleanup completed ===')
  
  // Clear localStorage
  localStorage.removeItem('gameCode')
  localStorage.removeItem('playerId')
  localStorage.removeItem('playerName')
  localStorage.removeItem('isHost')
  
  router.push('/')
}
</script>

<template>
  <div
    class="rounded-4xl w-full max-w-lg bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">

    <!-- Countdown Modal -->
    <Transition name="countdown-fade">
      <div v-if="showCountdown"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-lg">
        <div class="text-center">
          <div class="text-8xl md:text-9xl font-black mb-4 countdown-number">
            {{ countdown }}
          </div>
          <p class="text-3xl md:text-4xl font-black text-white mb-2">
            ¡NUEVA RONDA!
          </p>
          <p class="text-xl text-gray-300 font-bold flex items-center justify-center gap-2">
            Preparate para jugar...
            <Gamepad2 :size="24" />
          </p>
        </div>
      </div>
    </Transition>

    <div class="neon-card-impostor shadow-2xl p-8 max-w-lg w-full relative z-10">
      <!-- Header with game info -->
      <div class="text-center mb-6">
        <h2 class="text-4xl font-black impostor-title mb-4">
          RONDA #{{ session?.round_number || 0 }}
        </h2>
        <div class="flex justify-between items-stretch mb-3 gap-3">
          <div @click="openShareModal"
            class="flex-1 bg-gradient-to-br from-purple-600/90 to-fuchsia-600/90 backdrop-blur-md rounded-xl p-3 border-2 border-purple-400/50 shadow-[0_0_20px_rgba(168,85,247,0.4)] cursor-pointer hover:scale-105 transition-transform active:scale-95 flex flex-col justify-center items-center text-center">
            <span class="text-xs font-bold text-white/80 flex items-center gap-1">
              <MapPin :size="14" /> SESIÓN
            </span>
            <p class="text-lg font-black text-white tracking-wider">{{ sessionCode }}</p>
            <p class="text-xs text-white/60 mt-1 flex items-center gap-1">
              <MousePointerClick :size="12" /> Compartir
            </p>
          </div>
          <div @click="openPlayerListModal"
            class="flex-1 bg-gradient-to-br from-cyan-600/90 to-blue-600/90 backdrop-blur-md rounded-xl p-3 border-2 border-cyan-400/50 shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-pointer hover:scale-105 transition-transform active:scale-95 flex flex-col justify-center items-center text-center">
            <span class="text-xs font-bold text-white/80 flex items-center gap-1">
              <Users :size="14" /> JUGADORES
            </span>
            <p class="text-lg font-black text-white">{{ players.length }}</p>
            <p class="text-xs text-white/60 mt-1 flex items-center gap-1">
              <MousePointerClick :size="12" /> Ver lista
            </p>
          </div>
        </div>
      </div>

      <!-- Word reveal section -->
      <div class="mb-6">
        <div v-if="!currentWord"
          class="text-center py-12 bg-slate-800/60 backdrop-blur-md rounded-2xl border-2 border-purple-500/50">
          <p class="text-xl font-black text-gray-300 mb-2 flex items-center justify-center gap-2">
            <Loader2 :size="24" class="animate-spin" />
            Esperando...
          </p>
          <div class="flex justify-center">
            <Sparkles :size="32" class="animate-pulse text-purple-400" />
          </div>
        </div>

        <div v-else>
          <div v-if="!wordRevealed" class="text-center">
            <button @click="revealWord"
              class="w-full p-8 bg-gradient-to-br from-fuchsia-600 via-purple-600 to-pink-600 rounded-3xl text-white text-3xl font-black hover:from-fuchsia-700 hover:via-purple-700 hover:to-pink-700 transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(168,85,247,0.6)] border-2 border-purple-400/50">
              <div class="flex justify-center mb-2">
                <Eye :size="64" class="animate-bounce" />
              </div>
              ¡REVELAR!
              <div class="mt-6 pt-4 border-t-2 border-white/20">
                <p class="text-xs font-semibold text-white/70 flex items-center justify-center gap-1">
                  <MousePointerClick :size="16" />
                  ¡Tocá para ver tu palabra!
                </p>
              </div>
            </button>
          </div>

          <div v-else class="text-center slide-in-up">
            <div @click="toggleWordVisibility" :class="[
              'p-8 rounded-3xl mb-4 shadow-2xl border-4 cursor-pointer hover:scale-105 active:scale-95 transition-all',
              isImpostor
                ? 'bg-gradient-to-br from-red-600 via-orange-600 to-red-700 text-white border-red-400 shadow-[0_0_40px_rgba(239,68,68,0.6)]'
                : 'bg-gradient-to-br from-blue-600 via-cyan-600 to-green-600 text-white border-blue-400 shadow-[0_0_40px_rgba(37,99,235,0.6)]'
            ]">
              <div class="flex justify-center mb-3">
                <Drama v-if="isImpostor" :size="48" class="animate-pulse" />
                <FileText v-else :size="48" class="animate-pulse" />
              </div>
              <p class="text-base font-bold mb-2 opacity-90">
                {{ isImpostor ? '' : 'TU PALABRA:' }}
              </p>
              <p class="text-4xl md:text-5xl font-black tracking-wide [text-shadow:0_0_20px_rgba(255,255,255,0.5)]">
                {{ currentWord }}
              </p>
              <div class="mt-6 pt-4 border-t-2 border-white/20">
                <p class="text-xs font-semibold text-white/70 flex items-center justify-center gap-1">
                  <MousePointerClick :size="16" />
                  Toca de nuevo para ocultar
                </p>
              </div>
            </div>

            <div
              class="text-sm font-semibold text-gray-300 bg-slate-800/60 backdrop-blur-md rounded-2xl p-5 border-2 border-slate-600/50 space-y-3">
              <!-- First player indicator -->
              <div v-if="firstPlayerName"
                class="flex items-center gap-2 p-3 rounded-xl bg-gradient-to-r from-green-600/30 to-emerald-600/30 border border-green-400/50">
                <Play :size="24" class="flex-shrink-0 text-green-400" />
                <span v-if="isFirstPlayer" class="text-green-300">
                  <span class="font-black">¡Te toca empezar!</span>
                </span>
                <span v-else>
                  Empieza: <span class="font-black text-green-300">{{ firstPlayerName }}</span>
                </span>
              </div>
              <p v-if="isImpostor" class="flex items-start gap-2">
                <Drama :size="24" class="flex-shrink-0" />
                <span>¡Adiviná la palabra sin que te descubran!</span>
              </p>
              <p v-else class="flex items-start gap-2">
                <Search :size="24" class="flex-shrink-0" />
                <span>Hay <span class="font-black text-red-400 text-lg">{{ session?.impostor_count }}</span>
                  impostor(es) entre nosotros</span>
              </p>
              <p v-if="!isImpostor" class="flex items-start gap-2">
                <MessageCircle :size="24" class="flex-shrink-0" />
                <span>Hablá con los demás para descubrir al impostor</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions with vibrant buttons -->
      <div class="space-y-3">
        <NeonButton v-if="isHost" @click="newRound" :disabled="!canStartNewRound" variant="success" class="w-full">
          <Loader2 v-if="loading" :size="24" class="animate-spin mr-2" />
          <RefreshCw v-else :size="24" class="mr-2" />
          {{ loading ? 'GENERANDO...' : (isFirstRound ? '¡INICIAR RONDA!' : '¡NUEVA RONDA!') }}
        </NeonButton>

        <NeonButton @click="goBack" variant="back" class="w-full">
          <ArrowLeft :size="20" class="mr-2" />
          SALIR DEL JUEGO
        </NeonButton>
      </div>
    </div>

    <!-- Share Modal with Teleport -->
    <Teleport to="body">
      <ShareModal :show="showShareModal" :session-code="sessionCode" :qr-code="qrCode" @close="closeShareModal"
        @share="shareInvite" />
    </Teleport>

    <!-- Player List Modal with Teleport -->
    <Teleport to="body">
      <PlayerListModal :show="showPlayerListModal" :players="players" :current-player-id="playerId"
        :host-id="session?.host_id" :first-player-id="session?.first_player_id" @close="closePlayerListModal" />
    </Teleport>
  </div>
</template>

<style scoped>
/* Neon card with rainbow border like the reference */
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

  0%,
  100% {
    box-shadow: 0 0 40px rgba(0, 255, 135, 0.4), 0 0 80px rgba(168, 85, 247, 0.3);
  }

  50% {
    box-shadow: 0 0 60px rgba(96, 239, 255, 0.5), 0 0 100px rgba(236, 72, 153, 0.4);
  }
}

/* Impostor title with orange gradient */
.impostor-title {
  background: linear-gradient(135deg, #ff6b00 0%, #ff8c00 25%, #ffa500 50%, #ff8c00 75%, #ff6b00 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 4px 12px rgba(255, 140, 0, 0.6));
  text-shadow: 0 0 30px rgba(255, 140, 0, 0.8);
  animation: titleGlow 2s ease-in-out infinite;
}

@keyframes titleGlow {

  0%,
  100% {
    filter: drop-shadow(0 4px 12px rgba(255, 140, 0, 0.6));
  }

  50% {
    filter: drop-shadow(0 4px 20px rgba(255, 140, 0, 0.9));
  }
}

/* Custom scrollbar */
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

/* Modal transitions */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active>div,
.modal-fade-leave-active>div {
  transition: transform 0.3s ease;
}

.modal-fade-enter-from>div,
.modal-fade-leave-to>div {
  transform: scale(0.9);
}

/* Slide in animations */
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

/* Countdown styles */
.countdown-number {
  background: linear-gradient(135deg, #00ff87 0%, #60efff 25%, #a855f7 50%, #ec4899 75%, #ef4444 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: countdownPulse 1s ease-in-out infinite, countdownGlow 1s ease-in-out infinite;
  filter: drop-shadow(0 0 40px rgba(168, 85, 247, 0.8));
}

@keyframes countdownPulse {

  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.1);
  }
}

@keyframes countdownGlow {

  0%,
  100% {
    filter: drop-shadow(0 0 40px rgba(168, 85, 247, 0.8));
  }

  50% {
    filter: drop-shadow(0 0 60px rgba(96, 239, 255, 0.9));
  }
}

.countdown-fade-enter-active {
  transition: opacity 0.3s ease;
}

.countdown-fade-leave-active {
  transition: opacity 0.5s ease;
}

.countdown-fade-enter-from,
.countdown-fade-leave-to {
  opacity: 0;
}
</style>
