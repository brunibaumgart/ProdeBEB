import type { MatchRound } from '@/types'

export type KnockoutBracketRound = {
  round: MatchRound
  label: string
  shortLabel: string
  matchIds: number[]
}

/** Filas del grid de la llave (potencia de 2 para alinear feeders). */
export const BRACKET_GRID_ROWS = 16

export type BracketHalf = 'left' | 'right'

export type BracketMatchPlacement = {
  matchId: number
  round: MatchRound
  row: number
  rowSpan: number
  half: BracketHalf
}

/**
 * Árbol oficial FIFA (fixture.json + docs/REGLAS-PASAJES.md).
 * Orden vertical: cada par de R32 alimenta el R16 centrado entre ellos.
 *
 * Mitad izquierda → M101:  M74/M77→89, M73/M75→90 →97;  M83/M84→93, M81/M82→94 →98 →101
 * Mitad derecha  → M102: M76/M78→91, M79/M80→92 →99;  M86/M88→95, M85/M87→96 →100 →102
 */
export const BRACKET_MATCH_PLACEMENTS: BracketMatchPlacement[] = [
  // R32 — mitad izquierda (→ M101)
  { matchId: 74, round: 'Round of 32', row: 1, rowSpan: 1, half: 'left' },
  { matchId: 77, round: 'Round of 32', row: 2, rowSpan: 1, half: 'left' },
  { matchId: 73, round: 'Round of 32', row: 3, rowSpan: 1, half: 'left' },
  { matchId: 75, round: 'Round of 32', row: 4, rowSpan: 1, half: 'left' },
  { matchId: 83, round: 'Round of 32', row: 5, rowSpan: 1, half: 'left' },
  { matchId: 84, round: 'Round of 32', row: 6, rowSpan: 1, half: 'left' },
  { matchId: 81, round: 'Round of 32', row: 7, rowSpan: 1, half: 'left' },
  { matchId: 82, round: 'Round of 32', row: 8, rowSpan: 1, half: 'left' },
  // R32 — mitad derecha (→ M102)
  { matchId: 76, round: 'Round of 32', row: 9, rowSpan: 1, half: 'right' },
  { matchId: 78, round: 'Round of 32', row: 10, rowSpan: 1, half: 'right' },
  { matchId: 79, round: 'Round of 32', row: 11, rowSpan: 1, half: 'right' },
  { matchId: 80, round: 'Round of 32', row: 12, rowSpan: 1, half: 'right' },
  { matchId: 86, round: 'Round of 32', row: 13, rowSpan: 1, half: 'right' },
  { matchId: 88, round: 'Round of 32', row: 14, rowSpan: 1, half: 'right' },
  { matchId: 85, round: 'Round of 32', row: 15, rowSpan: 1, half: 'right' },
  { matchId: 87, round: 'Round of 32', row: 16, rowSpan: 1, half: 'right' },
  // R16
  { matchId: 89, round: 'Round of 16', row: 1, rowSpan: 2, half: 'left' },
  { matchId: 90, round: 'Round of 16', row: 3, rowSpan: 2, half: 'left' },
  { matchId: 93, round: 'Round of 16', row: 5, rowSpan: 2, half: 'left' },
  { matchId: 94, round: 'Round of 16', row: 7, rowSpan: 2, half: 'left' },
  { matchId: 91, round: 'Round of 16', row: 9, rowSpan: 2, half: 'right' },
  { matchId: 92, round: 'Round of 16', row: 11, rowSpan: 2, half: 'right' },
  { matchId: 95, round: 'Round of 16', row: 13, rowSpan: 2, half: 'right' },
  { matchId: 96, round: 'Round of 16', row: 15, rowSpan: 2, half: 'right' },
  // Cuartos
  { matchId: 97, round: 'Quarterfinals', row: 1, rowSpan: 4, half: 'left' },
  { matchId: 98, round: 'Quarterfinals', row: 5, rowSpan: 4, half: 'left' },
  { matchId: 99, round: 'Quarterfinals', row: 9, rowSpan: 4, half: 'right' },
  { matchId: 100, round: 'Quarterfinals', row: 13, rowSpan: 4, half: 'right' },
  // Semis
  { matchId: 101, round: 'Semifinals', row: 1, rowSpan: 8, half: 'left' },
  { matchId: 102, round: 'Semifinals', row: 9, rowSpan: 8, half: 'right' },
  // Final
  { matchId: 104, round: 'Final', row: 1, rowSpan: 16, half: 'left' },
]

