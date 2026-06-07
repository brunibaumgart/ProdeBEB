export type AwardPickType = 'player' | 'team'

export type AwardPlayerFilter = 'any' | 'goalkeeper'

export type WorldCupAwardDefinition = {
  id: string
  title: string
  subtitle: string
  description: string
  pickType: AwardPickType
  playerFilter?: AwardPlayerFilter
  category: 'individual' | 'team' | 'stats'
}

export const WORLD_CUP_AWARD_CATEGORIES = [
  { id: 'individual', label: 'Distinciones individuales FIFA' },
  { id: 'team', label: 'Distinciones por selección' },
  { id: 'stats', label: 'Estadísticas del torneo' },
] as const

export const WORLD_CUP_AWARDS: WorldCupAwardDefinition[] = [
  {
    id: 'top_scorer',
    title: 'Máximo goleador',
    subtitle: 'Bota de Oro',
    description: 'Jugador que más goles convierta en el mundial.',
    pickType: 'player',
    playerFilter: 'any',
    category: 'individual',
  },
  {
    id: 'best_player',
    title: 'Mejor jugador',
    subtitle: 'Balón de Oro',
    description: 'Mejor futbolista del torneo.',
    pickType: 'player',
    playerFilter: 'any',
    category: 'individual',
  },
  {
    id: 'best_young_player',
    title: 'Mejor jugador joven',
    subtitle: 'Premio FIFA',
    description: 'Mejor jugador elegible por edad (nacido a partir del 1 ene 2004).',
    pickType: 'player',
    playerFilter: 'any',
    category: 'individual',
  },
  {
    id: 'best_goalkeeper',
    title: 'Mejor arquero',
    subtitle: 'Guante de Oro',
    description: 'Arquero destacado del torneo.',
    pickType: 'player',
    playerFilter: 'goalkeeper',
    category: 'individual',
  },
  {
    id: 'top_assist',
    title: 'Máximo asistente',
    subtitle: 'Estadística',
    description: 'Jugador con más asistencias de gol en el torneo.',
    pickType: 'player',
    playerFilter: 'any',
    category: 'individual',
  },
  {
    id: 'goal_of_tournament',
    title: 'Gol del torneo',
    subtitle: 'Premio FIFA',
    description: 'Autor del gol elegido como el mejor del mundial.',
    pickType: 'player',
    playerFilter: 'any',
    category: 'individual',
  },
  {
    id: 'fair_play_team',
    title: 'Fair Play',
    subtitle: 'Premio FIFA',
    description: 'Selección con mejor comportamiento deportivo.',
    pickType: 'team',
    category: 'team',
  },
  {
    id: 'team_most_goals',
    title: 'Selección goleadora',
    subtitle: 'Estadística',
    description: 'Equipo que más goles marque en el torneo.',
    pickType: 'team',
    category: 'stats',
  },
  {
    id: 'team_best_defense',
    title: 'Mejor defensa',
    subtitle: 'Estadística',
    description: 'Selección que menos goles reciba en el torneo.',
    pickType: 'team',
    category: 'stats',
  },
  {
    id: 'team_most_cards',
    title: 'Selección más indisciplinada',
    subtitle: 'Estadística',
    description: 'Equipo con más tarjetas amarillas y rojas en el torneo.',
    pickType: 'team',
    category: 'stats',
  },
]

const awardById = new Map(WORLD_CUP_AWARDS.map((award) => [award.id, award]))

export function getWorldCupAwardById(awardId: string): WorldCupAwardDefinition | undefined {
  return awardById.get(awardId)
}

export function isValidWorldCupAwardId(awardId: string): boolean {
  return awardById.has(awardId)
}
