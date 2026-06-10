import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { AppShell } from '@/components/layout/app-shell'
import { CompletoWizard } from '@/components/prode/completo-wizard'
import { getGroupStageSyncStats } from '@/app/actions/sync-predictions'
import { isBracketGloballyLocked, BRACKET_LOCK_LABEL } from '@/lib/bracket/lock'
import { getBracketEntryForUser, slotsToPredictionsMap } from '@/lib/queries/bracket'
import { getGroupStageMatches, getKnockoutMatches } from '@/lib/queries/matches'
import { getAllTeams } from '@/lib/queries/teams'
import { ensureDbUser } from '@/lib/queries/users'

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

export default async function ProdeCompletoPage() {
  const user = await ensureDbUser()
  if (!user) return null

  const [teams, groupMatches, knockoutMatches, entry, syncStats] = await Promise.all([
    getAllTeams(),
    getGroupStageMatches(),
    getKnockoutMatches(),
    getBracketEntryForUser(user.id),
    getGroupStageSyncStats(user.id),
  ])

  const initialPredictions = slotsToPredictionsMap(entry?.slots ?? [])

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
        <h1 className="font-heading text-3xl tracking-wide">PRODE COMPLETO</h1>
        <p className="mt-2 text-muted-foreground">
          Grupos con victoria/empate, eliminatorias eligiendo quién avanza y campeón · editable hasta{' '}
          {BRACKET_LOCK_LABEL}
        </p>
      </div>

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
        championId={entry?.championId ?? null}
        locked={entry?.locked ?? false}
        globallyLocked={isBracketGloballyLocked()}
        matchdayGroupCount={syncStats.matchdayCount}
        totalGroupMatches={syncStats.totalGroupMatches}
      />
    </AppShell>
  )
}
