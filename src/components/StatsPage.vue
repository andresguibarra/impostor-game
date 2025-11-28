<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { supabase, isSupabaseConfigured, type Session, type Player } from '../lib/supabase'
import { BarChart2, Users, Calendar, ChevronRight, X, Filter, TrendingUp, Target, Drama, FileText, Gamepad2, ArrowLeft, RefreshCw } from 'lucide-vue-next'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement, Filler } from 'chart.js'
import { Bar, Doughnut, Line } from 'vue-chartjs'
import { useRouter } from 'vue-router'

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement, Filler)

interface RoundHistory {
  id: string
  session_id: string
  round_number: number
  word: string
  impostor_ids: string[]
  first_player_id: string | null
  started_at: string
}

interface SessionWithRounds extends Session {
  players?: Player[]
  rounds?: RoundHistory[]
  finished_at?: string | null
}

const router = useRouter()

const sessions = ref<SessionWithRounds[]>([])
const selectedSession = ref<SessionWithRounds | null>(null)
const loading = ref(true)
const showDetailModal = ref(false)

// Filter states
const dateFilter = ref<'all' | 'today' | 'week' | 'month'>('all')
const playerCountFilter = ref<'all' | '2-4' | '5-8' | '9+'>('all')

// Dashboard tab
const activeTab = ref<'sessions' | 'dashboard'>('dashboard')

// Load all sessions with players and rounds
async function loadSessions() {
  loading.value = true
  try {
    // Load sessions
    const { data: sessionsData, error: sessionsError } = await supabase
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false })

    if (sessionsError) throw sessionsError

    // Load rounds for each session
    const { data: roundsData, error: roundsError } = await supabase
      .from('round_history')
      .select('*')
      .order('round_number', { ascending: true })

    if (roundsError && roundsError.code !== '42P01') {
      // 42P01 means table doesn't exist yet, which is fine
      console.warn('Round history table may not exist yet:', roundsError)
    }

    // Load players for each session
    const { data: playersData, error: playersError } = await supabase
      .from('players')
      .select('*')

    if (playersError) throw playersError

    // Combine data
    sessions.value = (sessionsData || []).map(session => ({
      ...session,
      players: (playersData || []).filter(p => p.session_id === session.code),
      rounds: (roundsData || []).filter(r => r.session_id === session.code)
    }))
  } catch (error) {
    console.error('Error loading sessions:', error)
  } finally {
    loading.value = false
  }
}

// Filtered sessions for display
const filteredSessions = computed(() => {
  let result = [...sessions.value]

  // Date filter
  if (dateFilter.value !== 'all') {
    const now = new Date()
    result = result.filter(session => {
      const createdAt = new Date(session.created_at)
      switch (dateFilter.value) {
        case 'today':
          return createdAt.toDateString() === now.toDateString()
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          return createdAt >= weekAgo
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          return createdAt >= monthAgo
        default:
          return true
      }
    })
  }

  // Player count filter
  if (playerCountFilter.value !== 'all') {
    result = result.filter(session => {
      const count = session.players?.length || 0
      switch (playerCountFilter.value) {
        case '2-4':
          return count >= 2 && count <= 4
        case '5-8':
          return count >= 5 && count <= 8
        case '9+':
          return count >= 9
        default:
          return true
      }
    })
  }

  return result
})

// Stats calculations
const totalSessions = computed(() => filteredSessions.value.length)
const totalPlayers = computed(() => {
  const playerSet = new Set<string>()
  filteredSessions.value.forEach(s => {
    s.players?.forEach(p => playerSet.add(p.id))
  })
  return playerSet.size
})
const totalRounds = computed(() => {
  return filteredSessions.value.reduce((acc, s) => acc + (s.round_number || 0), 0)
})
const avgPlayersPerSession = computed(() => {
  if (totalSessions.value === 0) return 0
  const total = filteredSessions.value.reduce((acc, s) => acc + (s.players?.length || 0), 0)
  return (total / totalSessions.value).toFixed(1)
})

