export const wordBank = [
  // Lugares y Geografía
  "Pampa",
  "Patagonia",
  "Andes",
  "Iguazú",
  "Aconcagua",
  "Glaciar",
  "Puna",
  "Quebrada",
  "Estancia",
  "Rancho",
  
  // Gastronomía
  "Asado",
  "Mate",
  "Empanada",
  "Chimichurri",
  "Choripán",
  "Dulce de leche",
  "Alfajor",
  "Locro",
  "Milanesa",
  "Provoleta",
  "Facturas",
  "Medialunas",
  "Churros",
  "Fernet",
  "Malbec",
  
  // Folklore y Tradiciones
  "Gaucho",
  "Boleadoras",
  "Facón",
  "Rastra",
  "Bombacha",
  "Alpargatas",
  "Poncho",
  "Boina",
  "Chamame",
  "Zamba",
  "Chacarera",
  "Malambo",
  "Tango",
  "Milonga",
  "Payador",
  "Guitarra",
  "Bombo",
  "Bandoneón",
  
  // Animales
  "Ñandú",
  "Guanaco",
  "Vicuña",
  "Puma",
  "Yacaré",
  "Carpincho",
  "Hornero",
  "Cóndor",
  "Chinchilla",
  "Vizcacha",
  "Tucán",
  "Pingüino",
  "Ballena",
  "Lobo marino",
  
  // Plantas
  "Ombú",
  "Ceibo",
  "Quebracho",
  "Algarrobo",
  "Yerba",
  "Cactus",
  "Cardón",
  
  // Personajes y Cultura
  "Martín Fierro",
  "Evita",
  "Maradona",
  "Gardel",
  "Borges",
  "Cortázar",
  "Che Guevara",
  "San Martín",
  
  // Deportes
  "Polo",
  "Pato",
  "Truco",
  "Pelota",
  "Bochas",
  
  // Objetos y Vida Cotidiana
  "Birome",
  "Calefón",
  "Colectivo",
  "Baldosa",
  "Banderín",
  
  // Expresiones y Conceptos
  "Fiesta",
  "Peña",
  "Siesta",
  "Sobremesa",
  "Pulpería",
  "Almacén",
  "Conventillo",
  
  // Naturaleza
  "Pampeano",
  "Serrano",
  "Cordillera",
  "Litoral",
  "Laguna",
  "Río",
  "Delta",
  "Salinas",
  
  // Folklore Mitológico
  "Pachamama",
  "Coquena",
  "Zupay",
  "Kakuy",
  "Añá",
  "Luz mala",
  "Lobizón",
  "Pombero",
  "Yasí Yateré",
  "Curupí",
  
  // Danzas
  "Gato",
  "Escondido",
  "Carnavalito",
  "Huayno",
  "Cueca",
  
  // Instrumentos
  "Charango",
  "Erke",
  "Siku",
  "Quena",
  "Caja",
  
  // Comidas Regionales
  "Humita",
  "Tamales",
  "Carbonada",
  "Cazuela",
  "Puchero",
  "Mondongo",
  "Choclo",
  "Quinoa",
  
  // Bebidas
  "Vino",
  "Torrontés",
  "Quilmes",
  "Mosto",
  "Aloja",
  
  // Textiles
  "Telar",
  "Aguayo",
  "Mantilla",
  "Vincha",
  
  // Trabajo Rural
  "Tropero",
  "Arriero",
  "Domador",
  "Carrero",
  "Chasqui",
  
  // Arquitectura
  "Rancho",
  "Adobe",
  "Quincho",
  "Galería",
  "Alero",
]

export function getRandomWord(): string {
  const index = Math.floor(Math.random() * wordBank.length)
  return wordBank[index] ?? 'Mate'
}
