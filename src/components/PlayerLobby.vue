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
  <div class="flex flex-col items-center justify-center min-h-screen p-4">
    <div class="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
      <!-- Header -->
      <div class="text-center mb-6">
        <h2 class="text-3xl font-bold text-purple-600 mb-2">
          🎮 Esperando inicio...
        </h2>
        <div class="bg-purple-100 rounded-lg p-4 mb-4">
          <p class="text-sm text-gray-600 mb-1">Sesión:</p>
          <p class="text-3xl font-bold text-purple-600 tracking-wider">
            {{ sessionCode }}
          </p>
        </div>
        <p class="text-gray-600">
          Hola, <span class="font-bold text-purple-600">{{ playerName }}</span>!
        </p>
      </div>
      
      <!-- Waiting animation -->
      <div class="flex justify-center mb-6">
        <div class="animate-pulse text-6xl">
          ⏳
        </div>
      </div>
      
      <!-- Game info -->
      <div v-if="session" class="mb-6 p-4 bg-purple-50 rounded-lg">
        <p class="text-sm text-gray-700">
          <span class="font-semibold">Impostores:</span> {{ session.impostor_count }}
        </p>
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
      </div>
      
      <p class="text-center text-gray-600 mb-6">
        Esperando a que el host inicie el juego...
      </p>
      
      <!-- Back button -->
      <button
        @click="emit('back')"
        class="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
      >
        ← Salir
      </button>
    </div>
  </div>
</template>
