<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { generateSessionCode, generatePlayerId, generateFunnyName } from '../lib/utils'
import { supabase, isSupabaseConfigured, SUPABASE_NOT_CONFIGURED_ERROR } from '../lib/supabase'
import { Settings, AlertTriangle, Gamepad2, Rocket, Key, Check, ArrowLeft } from 'lucide-vue-next'
import NeonButton from './NeonButton.vue'

const router = useRouter()
const route = useRoute()

const isJoining = ref(false)
const joinCode = ref('')
const customName = ref(generateFunnyName())
const error = ref('')
const loading = ref(false)
const joinCodeInput = ref<HTMLInputElement | null>(null)
const isDiceAnimating = ref(false)
const fromQrCode = ref(false)

// Check for QR join code from URL parameter
onMounted(() => {
  const qrCode = route.query.join
  if (qrCode && typeof qrCode === 'string') {
    joinCode.value = qrCode
    customName.value = generateFunnyName()
    fromQrCode.value = true
    isJoining.value = true
  }
})

// Auto-focus join code input when switching to join mode (only if not from QR)
watch(isJoining, async (newValue) => {
  if (newValue && !fromQrCode.value) {
    await nextTick()
    joinCodeInput.value?.focus()
  }
})

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

    // Save session to localStorage
    localStorage.setItem('gameCode', code)
    localStorage.setItem('playerId', playerId)
    localStorage.setItem('playerName', playerName)
    localStorage.setItem('isHost', 'true')
    
    router.push(`/host/${code}`)
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
    
    const code = joinCode.value.trim()
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

    // Save session to localStorage
    localStorage.setItem('gameCode', code)
    localStorage.setItem('playerId', playerId)
    localStorage.setItem('playerName', playerName)
    localStorage.setItem('isHost', 'false')
    
    // Clear QR code from URL
    router.replace(`/join/${code}`)
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
  fromQrCode.value = false
}

function generateName() {
  customName.value = generateFunnyName()
  isDiceAnimating.value = true
  setTimeout(() => {
    isDiceAnimating.value = false
  }, 600)
}

</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen p-4 relative overflow-hidden dark-impostor-bg">
    <!-- Configuration warning banner -->
    <div v-if="!isSupabaseConfigured" class="mb-4 max-w-md w-full bg-yellow-100/95 backdrop-blur-md border-l-4 border-yellow-600 text-yellow-900 p-4 rounded-2xl shadow-lg slide-in-up">
      <div class="flex items-start">
        <div class="flex-shrink-0">
          <Settings :size="20" class="text-yellow-600" />
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium flex items-center gap-1">
            <Settings :size="16" />
            Configuración requerida
          </h3>
          <p class="text-sm mt-1">La aplicación necesita credenciales de Supabase para funcionar. Si sos el administrador, configurá las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.</p>
        </div>
      </div>
    </div>
    
    <!-- Main card with neon border like the reference image -->
    <div class="neon-card-impostor shadow-2xl p-10 max-w-lg w-full relative z-10">
      <!-- Impostor silhouette header - positioned to overflow top -->
      <div class="text-center">
        <div class="impostor-silhouette-container">
          <img src="../assets/anon.png" alt="Impostor Silhouette" class="impostor-image" />
        </div>

        <h1 class="text-5xl md:text-6xl font-black mb-2 impostor-title tracking-tight">
          IMPOSTOR
        </h1>
        <p class="text-2xl font-bold mb-4 text-cyan-400">
          ¡Encontrá al impostor!
        </p>
      </div>
      
      <!-- Name input with plus icon like reference -->
      <div class="mb-5">
        <label class="block text-base font-bold mb-2.5 text-yellow-400 flex items-center gap-2">
          <span class="text-xl">➕</span> Tu nombre
        </label>
        <div class="flex gap-3 max-w-full">
          <input 
            v-model="customName"
            type="text"
            placeholder=""
            class="flex-1 px-5 py-4 rounded-2xl font-semibold text-white placeholder-gray-500 transition-all focus:ring-4 focus:ring-yellow-500/50 focus:outline-none w-full"
            style="background: rgba(20, 20, 40, 0.8); border: 2px solid rgba(255, 193, 7, 0.5);"
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
            class="px-5 py-4 rounded-2xl hover:scale-110 transition-all shadow-lg text-3xl"
            style="background: rgba(255, 152, 0, 0.3); border: 2px solid #ff9800;"
            title="Generar nombre random"
          >
            <span :class="{ 'dice-shake': isDiceAnimating }" class="inline-block">🎲</span>
          </button>
        </div>
      </div>
      
      <!-- Error message -->
      <div v-if="error" class="mb-5 p-4 bg-red-900/40 backdrop-blur-sm text-red-300 rounded-2xl text-sm font-semibold border-2 border-red-500/50 slide-in-bounce shadow-lg flex items-center gap-2">
        <AlertTriangle :size="20" />
        {{ error }}
      </div>
      
      <!-- Buttons with Neon components -->
      <div v-if="!isJoining" class="space-y-4">
        <NeonButton 
          variant="primary" 
          :disabled="loading"
          @click="createSession"
          class="w-full"
        >
          <Gamepad2 :size="24" class="mr-3" />
          {{ loading ? 'Creando...' : 'NUEVA PARTIDA' }}
        </NeonButton>
        
        <NeonButton 
          variant="secondary"
          @click="toggleJoinMode"
          class="w-full"
        >
          <Rocket :size="24" class="mr-3" />
          UNIRSE A PARTIDA
        </NeonButton>
      </div>
      
      <!-- Join mode -->
      <div v-else class="space-y-4">
        <div>
          <label class="block text-base font-bold mb-2.5 text-cyan-400 flex items-center gap-2">
            <Key :size="20" /> Código de sesión
          </label>
          <input 
            ref="joinCodeInput"
            v-model="joinCode"
            type="tel"
            inputmode="numeric"
            pattern="[0-9]*"
            placeholder="Ej: 123"
            class="w-full px-5 py-5 rounded-2xl font-black text-3xl text-center tracking-widest transition-all focus:ring-4 focus:ring-cyan-500/50 focus:outline-none text-white placeholder-gray-600"
            style="background: rgba(20, 20, 40, 0.8); border: 2px solid rgba(0, 188, 212, 0.5);"
            maxlength="3"
            @keyup.enter="joinSession"
          />
        </div>
        
        <NeonButton 
          variant="success"
          :disabled="loading || !joinCode.trim()"
          @click="joinSession"
          class="w-full"
        >
          <Check :size="24" class="mr-3" />
          {{ loading ? 'Uniéndose...' : 'UNIRSE' }}
        </NeonButton>
        
        <NeonButton 
          variant="back"
          @click="toggleJoinMode"
          class="w-full"
        >
          <ArrowLeft :size="20" class="mr-2" />
          VOLVER
        </NeonButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Dark impostor background */
