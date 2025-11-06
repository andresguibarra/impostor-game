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
    <!-- Spy-themed background elements -->
    <div class="absolute top-10 left-10 text-6xl opacity-10 flicker">🕵️</div>
    <div class="absolute bottom-20 right-10 text-6xl opacity-10 flicker" style="animation-delay: 1s;">🔍</div>
    <div class="absolute top-1/3 right-20 text-5xl opacity-10 flicker" style="animation-delay: 2s;">🎯</div>
    <div class="absolute bottom-1/3 left-20 text-5xl opacity-10 flicker" style="animation-delay: 1.5s;">🔒</div>
    
    <!-- Configuration warning banner -->
    <div v-if="!isSupabaseConfigured" class="mb-4 max-w-md w-full bg-yellow-900/80 border-l-4 border-yellow-500 text-yellow-200 p-4 rounded-lg shadow-lg card-stealth backdrop-blur-sm">
      <div class="flex items-start">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium">⚠️ Configuración requerida</h3>
          <p class="text-sm mt-1 opacity-90">La aplicación necesita credenciales de Supabase para funcionar. Si sos el administrador, configurá las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.</p>
        </div>
      </div>
    </div>
    
    <div class="dossier-card backdrop-blur-xl rounded-xl shadow-2xl p-8 max-w-md w-full card-stealth relative z-10">
      <!-- Spy-themed header -->
      <div class="text-center mb-2">
        <div class="text-6xl mb-3 flicker">🕵️</div>
        <h1 class="text-5xl font-bold text-gradient-spy mb-3 uppercase tracking-tight" style="font-family: 'Courier New', monospace; letter-spacing: 0.05em;">
          IMPOSTOR
        </h1>
        <div class="h-0.5 w-32 mx-auto bg-gradient-to-r from-transparent via-red-600 to-transparent mb-3"></div>
        <p class="text-lg font-bold text-red-500 mb-2 uppercase tracking-wide">
          Misión: Descubrir al impostor
        </p>
        <p class="text-sm text-slate-400 font-semibold">
          🇦🇷 Juego de infiltración argentina
        </p>
      </div>
      
      <!-- Name input with spy styling -->
      <div class="mb-6 mt-8">
        <label class="block text-sm font-bold text-yellow-500 mb-2 flex items-center gap-2 uppercase tracking-wider">
          <span>🆔</span>
          <span>Nombre de agente (opcional)</span>
        </label>
        <div class="flex gap-2">
          <input 
            v-model="customName"
            type="text"
            placeholder="Dejá vacío para alias random"
            class="flex-1 px-4 py-3 bg-slate-800/50 border-2 border-slate-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 font-semibold text-slate-200 transition-all placeholder-slate-500"
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
            class="px-5 py-3 bg-gradient-intel text-slate-900 rounded-lg hover:opacity-90 transition-all transform hover:scale-105 active:scale-95 shadow-lg text-2xl font-bold"
            title="Generar alias random"
          >
            🎲
          </button>
        </div>
      </div>
      
      <!-- Error message with spy styling -->
      <div v-if="error" class="mb-4 p-4 bg-red-900/50 border-2 border-red-600 text-red-200 rounded-lg text-sm font-semibold slide-in-stealth shadow-lg">
        <span class="text-xl mr-2">⚠️</span>{{ error }}
      </div>
      
      <!-- Create or Join with spy-themed buttons -->
      <div v-if="!isJoining" class="space-y-4">
        <button
          @click="createSession"
          :disabled="loading"
          class="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-5 rounded-lg text-lg font-bold hover:from-red-700 hover:to-red-800 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl btn-spy uppercase tracking-wide"
        >
          <span class="text-xl mr-2">🎯</span>
          {{ loading ? 'Creando misión...' : 'Crear misión' }}
        </button>
        
        <button
          @click="toggleJoinMode"
          class="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-5 rounded-lg text-lg font-bold hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-105 active:scale-95 shadow-xl btn-spy uppercase tracking-wide"
        >
          <span class="text-xl mr-2">🔐</span>
          Unirse a misión
        </button>
      </div>
      
      <!-- Join mode with spy design -->
      <div v-else class="space-y-4">
        <div>
          <label class="block text-sm font-bold text-blue-400 mb-2 flex items-center gap-2 uppercase tracking-wider">
            <span>🔑</span>
            <span>Código de acceso</span>
          </label>
          <input 
            v-model="joinCode"
            type="text"
            placeholder="Ej: AB3C5"
            class="w-full px-5 py-4 bg-slate-800/50 border-2 border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase font-black text-2xl text-center tracking-[0.3em] transition-all text-slate-200 placeholder-slate-600"
            maxlength="6"
            @keyup.enter="joinSession"
          />
        </div>
        
        <button
          @click="joinSession"
          :disabled="loading || !joinCode.trim()"
          class="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-5 rounded-lg text-lg font-bold hover:from-green-700 hover:to-green-800 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl btn-spy uppercase tracking-wide"
        >
          <span class="text-xl mr-2">✓</span>
          {{ loading ? 'Infiltrándose...' : 'Infiltrarse' }}
        </button>
        
        <button
          @click="toggleJoinMode"
          class="w-full bg-slate-700 text-slate-300 py-4 rounded-lg font-bold hover:bg-slate-600 transition-all transform hover:scale-105 active:scale-95 shadow-lg uppercase tracking-wide"
        >
          <span class="text-lg mr-2">←</span>
          Volver
        </button>
      </div>
      
      <div class="mt-8 text-center text-xs text-slate-500 font-semibold uppercase tracking-wider">
        <p>🕵️ Operación clasificada 🔒</p>
        <p class="text-xs opacity-60 mt-1">Mobile-first • Vue 3 + Vite + Tailwind</p>
      </div>
    </div>
  </div>
</template>
