import { createClient } from '@supabase/supabase-js'

// These would normally be environment variables
// For now, using placeholder values - user needs to set up their own Supabase project
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️  Supabase credentials are not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.')
  console.error('See .env.example and SUPABASE_SETUP.md for instructions.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

export interface Player {
  id: string
  name: string
  session_id: string
  joined_at: string
}

export interface Session {
  id: string
  code: string
  host_id: string
  impostor_count: number
  current_word: string | null
  round_number: number
  created_at: string
  impostors?: string[]
}

export interface GameState {
  sessionCode: string
  playerId: string
  playerName: string
  isHost: boolean
  players: Player[]
  impostorCount: number
  currentWord: string | null
  isImpostor: boolean
  roundNumber: number
}