// Chart data for sessions by date
const sessionsByDateData = computed(() => {
  const dateMap = new Map<string, number>()
  filteredSessions.value.forEach(session => {
    const date = new Date(session.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
    dateMap.set(date, (dateMap.get(date) || 0) + 1)
  })
  
  const entries = Array.from(dateMap.entries()).slice(-7).reverse()
  
  return {
    labels: entries.map(e => e[0]),
    datasets: [{
      label: 'Sesiones',
      data: entries.map(e => e[1]),
      backgroundColor: 'rgba(168, 85, 247, 0.7)',
      borderColor: 'rgba(168, 85, 247, 1)',
      borderWidth: 2,
      borderRadius: 8,
    }]
  }
})

// Chart data for players distribution
const playersDistributionData = computed(() => {
  const distribution = { '2-4': 0, '5-8': 0, '9+': 0 }
  filteredSessions.value.forEach(session => {
    const count = session.players?.length || 0
    if (count >= 2 && count <= 4) distribution['2-4']++
    else if (count >= 5 && count <= 8) distribution['5-8']++
    else if (count >= 9) distribution['9+']++
  })
  
  return {
    labels: ['2-4 jugadores', '5-8 jugadores', '9+ jugadores'],
    datasets: [{
      data: [distribution['2-4'], distribution['5-8'], distribution['9+']],
      backgroundColor: [
        'rgba(6, 182, 212, 0.8)',
        'rgba(168, 85, 247, 0.8)',
        'rgba(236, 72, 153, 0.8)',
      ],
      borderColor: [
        'rgba(6, 182, 212, 1)',
        'rgba(168, 85, 247, 1)',
        'rgba(236, 72, 153, 1)',
      ],
      borderWidth: 2,
    }]
  }
})

// Chart data for rounds per session
const roundsPerSessionData = computed(() => {
  const roundsMap = new Map<number, number>()
  filteredSessions.value.forEach(session => {
    const rounds = session.round_number || 0
    if (rounds > 0) {
      roundsMap.set(rounds, (roundsMap.get(rounds) || 0) + 1)
    }
  })
  
  const entries = Array.from(roundsMap.entries()).sort((a, b) => a[0] - b[0]).slice(0, 10)
  
  return {
    labels: entries.map(e => `${e[0]} rondas`),
    datasets: [{
      label: 'Sesiones',
      data: entries.map(e => e[1]),
      borderColor: 'rgba(34, 197, 94, 1)',
      backgroundColor: 'rgba(34, 197, 94, 0.2)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: 'rgba(34, 197, 94, 1)',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 6,
    }]
  }
})

// Chart options
const barChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    title: {
      display: true,
      text: 'Sesiones por Día',
      color: '#fff',
      font: { size: 14, weight: 'bold' as const },
    },
  },
  scales: {
    x: {
      ticks: { color: 'rgba(255,255,255,0.7)' },
      grid: { color: 'rgba(255,255,255,0.1)' },
    },
    y: {
      ticks: { color: 'rgba(255,255,255,0.7)', stepSize: 1 },
      grid: { color: 'rgba(255,255,255,0.1)' },
    },
  },
}

const doughnutChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: { color: 'rgba(255,255,255,0.8)', padding: 15 },
    },
    title: {
      display: true,
      text: 'Distribución de Jugadores',
      color: '#fff',
      font: { size: 14, weight: 'bold' as const },
    },
  },
}

const lineChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    title: {
      display: true,
      text: 'Rondas por Sesión',
      color: '#fff',
      font: { size: 14, weight: 'bold' as const },
    },
  },
  scales: {
    x: {
      ticks: { color: 'rgba(255,255,255,0.7)' },
      grid: { color: 'rgba(255,255,255,0.1)' },
    },
    y: {
      ticks: { color: 'rgba(255,255,255,0.7)', stepSize: 1 },
      grid: { color: 'rgba(255,255,255,0.1)' },
    },
  },
}

// View session detail
function viewSessionDetail(session: SessionWithRounds) {
  selectedSession.value = session
  showDetailModal.value = true
}

