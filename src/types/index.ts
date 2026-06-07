export type MatchStatus = 'scheduled' | 'live' | 'finished'

export type MatchRound =
  | 'Group Stage'
  | 'Round of 32'
  | 'Round of 16'
  | 'Quarterfinals'
  | 'Semifinals'
  | '3rd Place'
  | 'Final'

export type Position = 'Portero' | 'Defensa' | 'Mediocampista' | 'Delantero'

export type Confederation = 'UEFA' | 'CONMEBOL' | 'CONCACAF' | 'CAF' | 'AFC' | 'OFC'

export const ROUND_LABELS: Record<MatchRound, string> = {
  'Group Stage': 'Fase de Grupos',
  'Round of 32': 'Ronda de 32',
  'Round of 16': 'Octavos de Final',
  Quarterfinals: 'Cuartos de Final',
  Semifinals: 'Semifinales',
  '3rd Place': 'Tercer Puesto',
  Final: 'Final',
}

export const POSITION_CONFIG: Record<Position, { short: string; color: string }> = {
  Portero: { short: 'POR', color: '#F5A623' },
  Defensa: { short: 'DEF', color: '#0066CC' },
  Mediocampista: { short: 'MED', color: '#00A550' },
  Delantero: { short: 'DEL', color: '#E8192C' },
}
