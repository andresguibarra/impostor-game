<script setup lang="ts">
import { ref } from 'vue'
import { generateSessionCode, generatePlayerId, generateFunnyName } from '../lib/utils'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const emit = defineEmits<{
  createSession: [code: string, playerId: string, playerName: string]
  joinSession: [code: string, playerId: string, playerName: string]
}>()

const isJoining = ref(false)
const joinCode = ref('')
const customName = ref('')
const error = ref('')
const loading = ref(false)

async function createSession() {
  loading.value = true
  error.value = ''
  
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured) {
      throw new Error('La base de datos no está configurada. Por favor, configurá las credenciales de Supabase en las variables de entorno.')
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
      throw new Error('La base de datos no está configurada. Por favor, configurá las credenciales de Supabase en las variables de entorno.')
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
  <div class="flex flex-col items-center justify-center min-h-screen p-4">
    <!-- Configuration warning banner -->
    <div v-if="!isSupabaseConfigured" class="mb-4 max-w-md w-full bg-yellow-100 border-l-4 border-yellow-500 text-yellow-900 p-4 rounded-lg">
      <div class="flex items-start">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium">Configuración requerida</h3>
          <p class="text-sm mt-1">La aplicación necesita credenciales de Supabase para funcionar. Consultá SUPABASE_SETUP.md para más información.</p>
        </div>
      </div>
    </div>
    
    <div class="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
      <h1 class="text-4xl font-bold text-center mb-2 text-purple-600">
        🎭 Impostor Game
      </h1>
      <p class="text-center text-gray-600 mb-8">
        Juego de palabras argentino
      </p>
      
      <!-- Name input -->
      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Tu nombre (opcional)
        </label>
        <div class="flex gap-2">
          <input 
            v-model="customName"
            type="text"
            placeholder="Dejá vacío para nombre random"
            class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            maxlength="20"
          />
          <button
            @click="generateName"
            class="px-4 py-3 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition"
            title="Generar nombre random"
          >
            🎲
          </button>
        </div>
      </div>
      
      <!-- Error message -->
      <div v-if="error" class="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
        {{ error }}
      </div>
      
      <!-- Create or Join -->
      <div v-if="!isJoining" class="space-y-4">
        <button
          @click="createSession"
          :disabled="loading"
          class="w-full bg-purple-600 text-white py-4 rounded-lg text-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ loading ? 'Creando...' : '🎮 Crear Sesión' }}
        </button>
        
        <button
          @click="toggleJoinMode"
          class="w-full bg-white text-purple-600 py-4 rounded-lg text-lg font-semibold border-2 border-purple-600 hover:bg-purple-50 transition"
        >
          🚪 Unirse a Sesión
        </button>
      </div>
      
      <!-- Join mode -->
      <div v-else class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Código de sesión
          </label>
          <input 
            v-model="joinCode"
            type="text"
            placeholder="Ej: AB3C5"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent uppercase"
            maxlength="6"
            @keyup.enter="joinSession"
          />
        </div>
        
        <button
          @click="joinSession"
          :disabled="loading || !joinCode.trim()"
          class="w-full bg-purple-600 text-white py-4 rounded-lg text-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ loading ? 'Uniéndose...' : '✅ Unirse' }}
        </button>
        
        <button
          @click="toggleJoinMode"
          class="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
        >
          ← Volver
        </button>
      </div>
      
      <div class="mt-8 text-center text-sm text-gray-500">
        <p>Mobile-first • Vue 3 + Vite + Tailwind</p>
      </div>
    </div>
  </div>
</template>
