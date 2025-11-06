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
    <!-- Floating decorative emojis like in reference -->
    <div class="floating-emoji" style="top: 5%; left: 8%; animation-delay: 0s;">🎭</div>
    <div class="floating-emoji" style="top: 15%; right: 10%; animation-delay: 2s;">🎪</div>
    <div class="floating-emoji" style="bottom: 20%; left: 5%; animation-delay: 4s;">🎉</div>
    <div class="floating-emoji" style="bottom: 30%; right: 8%; animation-delay: 6s; font-size: 120px;">🕵️</div>
    <div class="floating-emoji" style="top: 50%; left: 3%; animation-delay: 8s; font-size: 80px;">🎊</div>
    <div class="floating-emoji" style="top: 60%; right: 5%; animation-delay: 10s; font-size: 90px;">🎮</div>
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

