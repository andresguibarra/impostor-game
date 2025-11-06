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

// Generate a short session code (3 digits, 100-999)
export function generateSessionCode(): string {
  // Generate a random number between 100 and 999 (no leading zeros)
  const code = Math.floor(Math.random() * 900) + 100
  return code.toString()
}

// Generate a unique player ID
export function generatePlayerId(): string {
  return `player_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}
