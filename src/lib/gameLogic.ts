import type { Player } from './supabase'
import { getRandomWord } from './wordBank'
import { UI_STRINGS } from './constants'

export interface GameRound {
  word: string
  impostorIds: string[]
  firstPlayerId: string
}

// Probability that the impostor starts (5%)
const IMPOSTOR_START_PROBABILITY = 0.05

export function startNewRound(players: Player[], impostorCount: number): GameRound {
  const word = getRandomWord()
  const impostorIds = selectRandomImpostors(players, impostorCount)
  const firstPlayerId = selectFirstPlayer(players, impostorIds)
  
  return {
    word,
    impostorIds,
    firstPlayerId,
  }
}

export function selectFirstPlayer(players: Player[], impostorIds: string[]): string {
  if (players.length === 0) return ''
  
  // Separate players into impostors and non-impostors
  const nonImpostors = players.filter(p => !impostorIds.includes(p.id))
  const impostors = players.filter(p => impostorIds.includes(p.id))
  
  // If everyone is an impostor, randomly select one
  if (nonImpostors.length === 0) {
    return selectRandomFromArray(impostors)
  }
  
  // If there are no impostors, randomly select a non-impostor
  if (impostors.length === 0) {
    return selectRandomFromArray(nonImpostors)
  }
  
  // 5% chance that an impostor starts, 95% chance a non-impostor starts
  const impostorStarts = Math.random() < IMPOSTOR_START_PROBABILITY
  
  return impostorStarts 
    ? selectRandomFromArray(impostors) 
    : selectRandomFromArray(nonImpostors)
}

function selectRandomFromArray(players: Player[]): string {
  if (players.length === 0) return ''
  const selected = players[Math.floor(Math.random() * players.length)]
  return selected?.id ?? ''
}

export function selectRandomImpostors(players: Player[], count: number): string[] {
  // Fisher-Yates shuffle algorithm for true randomness
  const shuffled = [...players]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = shuffled[i]
    if (temp && shuffled[j]) {
      shuffled[i] = shuffled[j]
      shuffled[j] = temp
    }
  }
  return shuffled.slice(0, Math.min(count, players.length)).map(p => p.id)
}

export function isPlayerImpostor(playerId: string, impostorIds: string[]): boolean {
  return impostorIds.includes(playerId)
}

export function getWordForPlayer(playerId: string, word: string, impostorIds: string[]): string {
  return isPlayerImpostor(playerId, impostorIds) ? UI_STRINGS.IMPOSTOR_MESSAGE : word
}
