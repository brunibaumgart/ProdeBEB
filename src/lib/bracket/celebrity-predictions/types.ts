import type { Standing } from '@/lib/bracket'
import type { BracketSlotPrediction } from '@/lib/queries/bracket'
import type { ThirdPlaceTiebreakOrder } from '@/lib/bracket/third-place-tiebreak'

export type CelebrityBracketId = 'davo' | 'cobra' | 'maldini-dieguez'

export type CelebrityGroupInputMode = 'scores' | 'standings-only'

export type KnockoutPick = {
  winner: string
  loser: string
}

export type CelebrityBracketSource = {
  id: CelebrityBracketId
  label: string
  shortLabel: string
  description: string
  groupInputMode: CelebrityGroupInputMode
  groupScores?: Record<number, { predHome: number; predAway: number }>
  groupStandingsOrder?: Record<string, string[]>
  thirdPlaceOrder?: string[]
  knockoutPicks: KnockoutPick[]
  championNameEs: string
  galleryImages?: string[]
}

export type CelebrityBracket = CelebrityBracketSource & {
  predictions: Record<number, BracketSlotPrediction>
  tiebreakOrder: ThirdPlaceTiebreakOrder
  groupStandings: Map<string, Standing[]>
  groupsComplete: boolean
  tiebreakComplete: boolean
  knockoutComplete: boolean
  championTeamId: string | null
}
