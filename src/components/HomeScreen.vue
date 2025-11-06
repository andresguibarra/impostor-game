<script setup lang="ts">
import { ref } from 'vue'
import { generateSessionCode, generatePlayerId, generateFunnyName } from '../lib/utils'
import { supabase, isSupabaseConfigured, SUPABASE_NOT_CONFIGURED_ERROR } from '../lib/supabase'

const emit = defineEmits<{
  createSession: [code: string, playerId: string, playerName: string]
  joinSession: [code: string, playerId: string, playerName: string]
}>()

const isJoining = ref(false)
const joinCode = ref('')
const customName = ref(generateFunnyName())
const error = ref('')
const loading = ref(false)

async function createSession() {
  loading.value = true
  error.value = ''
  
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured) {
      throw new Error(SUPABASE_NOT_CONFIGURED_ERROR)
    }
    
    const code = generateSessionCode()
    const playerId = generatePlayerId()
    const playerName = customName.value.trim() || generateFunnyName()
    
    // Create session in Supabase
    const { error: sessionError } = await supabase
      .from('sessions')
      .insert({
        code,
        host_id: playerId,
        impostor_count: 1,
        round_number: 0,
      })
    
    if (sessionError) throw sessionError
    
    // Add host as first player
    const { error: playerError } = await supabase
      .from('players')
      .insert({
        id: playerId,
        name: playerName,
        session_id: code,
      })
    
    if (playerError) throw playerError
    
    emit('createSession', code, playerId, playerName)
  } catch (err: any) {
    error.value = err.message || 'Error al crear sesión'
    console.error('Error creating session:', err)
  } finally {
    loading.value = false
  }
}

async function joinSession() {
  loading.value = true
  error.value = ''
  
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured) {
      throw new Error(SUPABASE_NOT_CONFIGURED_ERROR)
    }
    
    const code = joinCode.value.trim().toUpperCase()
    if (!code) {
      error.value = 'Por favor ingresá un código de sesión'
      loading.value = false
      return
    }
    
    // Check if session exists
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('code', code)
      .single()
    
    if (sessionError || !session) {
      error.value = 'Sesión no encontrada'
      loading.value = false
      return
    }
    
    const playerId = generatePlayerId()
    const playerName = customName.value.trim() || generateFunnyName()
    
    // Add player to session
    const { error: playerError } = await supabase
      .from('players')
      .insert({
        id: playerId,
        name: playerName,
        session_id: code,
      })
    
    if (playerError) throw playerError
    
    emit('joinSession', code, playerId, playerName)
  } catch (err: any) {
    error.value = err.message || 'Error al unirse a sesión'
    console.error('Error joining session:', err)
  } finally {
    loading.value = false
  }
}

function toggleJoinMode() {
  isJoining.value = !isJoining.value
  error.value = ''
  joinCode.value = ''
}

