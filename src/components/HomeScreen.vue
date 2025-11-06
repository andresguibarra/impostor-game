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
    if (!isSupabaseConfigured) {
      throw new Error(SUPABASE_NOT_CONFIGURED_ERROR)
    }
    
    const code = generateSessionCode()
    const playerId = generatePlayerId()
    const playerName = customName.value.trim() || generateFunnyName()
    
    const { error: sessionError } = await supabase
      .from('sessions')
      .insert({
        code,
        host_id: playerId,
        impostor_count: 1,
        round_number: 0,
      })
    
    if (sessionError) throw sessionError
    
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
    if (!isSupabaseConfigured) {
      throw new Error(SUPABASE_NOT_CONFIGURED_ERROR)
    }
    
    const code = joinCode.value.trim().toUpperCase()
    if (!code) {
      error.value = 'Por favor ingresá un código de sesión'
      loading.value = false
      return
    }
    
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
    <!-- Configuration warning banner -->
    <div v-if="!isSupabaseConfigured" class="mb-4 max-w-md w-full bg-yellow-100/95 backdrop-blur-md border-l-4 border-yellow-600 text-yellow-900 p-4 rounded-2xl shadow-lg slide-in-up">
      <div class="flex items-start">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium">⚙️ Configuración requerida</h3>
          <p class="text-sm mt-1">La aplicación necesita credenciales de Supabase para funcionar. Si sos el administrador, configurá las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.</p>
        </div>
      </div>
    </div>
    
    <!-- Main card matching reference -->
    <div class="card-party shadow-2xl p-8 max-w-md w-full relative z-10">
      <!-- Header matching reference -->
      <div class="text-center mb-6">
        <div class="text-8xl mb-4 inline-block">
          <div class="bounce-fun">😎😷</div>
        </div>
        <h1 class="text-6xl font-black mb-3" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif; letter-spacing: -1px; line-height: 1.1;">
          <span class="text-gradient-impostor">IMPOSTOR</span><br/>
        </h1>
        <p class="text-xl font-bold mb-2" style="color: #8b5cf6;">
          ¡Encontrá al impostor! 🕵️
        </p>
      </div>
      
      <!-- Name input -->
      <div class="mb-6 mt-8">
        <label class="block text-sm font-bold mb-2" style="color: #e879f9;">
          ✨ Tu nombre
        </label>
        <div class="flex gap-2">
          <input 
            v-model="customName"
            type="text"
            placeholder="Dejá vacío para nombre random"
            class="flex-1 px-4 py-3 rounded-2xl font-semibold text-gray-800 transition-all"
            style="background: white; border: 3px solid #e879f9;"
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
            class="px-5 py-3 rounded-2xl hover:scale-110 transition-all shadow-lg text-2xl btn-squish"
            style="background: linear-gradient(135deg, #ff9800 0%, #ff5722 100%); color: white;"
            title="Generar nombre random"
          >
            🎲
          </button>
        </div>
      </div>
      
      <!-- Error message -->
      <div v-if="error" class="mb-4 p-4 bg-red-100/90 backdrop-blur-sm text-red-700 rounded-2xl text-sm font-semibold border-2 border-red-400 slide-in-bounce shadow-lg">
        <span class="text-xl mr-2">⚠️</span>{{ error }}
      </div>
      
      <!-- Buttons matching reference exactly -->
      <div v-if="!isJoining" class="space-y-4">
        <button
          @click="createSession"
          :disabled="loading"
          class="w-full py-5 px-6 text-xl font-black hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl btn-squish text-white rounded-2xl"
          style="background: linear-gradient(135deg, #e91e8f 0%, #d81b60 100%);"
        >
          <span class="text-2xl mr-2">🎮</span>
          {{ loading ? 'Creando...' : 'CREAR SESIÓN' }}
        </button>
        
        <button
          @click="toggleJoinMode"
          class="w-full py-5 px-6 text-xl font-black hover:shadow-2xl transition-all shadow-xl btn-squish text-white rounded-2xl"
          style="background: linear-gradient(135deg, #00bfff 0%, #0097a7 100%);"
        >
          <span class="text-2xl mr-2">🚀</span>
          UNIRSE A SESIÓN
        </button>
      </div>
      
      <!-- Join mode -->
      <div v-else class="space-y-4">
        <div>
          <label class="block text-sm font-bold mb-2" style="color: #00bfff;">
            🔑 Código de sesión
          </label>
          <input 
            v-model="joinCode"
            type="text"
            placeholder="Ej: AB3C5"
            class="w-full px-5 py-4 rounded-2xl uppercase font-black text-2xl text-center tracking-[0.3em] transition-all"
            style="background: white; border: 3px solid #00bfff;"
            maxlength="6"
            @keyup.enter="joinSession"
          />
        </div>
        
        <button
          @click="joinSession"
          :disabled="loading || !joinCode.trim()"
          class="w-full py-5 px-6 text-xl font-black hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl btn-squish text-white rounded-2xl"
          style="background: linear-gradient(135deg, #8bc34a 0%, #689f38 100%);"
        >
          <span class="text-2xl mr-2">✨</span>
          {{ loading ? 'Uniéndose...' : 'UNIRSE AHORA!' }}
        </button>
        
        <button
          @click="toggleJoinMode"
          class="w-full py-4 px-6 font-black hover:shadow-xl transition-all shadow-lg btn-squish text-gray-700 rounded-2xl"
          style="background: linear-gradient(135deg, #b0bec5 0%, #90a4ae 100%);"
        >
          <span class="text-xl mr-2">←</span>
          VOLVER
        </button>
      </div>
    </div>
  </div>
</template>
