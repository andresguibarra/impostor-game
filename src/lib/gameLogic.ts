import type { Player } from './supabase'
import { getRandomWord } from './wordBank'
import { UI_STRINGS } from './constants'

export interface GameRound {
  word: string
  impostorIds: string[]
}

export function startNewRound(players: Player[], impostorCount: number): GameRound {
  const word = getRandomWord()
  const impostorIds = selectRandomImpostors(players, impostorCount)
  
  return {
    word,
    impostorIds,
  }
}

export function selectRandomImpostors(players: Player[], count: number): string[] {
  const shuffled = [...players].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, players.length)).map(p => p.id)
}

export function isPlayerImpostor(playerId: string, impostorIds: string[]): boolean {
  return impostorIds.includes(playerId)
}

export function getWordForPlayer(playerId: string, word: string, impostorIds: string[]): string {
  return isPlayerImpostor(playerId, impostorIds) ? UI_STRINGS.IMPOSTOR_MESSAGE : word
}