/** R32 → R16 inmediato (ambos feeders comparten destino). */
const R32_TO_R16: Record<number, number> = {
  74: 89,
  77: 89,
  73: 90,
  75: 90,
  83: 93,
  84: 93,
  81: 94,
  82: 94,
  76: 91,
  78: 91,
  79: 92,
  80: 92,
  86: 95,
  88: 95,
  85: 96,
  87: 96,
}

/** Ganador de Mx → siguiente partido en su rama. */
const WINNER_ADVANCES_TO: Record<number, number> = {
  89: 97,
  90: 97,
  93: 98,
  94: 98,
  91: 99,
  92: 99,
  95: 100,
  96: 100,
  97: 101,
  98: 101,
  99: 102,
  100: 102,
  101: 104,
  102: 104,
}

/** Rondas para tabs mobile y progreso (orden del árbol). */
export const KNOCKOUT_BRACKET_ROUNDS: KnockoutBracketRound[] = [
  {
    round: 'Round of 32',
    label: 'Dieciseisavos',
    shortLabel: '16avos',
    matchIds: BRACKET_MATCH_PLACEMENTS.filter((slot) => slot.round === 'Round of 32').map(
      (slot) => slot.matchId,
    ),
  },
  {
    round: 'Round of 16',
    label: 'Octavos',
    shortLabel: '8vos',
    matchIds: BRACKET_MATCH_PLACEMENTS.filter((slot) => slot.round === 'Round of 16').map(
      (slot) => slot.matchId,
    ),
  },
  {
    round: 'Quarterfinals',
    label: 'Cuartos',
    shortLabel: '4tos',
    matchIds: BRACKET_MATCH_PLACEMENTS.filter((slot) => slot.round === 'Quarterfinals').map(
      (slot) => slot.matchId,
    ),
  },
  {
    round: 'Semifinals',
    label: 'Semifinal',
    shortLabel: 'Semi',
    matchIds: BRACKET_MATCH_PLACEMENTS.filter((slot) => slot.round === 'Semifinals').map(
      (slot) => slot.matchId,
    ),
  },
  {
    round: 'Final',
    label: 'Final',
    shortLabel: 'Final',
    matchIds: [104],
  },
]

export const KNOCKOUT_THIRD_PLACE_ROUND: KnockoutBracketRound = {
  round: '3rd Place',
  label: 'Tercer puesto',
  shortLabel: '3°',
  matchIds: [103],
}

/** Tabs móviles: orden del torneo, tercer puesto antes de la final. */
export const KNOCKOUT_MOBILE_TAB_ROUNDS: KnockoutBracketRound[] = [
  ...KNOCKOUT_BRACKET_ROUNDS.slice(0, -1),
  KNOCKOUT_THIRD_PLACE_ROUND,
  KNOCKOUT_BRACKET_ROUNDS[KNOCKOUT_BRACKET_ROUNDS.length - 1]!,
]

export function getKnockoutBracketRoundIndex(round: KnockoutBracketRound): number {
  if (round.round === '3rd Place') return -1
  return KNOCKOUT_BRACKET_ROUNDS.findIndex((entry) => entry.round === round.round)
}

export function getKnockoutRoundUnlockDeps(
  round: KnockoutBracketRound,
): number[] {
  if (round.round === '3rd Place') return [101, 102]
  const bracketIndex = getKnockoutBracketRoundIndex(round)
  if (bracketIndex < 0) return []
  return getPreviousRoundMatchIds(bracketIndex)
}

export const BRACKET_ROUND_COLUMNS: {
  round: MatchRound
  label: string
  shortLabel: string
  column: number
}[] = [
  { round: 'Round of 32', label: 'Dieciseisavos', shortLabel: 'R32', column: 1 },
  { round: 'Round of 16', label: 'Octavos', shortLabel: 'R16', column: 2 },
  { round: 'Quarterfinals', label: 'Cuartos', shortLabel: 'CF', column: 3 },
  { round: 'Semifinals', label: 'Semifinal', shortLabel: 'SF', column: 4 },
  { round: 'Final', label: 'Final', shortLabel: 'F', column: 5 },
]

const PLACEMENT_BY_MATCH_ID = new Map(
  BRACKET_MATCH_PLACEMENTS.map((slot) => [slot.matchId, slot]),
)

