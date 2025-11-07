<script setup lang="ts">
import { Gamepad2, Crown } from 'lucide-vue-next'
import type { Player } from '../lib/supabase'

const props = defineProps<{
  players: Player[]
  currentPlayerId: string
  hostId?: string
}>()

// Determine host based on hostId prop or first player
// The hostId prop comes from session.host_id which is the authoritative source
// Fallback to first player (sorted by joined_at) when hostId is not provided
const getIsHost = (player: Player) => {
  if (props.hostId) {
    return player.id === props.hostId
  }
  // First player is host by default (players are sorted by joined_at ascending)
  return props.players.length > 0 && props.players[0]?.id === player.id
}
</script>

<template>
  <div class="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
    <div
      v-for="(player, index) in players"
      :key="player.id"
      class="flex items-center justify-between p-4 bg-slate-800/60 backdrop-blur-md rounded-xl border-2 border-cyan-500/40 shadow-md hover:border-cyan-400/60 transition-all slide-in-up"
      :style="{ animationDelay: `${index * 0.05}s` }"
    >
      <span class="font-black text-white flex items-center gap-2">
        <Crown v-if="getIsHost(player)" :size="20" class="text-yellow-400" />
        <Gamepad2 v-else :size="20" />
        {{ player.name }}
      </span>
      <span
        v-if="player.id === currentPlayerId"
        class="text-xs bg-gradient-to-br from-cyan-500 to-blue-600 text-white px-3 py-1 rounded-full font-black shadow-lg"
      >
        YO
      </span>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(30, 41, 59, 0.5);
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(6, 182, 212, 0.6);
  border-radius: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(6, 182, 212, 0.8);
}

.slide-in-up {
  animation: slideInUp 0.3s ease-out backwards;
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