function closeDetail() {
  showDetailModal.value = false
  selectedSession.value = null
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Get impostor names for a round
function getImpostorNames(session: SessionWithRounds, impostorIds: string[]) {
  if (!session.players || !impostorIds) return []
  return session.players
    .filter(p => impostorIds.includes(p.id))
    .map(p => p.name)
}

// Get first player name
function getFirstPlayerName(session: SessionWithRounds, firstPlayerId: string | null) {
  if (!session.players || !firstPlayerId) return 'N/A'
  return session.players.find(p => p.id === firstPlayerId)?.name || 'N/A'
}

function goBack() {
  router.push('/')
}

onMounted(() => {
  if (isSupabaseConfigured) {
    loadSessions()
  }
})
</script>

<template>
  <div class="w-full max-w-4xl px-4">
    <!-- Header -->
    <div class="neon-card-impostor shadow-2xl p-6 mb-6">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <BarChart2 :size="32" class="text-purple-400" />
          <h1 class="text-3xl font-black impostor-title">ESTADÍSTICAS</h1>
        </div>
        <button @click="goBack" class="p-2 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 transition-colors">
          <ArrowLeft :size="24" class="text-white" />
        </button>
      </div>
      
      <!-- Tab navigation -->
      <div class="flex gap-2 mb-4">
        <button 
          @click="activeTab = 'dashboard'"
          :class="['flex-1 py-3 px-4 rounded-xl font-bold transition-all', 
            activeTab === 'dashboard' 
              ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg' 
              : 'bg-slate-700/50 text-gray-300 hover:bg-slate-600/50']"
        >
          <TrendingUp :size="18" class="inline mr-2" />
          Dashboard
        </button>
        <button 
          @click="activeTab = 'sessions'"
          :class="['flex-1 py-3 px-4 rounded-xl font-bold transition-all', 
            activeTab === 'sessions' 
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg' 
              : 'bg-slate-700/50 text-gray-300 hover:bg-slate-600/50']"
        >
          <Gamepad2 :size="18" class="inline mr-2" />
          Sesiones
        </button>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap gap-3">
        <div class="flex items-center gap-2">
          <Filter :size="16" class="text-gray-400" />
          <select 
            v-model="dateFilter"
            class="bg-slate-700/80 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">Todas las fechas</option>
            <option value="today">Hoy</option>
            <option value="week">Última semana</option>
            <option value="month">Último mes</option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          <Users :size="16" class="text-gray-400" />
          <select 
            v-model="playerCountFilter"
            class="bg-slate-700/80 text-white text-sm rounded-lg px-3 py-2 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">Todos los jugadores</option>
            <option value="2-4">2-4 jugadores</option>
            <option value="5-8">5-8 jugadores</option>
            <option value="9+">9+ jugadores</option>
          </select>
        </div>
        <button @click="loadSessions" class="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 transition-colors">
          <RefreshCw :size="18" class="text-gray-400" :class="{ 'animate-spin': loading }" />
        </button>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
      <p class="mt-4 text-gray-400 font-medium">Cargando estadísticas...</p>
    </div>

    <!-- Dashboard Tab -->
    <div v-else-if="activeTab === 'dashboard'" class="space-y-6">
      <!-- Stats cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="stat-card">
          <Gamepad2 :size="24" class="text-purple-400 mb-2" />
          <p class="text-3xl font-black text-white">{{ totalSessions }}</p>
          <p class="text-sm text-gray-400">Sesiones</p>
        </div>
        <div class="stat-card">
          <Users :size="24" class="text-cyan-400 mb-2" />
          <p class="text-3xl font-black text-white">{{ totalPlayers }}</p>
          <p class="text-sm text-gray-400">Jugadores únicos</p>
        </div>
        <div class="stat-card">
          <Target :size="24" class="text-green-400 mb-2" />
          <p class="text-3xl font-black text-white">{{ totalRounds }}</p>
          <p class="text-sm text-gray-400">Rondas jugadas</p>
        </div>
        <div class="stat-card">
          <TrendingUp :size="24" class="text-amber-400 mb-2" />
          <p class="text-3xl font-black text-white">{{ avgPlayersPerSession }}</p>
          <p class="text-sm text-gray-400">Prom. jugadores</p>
        </div>
      </div>

      <!-- Charts -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Sessions by date chart -->
        <div class="chart-card">
          <div class="h-64">
            <Bar :data="sessionsByDateData" :options="barChartOptions" />
          </div>
        </div>

        <!-- Players distribution chart -->
        <div class="chart-card">
          <div class="h-64">
            <Doughnut :data="playersDistributionData" :options="doughnutChartOptions" />
          </div>
        </div>

        <!-- Rounds per session chart -->
        <div class="chart-card md:col-span-2">
          <div class="h-64">
            <Line :data="roundsPerSessionData" :options="lineChartOptions" />
          </div>
        </div>
      </div>
    </div>

    <!-- Sessions Tab -->
    <div v-else-if="activeTab === 'sessions'" class="space-y-4">
      <div v-if="filteredSessions.length === 0" class="text-center py-12 bg-slate-800/50 rounded-2xl">
        <Gamepad2 :size="48" class="mx-auto text-gray-500 mb-4" />
        <p class="text-gray-400 font-medium">No hay sesiones que mostrar</p>
        <p class="text-sm text-gray-500 mt-2">Ajustá los filtros o esperá a que se jueguen más partidas</p>
      </div>

      <!-- Sessions list -->
      <div 
        v-for="session in filteredSessions" 
        :key="session.id"
        @click="viewSessionDetail(session)"
        class="session-card"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center">
              <span class="text-xl font-black text-white">{{ session.code }}</span>
            </div>
            <div>
              <p class="text-white font-bold flex items-center gap-2">
                <Calendar :size="14" class="text-gray-400" />
                {{ formatDate(session.created_at) }}
              </p>
              <div class="flex items-center gap-4 mt-1 text-sm text-gray-400">
                <span class="flex items-center gap-1">
                  <Users :size="14" />
                  {{ session.players?.length || 0 }} jugadores
                </span>
                <span class="flex items-center gap-1">
                  <Target :size="14" />
                  {{ session.round_number || 0 }} rondas
                </span>
                <span class="flex items-center gap-1">
                  <Drama :size="14" />
                  {{ session.impostor_count || 1 }} impostores
                </span>
              </div>
            </div>
          </div>
          <ChevronRight :size="24" class="text-gray-500" />
        </div>
      </div>
    </div>

    <!-- Session Detail Modal -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="showDetailModal && selectedSession" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" @click.self="closeDetail">
          <div class="bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border-2 border-purple-500/50 shadow-2xl">
            <!-- Modal header -->
            <div class="p-6 border-b border-slate-700 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center">
                  <span class="text-xl font-black text-white">{{ selectedSession.code }}</span>
                </div>
                <div>
                  <h2 class="text-xl font-bold text-white">Sesión #{{ selectedSession.code }}</h2>
                  <p class="text-sm text-gray-400">{{ formatDate(selectedSession.created_at) }}</p>
                </div>
              </div>
              <button @click="closeDetail" class="p-2 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 transition-colors">
                <X :size="24" class="text-white" />
              </button>
            </div>

            <!-- Modal content -->
            <div class="p-6 overflow-y-auto max-h-[calc(90vh-100px)] custom-scrollbar">
              <!-- Session summary -->
              <div class="grid grid-cols-3 gap-4 mb-6">
                <div class="bg-slate-800/50 rounded-xl p-4 text-center">
                  <Users :size="24" class="mx-auto text-cyan-400 mb-2" />
                  <p class="text-2xl font-bold text-white">{{ selectedSession.players?.length || 0 }}</p>
                  <p class="text-xs text-gray-400">Jugadores</p>
                </div>
                <div class="bg-slate-800/50 rounded-xl p-4 text-center">
                  <Target :size="24" class="mx-auto text-green-400 mb-2" />
                  <p class="text-2xl font-bold text-white">{{ selectedSession.round_number || 0 }}</p>
                  <p class="text-xs text-gray-400">Rondas</p>
                </div>
                <div class="bg-slate-800/50 rounded-xl p-4 text-center">
                  <Drama :size="24" class="mx-auto text-red-400 mb-2" />
                  <p class="text-2xl font-bold text-white">{{ selectedSession.impostor_count || 1 }}</p>
                  <p class="text-xs text-gray-400">Impostores</p>
                </div>
              </div>

              <!-- Players list -->
              <div class="mb-6">
                <h3 class="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <Users :size="20" class="text-cyan-400" />
                  Jugadores
                </h3>
                <div class="flex flex-wrap gap-2">
                  <span 
                    v-for="player in selectedSession.players" 
                    :key="player.id"
                    class="px-3 py-1.5 bg-slate-700/50 rounded-lg text-sm font-medium text-white border border-slate-600"
                  >
                    {{ player.name }}
                    <span v-if="player.id === selectedSession.host_id" class="ml-1 text-amber-400">👑</span>
                  </span>
                </div>
              </div>

              <!-- Rounds history -->
              <div v-if="selectedSession.rounds && selectedSession.rounds.length > 0">
                <h3 class="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <FileText :size="20" class="text-purple-400" />
                  Historial de Rondas
                </h3>
                <div class="space-y-3">
                  <div 
                    v-for="round in selectedSession.rounds" 
                    :key="round.id"
                    class="bg-slate-800/50 rounded-xl p-4 border border-slate-700"
                  >
                    <div class="flex items-center justify-between mb-2">
                      <span class="font-bold text-white">Ronda {{ round.round_number }}</span>
                      <span class="text-sm text-gray-400">{{ formatDate(round.started_at) }}</span>
                    </div>
                    <div class="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p class="text-gray-400 mb-1">Palabra:</p>
                        <p class="text-cyan-400 font-bold">{{ round.word }}</p>
                      </div>
                      <div>
                        <p class="text-gray-400 mb-1">Impostor(es):</p>
                        <p class="text-red-400 font-bold">
                          {{ getImpostorNames(selectedSession, round.impostor_ids).join(', ') || 'N/A' }}
                        </p>
                      </div>
                      <div>
                        <p class="text-gray-400 mb-1">Empieza:</p>
                        <p class="text-green-400 font-bold">{{ getFirstPlayerName(selectedSession, round.first_player_id) }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="text-center py-8 bg-slate-800/30 rounded-xl">
                <FileText :size="32" class="mx-auto text-gray-500 mb-2" />
                <p class="text-gray-400 text-sm">No hay historial de rondas disponible</p>
                <p class="text-gray-500 text-xs mt-1">El historial se guarda a partir de nuevas partidas</p>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
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
}

