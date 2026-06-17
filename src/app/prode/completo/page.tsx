import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { AppShell } from '@/components/layout/app-shell'
import { CompletoWizard } from '@/components/prode/completo-wizard'
import { getGroupStageSyncStats } from '@/app/actions/sync-predictions'
import { resolveGroupStandingsFromDb } from '@/lib/bracket'
import { isBracketGloballyLocked, BRACKET_LOCK_LABEL } from '@/lib/bracket/lock'
import { getBracketEntryForUser, slotsToPredictionsMap } from '@/lib/queries/bracket'
import { parseThirdPlaceTiebreakOrder } from '@/lib/bracket/third-place-tiebreak'
import { getGroupStageMatches, getKnockoutMatches } from '@/lib/queries/matches'
import { getAllTeams } from '@/lib/queries/teams'
import { ensureDbUser } from '@/lib/queries/users'
import { prisma } from '@/lib/prisma'

function serializeMatch(
  match: Awaited<ReturnType<typeof getGroupStageMatches>>[number]
) {
  return {
    id: match.id,
    round: match.round,
    group: match.group,
    homeLabel: match.homeLabel,
    awayLabel: match.awayLabel,
    homeTeam: match.homeTeam
      ? {
          name: match.homeTeam.name,
          nameEs: match.homeTeam.nameEs,
          iso2: match.homeTeam.iso2,
          flagEmoji: match.homeTeam.flagEmoji,
        }
      : null,
    awayTeam: match.awayTeam
      ? {
          name: match.awayTeam.name,
          nameEs: match.awayTeam.nameEs,
          iso2: match.awayTeam.iso2,
          flagEmoji: match.awayTeam.flagEmoji,
        }
      : null,
  }
}

async function getActualGroupStandings() {
  const unfinished = await prisma.match.count({
    where: { round: 'Group Stage', status: { not: 'finished' } },
  })
  if (unfinished > 0) return {}

  const [teams, groupMatches] = await Promise.all([getAllTeams(), getGroupStageMatches()])
  const groups = [...new Set(teams.map((team) => team.group))].sort()
  const result: Record<string, Awaited<ReturnType<typeof resolveGroupStandingsFromDb>>> = {}

  for (const group of groups) {
    const groupTeams = teams.filter((team) => team.group === group)
    const matches = groupMatches.filter((match) => match.group === group)
    result[group] = resolveGroupStandingsFromDb(groupTeams, matches, group)
  }

  return result
}

export default async function ProdeCompletoPage() {
  const user = await ensureDbUser()
  if (!user) return null

  const [teams, groupMatches, knockoutMatches, entry, syncStats, finishedMatches, actualGroupStandings] =
    await Promise.all([
      getAllTeams(),
      getGroupStageMatches(),
      getKnockoutMatches(),
      getBracketEntryForUser(user.id),
      getGroupStageSyncStats(user.id),
      prisma.match.findMany({
        where: {
          status: 'finished',
          homeScore: { not: null },
          awayScore: { not: null },
        },
        include: { homeTeam: true, awayTeam: true },
      }),
      getActualGroupStandings(),
    ])

  const initialPredictions = slotsToPredictionsMap(entry?.slots ?? [])

  return (
    <AppShell pathname="/prode">
      <Link
        href="/prode"
        className="mb-6 hidden items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground lg:inline-flex"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Volver al hub
      </Link>

      <div className="mb-6 hidden lg:block">
        <h1 className="font-heading text-3xl tracking-wide">PRODE COMPLETO</h1>
        <p className="mt-2 text-muted-foreground">
          Tu prode o las predicciones de referencia del BEB · editable hasta {BRACKET_LOCK_LABEL}
        </p>
      </div>

      <div className="h-[calc(100dvh-7.25rem)] overflow-hidden lg:h-auto lg:overflow-visible">
        <CompletoWizard
          teams={teams.map((t) => ({
            id: t.id,
            name: t.name,
            nameEs: t.nameEs,
            group: t.group,
            iso2: t.iso2,
            flagEmoji: t.flagEmoji,
          }))}
          groupMatches={groupMatches.map(serializeMatch)}
          knockoutMatches={knockoutMatches.map(serializeMatch)}
          initialPredictions={initialPredictions}
          initialThirdPlaceTiebreakOrder={
            parseThirdPlaceTiebreakOrder(entry?.thirdPlaceTiebreakOrder) ?? {}
          }
          locked={entry?.locked ?? false}
          globallyLocked={isBracketGloballyLocked()}
          matchdayGroupCount={syncStats.matchdayCount}
          totalGroupMatches={syncStats.totalGroupMatches}
          finishedMatches={finishedMatches.map((match) => ({
            id: match.id,
            round: match.round,
            homeScore: match.homeScore!,
            awayScore: match.awayScore!,
            homeTeamId: match.homeTeamId!,
            awayTeamId: match.awayTeamId!,
            homeTeamName: match.homeTeam?.name ?? null,
            awayTeamName: match.awayTeam?.name ?? null,
          }))}
          actualGroupStandings={actualGroupStandings}
        />
      </div>
    </AppShell>
  )
}
