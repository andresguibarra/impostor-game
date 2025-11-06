<script setup lang="ts">
import { ref } from 'vue'
import HomeScreen from './components/HomeScreen.vue'
import HostLobby from './components/HostLobby.vue'
import PlayerLobby from './components/PlayerLobby.vue'
import GameScreen from './components/GameScreen.vue'

type Screen = 'home' | 'host-lobby' | 'player-lobby' | 'game'

const currentScreen = ref<Screen>('home')
const sessionCode = ref<string>('')
const playerId = ref<string>('')
const playerName = ref<string>('')
const isHost = ref<boolean>(false)

function handleCreateSession(code: string, id: string, name: string) {
  sessionCode.value = code
  playerId.value = id
  playerName.value = name
  isHost.value = true
  currentScreen.value = 'host-lobby'
}

function handleJoinSession(code: string, id: string, name: string) {
  sessionCode.value = code
  playerId.value = id
  playerName.value = name
  isHost.value = false
  currentScreen.value = 'player-lobby'
}

function handleStartGame() {
  currentScreen.value = 'game'
}

function handleBackToHome() {
  currentScreen.value = 'home'
  sessionCode.value = ''
  playerId.value = ''
  playerName.value = ''
  isHost.value = false
}
</script>

<template>
  <div class="min-h-screen bg-animated-gradient relative overflow-hidden">
    <!-- Floating animated shapes -->
    <div class="floating-shape" style="bottom: 0; width: 80px; height: 80px; background: radial-gradient(circle, rgba(236, 72, 153, 0.3), transparent); border-radius: 50%;"></div>
    <div class="floating-shape" style="bottom: 0; width: 100px; height: 100px; background: radial-gradient(circle, rgba(245, 158, 11, 0.3), transparent); border-radius: 50%;"></div>
    <div class="floating-shape" style="bottom: 0; width: 60px; height: 60px; background: radial-gradient(circle, rgba(16, 185, 129, 0.3), transparent); border-radius: 50%;"></div>
    <div class="floating-shape" style="bottom: 0; width: 90px; height: 90px; background: radial-gradient(circle, rgba(6, 182, 212, 0.3), transparent); border-radius: 50%;"></div>
    <div class="floating-shape" style="bottom: 0; width: 70px; height: 70px; background: radial-gradient(circle, rgba(168, 85, 247, 0.3), transparent); border-radius: 50%;"></div>
    <HomeScreen 
      v-if="currentScreen === 'home'"
      @create-session="handleCreateSession"
      @join-session="handleJoinSession"
    />
    
    <HostLobby 
      v-else-if="currentScreen === 'host-lobby'"
      :session-code="sessionCode"
      :player-id="playerId"
      :player-name="playerName"
      @start-game="handleStartGame"
      @back="handleBackToHome"
    />
    
    <PlayerLobby 
      v-else-if="currentScreen === 'player-lobby'"
      :session-code="sessionCode"
      :player-id="playerId"
      :player-name="playerName"
      @game-started="handleStartGame"
      @back="handleBackToHome"
    />
    
    <GameScreen 
      v-else-if="currentScreen === 'game'"
      :session-code="sessionCode"
      :player-id="playerId"
      :player-name="playerName"
      :is-host="isHost"
      @back="handleBackToHome"
    />
  </div>
</template>

<style scoped>
</style>

