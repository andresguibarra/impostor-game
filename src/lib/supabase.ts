import { createClient } from '@supabase/supabase-js'

// These would normally be environment variables
// For now, using placeholder values - user needs to set up their own Supabase project
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Check if credentials are configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.error('⚠️  Supabase credentials are not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
  console.error('See SUPABASE_SETUP.md for instructions.')
}

// Create client with dummy values if not configured to prevent crashes
// The client won't work but at least won't throw errors during initialization
export const supabase = createClient(
  supabaseUrl || 'https://your-project.supabase.co', 
  supabaseAnonKey || 'your-anon-key-here',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
)

// Error message when Supabase is not configured
export const SUPABASE_NOT_CONFIGURED_ERROR = 'La base de datos no está configurada. Por favor, configurá las credenciales de Supabase en las variables de entorno.'

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
