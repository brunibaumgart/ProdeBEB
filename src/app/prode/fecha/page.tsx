import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { auth } from '@clerk/nextjs/server'

import { AppShell } from '@/components/layout/app-shell'
import { scorerSlotToId } from '@/lib/scoring/scorers'
import { FechaView } from '@/components/prode/fecha-view'
import { canAccessTestContent } from '@/lib/auth/test-access'
import {
  canEditPrediction,
  groupMatchesBySection,
  isMatchPredictable,
} from '@/lib/matches/availability'
import {
  getFinishedPredictions,
  getPredictableMatches,
  getUserPredictionsMap,
} from '@/lib/queries/predictions'
import { getPlayersByTeamIds } from '@/lib/queries/teams'
import { ensureDbUser } from '@/lib/queries/users'
import { prisma } from '@/lib/prisma'

function serializeMatch(
  match: Awaited<ReturnType<typeof getPredictableMatches>>[number]
) {
  return {
    id: match.id,
    date: match.date.toISOString(),
    timeArg: match.timeArg,
    status: match.status,
    round: match.round,
    group: match.group,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeLabel: match.homeLabel,
    awayLabel: match.awayLabel,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    venue: match.venue,
    isTest: match.isTest,
  }
}

export default async function ProdeFechaPage() {
  const user = await ensureDbUser()
  if (!user) return null

  const { userId: clerkId } = await auth()
  const includeTestMatches = await canAccessTestContent(clerkId)
  const matchQueryOptions = { includeTestMatches }

  const [allMatches, predictionsMap, finishedPredictions, globalTournament] =
    await Promise.all([
      getPredictableMatches(matchQueryOptions),
      getUserPredictionsMap(user.id),
      getFinishedPredictions(user.id, matchQueryOptions),
      prisma.tournament.findUnique({
        where: { code: 'GLOBAL' },
        select: { modeScorers: true },
      }),
    ])

  const upcomingMatches = allMatches.filter(
    (match) => match.status === 'scheduled' && isMatchPredictable(match)
  )

  const historyMatches = finishedPredictions.map((prediction) => prediction.match)

  const allVisibleMatches = [...upcomingMatches, ...historyMatches]
  const teamIds = [
    ...new Set(
      allVisibleMatches.flatMap((match) => [match.homeTeamId, match.awayTeamId].filter(Boolean))
    ),
  ] as string[]

  const players = await getPlayersByTeamIds(teamIds)
  const playersByTeamId: Record<
    string,
    { id: string; name: string; position: string }[]
  > = {}

  for (const player of players) {
    if (!playersByTeamId[player.teamId]) {
      playersByTeamId[player.teamId] = []
    }
    playersByTeamId[player.teamId].push({
      id: player.id,
      name: player.name,
      position: player.position,
    })
  }

  const upcomingGrouped = groupMatchesBySection(upcomingMatches)
  const historyGrouped = groupMatchesBySection(historyMatches)

  const upcomingSections = [...upcomingGrouped.entries()].map(([key, value]) => ({
    key,
    label: value.label,
    matches: value.matches.map(serializeMatch),
  }))

  const historySections = [...historyGrouped.entries()].map(([key, value]) => ({
    key,
    label: value.label,
    matches: value.matches.map(serializeMatch),
  }))

  const predictions: Record<
    number,
    {
      predHome: number
      predAway: number
      points: number | null
      pointsScorers: number | null
      homeScorerIds: string[]
      awayScorerIds: string[]
    }
  > = {}

  for (const match of allVisibleMatches) {
    const prediction = predictionsMap.get(match.id)
    if (prediction) {
      predictions[match.id] = {
        predHome: prediction.predHome,
        predAway: prediction.predAway,
        points: prediction.points,
        pointsScorers: prediction.pointsScorers,
        homeScorerIds: prediction.scorers
          .filter((s) => s.isHome)
          .map((s) => scorerSlotToId(s)),
        awayScorerIds: prediction.scorers
          .filter((s) => !s.isHome)
          .map((s) => scorerSlotToId(s)),
      }
    }
  }

  const editableCount = upcomingMatches.filter((match) => canEditPrediction(match)).length
  const scorersEnabled = globalTournament?.modeScorers ?? true

  return (
    <AppShell pathname="/prode">
      <Link
        href="/prode"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Volver al hub
      </Link>

      <div className="mb-6">
        <h1 className="font-heading text-3xl tracking-wide">FECHA A FECHA</h1>
        <p className="mt-2 text-muted-foreground">
          {editableCount} partido{editableCount !== 1 ? 's' : ''} abierto{editableCount !== 1 ? 's' : ''} · cierre 5 min antes del kick-off
          {scorersEnabled && ' · goleadores opcionales'}
        </p>
      </div>

      <FechaView
        upcomingSections={upcomingSections}
        historySections={historySections}
        predictions={predictions}
        playersByTeamId={playersByTeamId}
        scorersEnabled={scorersEnabled}
      />
    </AppShell>
  )
}
