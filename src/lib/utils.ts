import { GAME_SETTINGS } from './constants'

// Funny Argentine-inspired name generator
const prefixes = [
  'El', 'La', 'Don', 'Doña', 'Tío', 'Tía', 'Che', 'San', 'Gringo'
]

const names = [
  'Tango', 'Mate', 'Gaucho', 'Pampa', 'Dulce', 'Fernet', 'Asado',
  'Pelusa', 'Messi', 'Diego', 'Evita', 'Gardel', 'Maradona',
  'Birome', 'Colectivo', 'Choripán', 'Alfajor', 'Chimichurri',
  'Pato', 'Truco', 'Boludo', 'Boliche', 'Tango', 'Milonga',
  'Quilmes', 'Malbec', 'Che', 'Pibe', 'Flaco', 'Gordo', 'Negro',
  'Rubio', 'Petiso', 'Grandote', 'Loco', 'Capo', 'Cráneo'
]

const suffixes = [
  'Bailarín', 'Copero', 'Tanguero', 'Asador', 'Hincha', 'Piola',
  'Criollo', 'Porteño', 'Cordobés', 'Salteño', 'Tucumano',
  'Chamigo', 'Pariente', 'Vecino', 'Compadre', 'Amigo'
]

export function generateFunnyName(): string {
  const usePrefix = Math.random() > 0.5
  const useSuffix = Math.random() > 0.5
  
  let name = names[Math.floor(Math.random() * names.length)] ?? 'Che'
  
  if (usePrefix) {
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
    if (prefix) {
      name = `${prefix} ${name}`
    }
  }
  
  if (useSuffix) {
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)]
    if (suffix) {
      name = `${name} ${suffix}`
    }
  }
  
  return name
}

// Generate a short session code (4-6 characters)
export function generateSessionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed confusing characters like I, O, 0, 1
  const length = GAME_SETTINGS.SESSION_CODE_LENGTH
  let code = ''
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// Generate a unique player ID
export function generatePlayerId(): string {
  return `player_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}