function generateName() {
  customName.value = generateFunnyName()
}
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen p-4 relative overflow-hidden">
    <!-- Animated background decorations -->
    <div class="absolute top-10 left-10 text-6xl opacity-20 rotate-slow">🎭</div>
    <div class="absolute bottom-20 right-10 text-6xl opacity-20 emoji-float" style="animation-delay: 0.5s;">🕵️</div>
    <div class="absolute top-1/3 right-20 text-5xl opacity-20 emoji-float" style="animation-delay: 1s;">🎉</div>
    <div class="absolute bottom-1/3 left-20 text-5xl opacity-20 emoji-float" style="animation-delay: 1.5s;">🎪</div>
    
    <!-- Configuration warning banner -->
    <div v-if="!isSupabaseConfigured" class="mb-4 max-w-md w-full bg-amber-100 border-l-4 border-amber-500 text-amber-900 p-4 rounded-2xl shadow-lg card-animate backdrop-blur-sm bg-opacity-95">
      <div class="flex items-start">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium">⚙️ Configuración requerida</h3>
          <p class="text-sm mt-1">La aplicación necesita credenciales de Supabase para funcionar. Si sos el administrador, configurá las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.</p>
        </div>
      </div>
    </div>
    
    <div class="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-8 max-w-md w-full card-animate relative z-10 border-4 border-fuchsia-400">
      <!-- Fun header with gradient text -->
      <div class="text-center mb-2">
        <div class="text-7xl mb-4 bounce-subtle">🎭</div>
        <h1 class="text-5xl font-black text-gradient-party mb-3" style="font-family: 'Comic Sans MS', cursive, sans-serif;">
          IMPOSTOR GAME
        </h1>
        <p class="text-xl font-bold bg-gradient-to-r from-fuchsia-600 to-cyan-600 bg-clip-text text-transparent mb-2">
          ¡Encontrá al impostor! 🕵️
        </p>
        <p class="text-sm text-gray-600 font-semibold">
          🇦🇷 Juego de palabras argentino
        </p>
      </div>
      
      <!-- Name input with fun styling -->
      <div class="mb-6 mt-8">
        <label class="block text-sm font-bold text-fuchsia-600 mb-2 flex items-center gap-2">
          <span>✨</span>
          <span>Tu nombre (opcional)</span>
        </label>
        <div class="flex gap-2">
          <input 
            v-model="customName"
            type="text"
            placeholder="Dejá vacío para nombre random"
            class="flex-1 px-4 py-3 border-3 border-fuchsia-300 rounded-xl focus:ring-4 focus:ring-fuchsia-400 focus:border-fuchsia-500 font-semibold text-gray-800 transition-all bg-gradient-to-r from-white to-fuchsia-50"
            maxlength="20"
            autocomplete="off"
            autocapitalize="off"
            autocorrect="off"
            spellcheck="false"
            aria-autocomplete="none"
            data-1p-ignore="true"
            data-lpignore="true"
            data-form-type="other"
            inputmode="text"
            name="no-autofill"
          />
          <button
            @click="generateName"
            class="px-5 py-3 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-xl hover:from-amber-500 hover:to-orange-600 transition-all transform hover:scale-105 active:scale-95 shadow-lg text-2xl"
            title="Generar nombre random"
          >
            🎲
          </button>
        </div>
      </div>
      
      <!-- Error message with fun styling -->
      <div v-if="error" class="mb-4 p-4 bg-gradient-to-r from-red-100 to-orange-100 text-red-800 rounded-2xl text-sm font-semibold border-2 border-red-400 slide-in-up shadow-lg">
        <span class="text-xl mr-2">⚠️</span>{{ error }}
      </div>
      
      <!-- Create or Join with vibrant buttons -->
      <div v-if="!isJoining" class="space-y-4">
        <button
          @click="createSession"
          :disabled="loading"
          class="w-full bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white py-5 rounded-2xl text-xl font-black hover:from-fuchsia-600 hover:to-pink-700 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl btn-party"
        >
          <span class="text-2xl mr-2">🎮</span>
          {{ loading ? 'Creando...' : 'CREAR SESIÓN' }}
        </button>
        
        <button
          @click="toggleJoinMode"
          class="w-full bg-gradient-to-r from-cyan-400 to-blue-500 text-white py-5 rounded-2xl text-xl font-black hover:from-cyan-500 hover:to-blue-600 transition-all transform hover:scale-105 active:scale-95 shadow-xl btn-party"
        >
          <span class="text-2xl mr-2">🚀</span>
          UNIRSE A SESIÓN
        </button>
      </div>
      
      <!-- Join mode with colorful design -->
      <div v-else class="space-y-4">
        <div>
          <label class="block text-sm font-bold text-cyan-600 mb-2 flex items-center gap-2">
            <span>🔑</span>
            <span>Código de sesión</span>
          </label>
          <input 
            v-model="joinCode"
            type="text"
            placeholder="Ej: AB3C5"
            class="w-full px-5 py-4 border-3 border-cyan-300 rounded-xl focus:ring-4 focus:ring-cyan-400 focus:border-cyan-500 uppercase font-black text-2xl text-center tracking-widest bg-gradient-to-r from-white to-cyan-50 transition-all"
            maxlength="6"
            @keyup.enter="joinSession"
          />
        </div>
        
        <button
          @click="joinSession"
          :disabled="loading || !joinCode.trim()"
          class="w-full bg-gradient-to-r from-lime-400 to-green-500 text-white py-5 rounded-2xl text-xl font-black hover:from-lime-500 hover:to-green-600 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl btn-party"
        >
          <span class="text-2xl mr-2">✨</span>
          {{ loading ? 'Uniéndose...' : 'UNIRSE AHORA!' }}
        </button>
        
        <button
          @click="toggleJoinMode"
          class="w-full bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800 py-4 rounded-2xl font-black hover:from-gray-400 hover:to-gray-500 transition-all transform hover:scale-105 active:scale-95 shadow-lg"
        >
          <span class="text-xl mr-2">←</span>
          VOLVER
        </button>
      </div>
    </div>
  </div>
</template>
