export type JuryPickType = 'player' | 'team'

export type JuryCategoryDefinition = {
  id: string
  title: string
  subtitle: string
  description: string
  pickType: JuryPickType
  category: 'teams' | 'players'
}

export const JURY_CATEGORY_GROUPS = [
  { id: 'teams', label: 'Selecciones' },
  { id: 'players', label: 'Jugadores' },
] as const

export const JURY_CATEGORIES: JuryCategoryDefinition[] = [
  {
    id: 'team_revelation',
    title: 'Selección revelación',
    subtitle: 'Subjetivo',
    description: 'La selección que más sorprenda positivamente en el torneo.',
    pickType: 'team',
    category: 'teams',
  },
  {
    id: 'team_disappointment',
    title: 'Selección decepción',
    subtitle: 'Subjetivo',
    description: 'La selección que más defraude respecto a lo esperado.',
    pickType: 'team',
    category: 'teams',
  },
  {
    id: 'team_entertaining',
    title: 'Selección más entretenida',
    subtitle: 'Subjetivo',
    description: 'La selección más divertida o emocionante de ver en el mundial.',
    pickType: 'team',
    category: 'teams',
  },
  {
    id: 'player_revelation',
    title: 'Jugador revelación',
    subtitle: 'Subjetivo',
    description: 'El jugador emergente o menos esperado que más destaque.',
    pickType: 'player',
    category: 'players',
  },
  {
    id: 'player_disappointment',
    title: 'Jugador decepción',
    subtitle: 'Subjetivo',
    description: 'El jugador estrella o favorito que más quede por debajo de las expectativas.',
    pickType: 'player',
    category: 'players',
  },
  {
    id: 'player_hero',
    title: 'Jugador héroe',
    subtitle: 'Subjetivo',
    description: 'El jugador que más se lleve el torneo con actuaciones decisivas o icónicas.',
    pickType: 'player',
    category: 'players',
  },
]

const categoryById = new Map(JURY_CATEGORIES.map((category) => [category.id, category]))

export function getJuryCategoryById(categoryId: string): JuryCategoryDefinition | undefined {
  return categoryById.get(categoryId)
}

export function isValidJuryCategoryId(categoryId: string): boolean {
  return categoryById.has(categoryId)
}