export function getBracketMatchPlacement(matchId: number): BracketMatchPlacement | undefined {
  return PLACEMENT_BY_MATCH_ID.get(matchId)
}

export function getKnockoutRoundIndex(matchId: number): number {
  return KNOCKOUT_BRACKET_ROUNDS.findIndex((round) => round.matchIds.includes(matchId))
}

/** Partidos posteriores en la misma rama que deben invalidarse al cambiar uno anterior. */
export function getDownstreamKnockoutMatchIds(matchId: number): number[] {
  if (matchId === 103) return []

  const ids: number[] = []
  let cursor: number | undefined = R32_TO_R16[matchId] ?? matchId

  if (R32_TO_R16[matchId]) {
    ids.push(cursor)
  }

  while (cursor != null && WINNER_ADVANCES_TO[cursor]) {
    cursor = WINNER_ADVANCES_TO[cursor]
    ids.push(cursor)
  }

  if (ids.some((id) => id >= 101) || matchId >= 101) {
    if (!ids.includes(103)) ids.push(103)
  }

  return ids
}

export function getPreviousRoundMatchIds(roundIndex: number): number[] {
  if (roundIndex <= 0) return []
  return KNOCKOUT_BRACKET_ROUNDS[roundIndex - 1].matchIds
}

/** Filas del árbol espejado en desktop (mitad izq. y der. alineadas). */
export const DESKTOP_MIRROR_GRID_ROWS = 8

const DESKTOP_LEFT_ROUND_COLUMNS = [1, 3, 5, 7] as const
const DESKTOP_RIGHT_ROUND_COLUMNS = [17, 15, 13, 11] as const
export const DESKTOP_FINAL_COLUMN = 9

export type DesktopMirrorPlacement = {
  matchColumn: number
  connectorColumn: number | null
  connectorDirection: 'left' | 'right'
  row: number
  rowSpan: number
}

export const DESKTOP_MIRROR_HEADER_COLUMNS = [
  { shortLabel: '16avos', column: 1 },
  { shortLabel: '8vos', column: 3 },
  { shortLabel: '4tos', column: 5 },
  { shortLabel: 'Semi', column: 7 },
  { shortLabel: 'Final', column: DESKTOP_FINAL_COLUMN },
  { shortLabel: 'Semi', column: 11 },
  { shortLabel: '4tos', column: 13 },
  { shortLabel: '8vos', column: 15 },
  { shortLabel: '16avos', column: 17 },
] as const

export const DESKTOP_MIRROR_GRID_COLUMNS =
  'minmax(5.5rem,1fr) 0.75rem minmax(5.5rem,1fr) 0.75rem minmax(5.5rem,1fr) 0.75rem minmax(5.5rem,1fr) 0.75rem minmax(6rem,1.1fr) 0.75rem minmax(5.5rem,1fr) 0.75rem minmax(5.5rem,1fr) 0.75rem minmax(5.5rem,1fr) 0.75rem minmax(5.5rem,1fr) 0.75rem minmax(5.5rem,1fr)'

export function getDesktopMirrorPlacement(matchId: number): DesktopMirrorPlacement | null {
  const slot = getBracketMatchPlacement(matchId)
  if (!slot) return null

  const roundIndex = getKnockoutRoundIndex(matchId)

  if (matchId === 104) {
    return {
      matchColumn: DESKTOP_FINAL_COLUMN,
      connectorColumn: null,
      connectorDirection: 'right',
      row: 1,
      rowSpan: DESKTOP_MIRROR_GRID_ROWS,
    }
  }

  if (slot.half === 'left') {
    const matchColumn = DESKTOP_LEFT_ROUND_COLUMNS[roundIndex] ?? DESKTOP_FINAL_COLUMN
    return {
      matchColumn,
      connectorColumn: roundIndex < DESKTOP_LEFT_ROUND_COLUMNS.length ? matchColumn + 1 : null,
      connectorDirection: 'right',
      row: slot.row,
      rowSpan: slot.rowSpan,
    }
  }

  const matchColumn = DESKTOP_RIGHT_ROUND_COLUMNS[roundIndex] ?? DESKTOP_FINAL_COLUMN
  return {
    matchColumn,
    connectorColumn: roundIndex < DESKTOP_RIGHT_ROUND_COLUMNS.length ? matchColumn - 1 : null,
    connectorDirection: 'left',
    row: slot.row - 8,
    rowSpan: slot.rowSpan,
  }
}
