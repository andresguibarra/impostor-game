<script setup lang="ts">
import { X, Users } from 'lucide-vue-next'
import type { Player } from '../lib/supabase'
import PlayerList from './PlayerList.vue'

defineProps<{
  show: boolean
  players: Player[]
  currentPlayerId: string
  hostId?: string
  firstPlayerId?: string | null
}>()

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <Transition name="modal-fade">
    <div v-if="show" @click="emit('close')" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-lg p-4">
      <div @click.stop class="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 max-w-md w-full border-4 border-cyan-500/50 shadow-[0_0_50px_rgba(6,182,212,0.5)] relative">
        <!-- Close button -->
        <button
          @click="emit('close')"
          class="absolute top-4 right-4 text-white/70 hover:text-white transition-colors cursor-pointer"
        >
          <X :size="24" />
        </button>

        <h3 class="text-3xl font-black text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 flex items-center justify-center gap-2">
          <Users :size="32" class="text-cyan-400" />
          Jugadores ({{ players.length }})
        </h3>

        <!-- Player List -->
        <PlayerList
          :players="players"
          :current-player-id="currentPlayerId"
          :host-id="hostId"
          :first-player-id="firstPlayerId"
        />
      </div>
    </div>
  </Transition>
</template>

<style scoped>
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
  transform: scale(0.9);
}
</style>