.dark-impostor-bg {
  background: linear-gradient(135deg, 
    #0a0a15 0%, 
    #1a1a2e 25%, 
    #16213e 50%, 
    #1a1a2e 75%, 
    #0a0a15 100%);
  background-size: 400% 400%;
  animation: gradientShift 15s ease infinite;
}

@keyframes gradientShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

/* Neon card with rainbow border like the reference */
.neon-card-impostor {
  background: rgba(15, 15, 30, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 2rem;
  border: 4px solid transparent;
  min-height: 70vh;
  padding-top: 8em;
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

/* Desktop padding adjustment */
@media (min-width: 768px) {
  .neon-card-impostor {
    padding-top: 9em;
  }
}

@keyframes neonPulse {
  0%, 100% { box-shadow: 0 0 40px rgba(0, 255, 135, 0.4), 0 0 80px rgba(168, 85, 247, 0.3); }
  50% { box-shadow: 0 0 60px rgba(96, 239, 255, 0.5), 0 0 100px rgba(236, 72, 153, 0.4); }
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
  0%, 100% { filter: drop-shadow(0 4px 12px rgba(255, 140, 0, 0.6)); }
  50% { filter: drop-shadow(0 4px 20px rgba(255, 140, 0, 0.9)); }
}

/* Impostor image overflowing the top - absolute positioning with percentage */
.impostor-silhouette-container {
  position: absolute;
  top: -22%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  pointer-events: none;
  width: min(280px, 32vw);
}

.impostor-image {
  width: 100%;
  height: auto;
  filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.6));
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .impostor-silhouette-container {
    top: -16%;
    width: min(220px, 60vw);
  }
}

/* Slide in animations */
@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.slide-in-up {
  animation: slideInUp 0.5s ease-out;
}

.slide-in-bounce {
  animation: slideInUp 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

/* Dice shake animation */
@keyframes diceShake {
  0%, 100% { transform: rotate(0deg) scale(1); }
  10% { transform: rotate(-15deg) scale(1.1); }
  20% { transform: rotate(15deg) scale(1.1); }
  30% { transform: rotate(-15deg) scale(1.1); }
  40% { transform: rotate(15deg) scale(1.1); }
  50% { transform: rotate(-10deg) scale(1.15); }
  60% { transform: rotate(10deg) scale(1.15); }
  70% { transform: rotate(-5deg) scale(1.1); }
  80% { transform: rotate(5deg) scale(1.1); }
  90% { transform: rotate(0deg) scale(1.05); }
}

.dice-shake {
  animation: diceShake 0.6s ease-in-out;
}
</style>
