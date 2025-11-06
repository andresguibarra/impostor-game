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
  <div class="min-h-screen bg-gradient-to-br from-fuchsia-500 via-amber-400 to-cyan-400">
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