.impostor-title {
  background: linear-gradient(135deg, #ff6b00 0%, #ff8c00 25%, #ffa500 50%, #ff8c00 75%, #ff6b00 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 4px 12px rgba(255, 140, 0, 0.6));
}

.stat-card {
  background: rgba(30, 41, 59, 0.6);
  backdrop-filter: blur(10px);
  border-radius: 1rem;
  padding: 1.25rem;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  border-color: rgba(168, 85, 247, 0.5);
}

.chart-card {
  background: rgba(30, 41, 59, 0.6);
  backdrop-filter: blur(10px);
  border-radius: 1rem;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.session-card {
  background: rgba(30, 41, 59, 0.6);
  backdrop-filter: blur(10px);
  border-radius: 1rem;
  padding: 1rem 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.2s ease;
}

.session-card:hover {
  background: rgba(30, 41, 59, 0.8);
  border-color: rgba(168, 85, 247, 0.5);
  transform: translateX(4px);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(30, 41, 59, 0.5);
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(168, 85, 247, 0.6);
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(168, 85, 247, 0.8);
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

.modal-fade-enter-active > div,
.modal-fade-leave-active > div {
  transition: transform 0.3s ease;
}

.modal-fade-enter-from > div,
.modal-fade-leave-to > div {
  transform: scale(0.95) translateY(20px);
}
</style>
