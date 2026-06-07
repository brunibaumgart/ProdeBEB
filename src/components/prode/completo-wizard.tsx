'use client'

import { useMemo, useState } from 'react'
import { Check, Lock, Trophy } from 'lucide-react'

import { lockBracket, saveBracketChampion } from '@/app/actions/bracket'
import { BracketMatchRow } from '@/components/prode/bracket-match-row'
import { SyncGroupStageButton } from '@/components/prode/sync-group-stage-button'
import { FlagIcon } from '@/components/ui-mundial/flag-icon'
import { GroupTable } from '@/components/ui-mundial/group-table'
import { resolveGroupStandingsFromPredictions } from '@/lib/bracket'
import { isKnockoutRoundUnlocked, resolvePredictedBracket } from '@/lib/bracket/predicted-bracket'
import { BRACKET_LOCK_LABEL } from '@/lib/bracket/lock'
import type { BracketSlotPrediction } from '@/lib/queries/bracket'
import { ROUND_LABELS, type MatchRound } from '@/types'
import { cn } from '@/lib/utils'

type SerializableTeam = {
  id: string
  name: string
  nameEs: string
  group: string
  iso2: string
  flagEmoji: string
}

type SerializableMatch = {
  id: number
  round: string
  group: string | null
  homeLabel: string | null
  awayLabel: string | null
  homeTeam: { name: string; nameEs: string; iso2: string; flagEmoji: string } | null
  awayTeam: { name: string; nameEs: string; iso2: string; flagEmoji: string } | null
}

interface CompletoWizardProps {
  teams: SerializableTeam[]
  groupMatches: SerializableMatch[]
  knockoutMatches: SerializableMatch[]
  initialPredictions: Record<number, BracketSlotPrediction>
  championId: string | null
  locked: boolean
  globallyLocked: boolean
  matchdayGroupCount: number
  totalGroupMatches: number
}

const GROUPS = 'ABCDEFGHIJKL'.split('')
const KNOCKOUT_ROUNDS: { round: MatchRound; ids: number[] }[] = [
  { round: 'Round of 32', ids: Array.from({ length: 16 }, (_, i) => 73 + i) },
  { round: 'Round of 16', ids: Array.from({ length: 8 }, (_, i) => 89 + i) },
  { round: 'Quarterfinals', ids: [97, 98, 99, 100] },
  { round: 'Semifinals', ids: [101, 102] },
  { round: '3rd Place', ids: [103] },
  { round: 'Final', ids: [104] },
]

const STEPS = [
  { id: 1, label: 'Grupos' },
  { id: 2, label: 'Eliminatorias' },
  { id: 3, label: 'Campeón' },
] as const

export function CompletoWizard({
  teams,
  groupMatches,
  knockoutMatches,
  initialPredictions,
  championId: initialChampionId,
  locked,
  globallyLocked,
  matchdayGroupCount,
  totalGroupMatches,
}: CompletoWizardProps) {
  const editable = !locked && !globallyLocked
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [predictions, setPredictions] = useState(initialPredictions)
  const [championId, setChampionId] = useState(initialChampionId)
  const [selectedGroup, setSelectedGroup] = useState('A')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [locking, setLocking] = useState(false)

  const teamByName = useMemo(() => new Map(teams.map((t) => [t.name, t])), [teams])

  const groupStandings = useMemo(() => {
    const map = new Map<string, ReturnType<typeof resolveGroupStandingsFromPredictions>>()
    for (const group of GROUPS) {
      const groupTeams = teams.filter((t) => t.group === group)
      const matches = groupMatches
        .filter((m) => m.group === group)
        .map((m) => ({
          matchId: m.id,
          group: m.group,
          homeName: m.homeTeam!.name,
          awayName: m.awayTeam!.name,
        }))
      map.set(group, resolveGroupStandingsFromPredictions(groupTeams, matches, predictions, group))
    }
    return map
  }, [teams, groupMatches, predictions])

  const resolvedKnockout = useMemo(
    () =>
      resolvePredictedBracket(
        groupStandings,
        knockoutMatches.map((m) => ({
          id: m.id,
          homeLabel: m.homeLabel,
          awayLabel: m.awayLabel,
        })),
        predictions,
        predictions,
        teamByName
      ),
    [groupStandings, knockoutMatches, predictions, teamByName]
  )

  const groupProgress = useMemo(() => {
    const total = groupMatches.length
    const done = groupMatches.filter((m) => predictions[m.id] != null).length
    return { done, total }
  }, [groupMatches, predictions])

  const knockoutProgress = useMemo(() => {
    const total = knockoutMatches.length
    const done = knockoutMatches.filter((m) => predictions[m.id] != null).length
    return { done, total }
  }, [knockoutMatches, predictions])

  const finalists = useMemo(() => {
    const final = resolvedKnockout.get(104)
    const home = final?.homeTeamId ? teams.find((t) => t.id === final.homeTeamId) : null
    const away = final?.awayTeamId ? teams.find((t) => t.id === final.awayTeamId) : null
    return { home, away }
  }, [resolvedKnockout, teams])

  function handlePredictionSaved(matchId: number, prediction: BracketSlotPrediction) {
    setPredictions((prev) => {
      const next = { ...prev, [matchId]: prediction }
      if (matchId <= 72) {
        for (const id of Object.keys(next).map(Number)) {
          if (id >= 73) delete next[id]
        }
      }
      return next
    })
    if (matchId <= 72) setChampionId(null)
  }

  async function handleChampionSelect(teamId: string) {
    if (!editable) return
    setFeedback(null)
    const result = await saveBracketChampion(teamId)
    if (result.ok) {
      setChampionId(teamId)
      setFeedback(result.message)
    } else {
      setFeedback(result.error)
    }
  }

  async function handleLock() {
    setLocking(true)
    setFeedback(null)
    const result = await lockBracket()
    setFeedback(result.ok ? result.message : result.error)
    setLocking(false)
    if (result.ok) window.location.reload()
  }

  function getPreviousRoundIds(roundIndex: number): number[] {
    if (roundIndex <= 0) return []
    return KNOCKOUT_ROUNDS[roundIndex - 1].ids
  }

  return (
    <div>
      {(locked || globallyLocked) && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <Lock className="size-4 shrink-0" aria-hidden />
          {globallyLocked
            ? `El Prode Completo cerró (${BRACKET_LOCK_LABEL}).`
            : 'Tu bracket está confirmado y no se puede modificar.'}
        </div>
      )}

      <nav className="mb-8 flex flex-wrap gap-2">
        {STEPS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStep(s.id)}
            className={cn(
              'flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
              step === s.id
                ? 'border-primary bg-primary/15 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground'
            )}
          >
            <span className="flex size-5 items-center justify-center rounded-full bg-muted text-xs">
              {s.id}
            </span>
            {s.label}
            {s.id === 1 && (
              <span className="text-xs opacity-70">
                {groupProgress.done}/{groupProgress.total}
              </span>
            )}
            {s.id === 2 && (
              <span className="text-xs opacity-70">
                {knockoutProgress.done}/{knockoutProgress.total}
              </span>
            )}
          </button>
        ))}
      </nav>

      {step === 1 && (
        <div>
          <p className="mb-4 text-sm text-muted-foreground">
            Predecí los 72 partidos de fase de grupos. La tabla se actualiza en tiempo real.
          </p>

          {editable && (
            <SyncGroupStageButton
              direction="matchday-to-complete"
              sourceCount={matchdayGroupCount}
              totalGroupMatches={totalGroupMatches}
              reloadOnSuccess
              className="mb-4"
            />
          )}

          <div className="mb-4 flex flex-wrap gap-1.5">
            {GROUPS.map((group) => {
              const groupMatchIds = groupMatches.filter((m) => m.group === group).map((m) => m.id)
              const done = groupMatchIds.filter((id) => predictions[id]).length
              return (
                <button
                  key={group}
                  type="button"
                  onClick={() => setSelectedGroup(group)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    selectedGroup === group
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-border text-muted-foreground hover:text-foreground',
                    done === groupMatchIds.length && done > 0 && 'border-brand-green/40'
                  )}
                >
                  {group} ({done}/{groupMatchIds.length})
                </button>
              )
            })}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <GroupTable
              group={selectedGroup}
              standings={groupStandings.get(selectedGroup) ?? []}
              compact
            />

            <div className="space-y-2">
              {groupMatches
                .filter((m) => m.group === selectedGroup)
                .map((match) => (
                  <BracketMatchRow
                    key={match.id}
                    matchId={match.id}
                    home={{
                      name: match.homeTeam!.nameEs,
                      iso2: match.homeTeam!.iso2,
                      flagEmoji: match.homeTeam!.flagEmoji,
                    }}
                    away={{
                      name: match.awayTeam!.nameEs,
                      iso2: match.awayTeam!.iso2,
                      flagEmoji: match.awayTeam!.flagEmoji,
                    }}
                    initialHome={predictions[match.id]?.predHome ?? null}
                    initialAway={predictions[match.id]?.predAway ?? null}
                    editable={editable}
                    onSaved={(prediction) => handlePredictionSaved(match.id, prediction)}
                  />
                ))}
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Siguiente: Eliminatorias
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-8">
          <p className="text-sm text-muted-foreground">
            Los cruces se arman según tus resultados de grupos. En eliminatorias no puede haber
            empate.
          </p>

          {groupProgress.done < groupProgress.total && (
            <p className="rounded-lg border border-brand-gold/30 bg-brand-gold/10 px-4 py-3 text-sm">
              Completá la fase de grupos ({groupProgress.done}/{groupProgress.total}) para
              desbloquear todos los cruces.
            </p>
          )}

          {KNOCKOUT_ROUNDS.map((roundConfig, roundIndex) => {
            const roundMatches = knockoutMatches.filter((m) => roundConfig.ids.includes(m.id))
            const unlocked = isKnockoutRoundUnlocked(
              roundConfig.ids,
              getPreviousRoundIds(roundIndex),
              predictions
            )

            return (
              <section key={roundConfig.round}>
                <h2 className="mb-3 font-heading text-xl tracking-wide text-primary">
                  {ROUND_LABELS[roundConfig.round].toUpperCase()}
                </h2>

                {!unlocked && roundIndex > 0 && (
                  <p className="mb-3 text-xs text-muted-foreground">
                    Completá la ronda anterior para desbloquear estos partidos.
                  </p>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {roundMatches.map((match) => {
                    const resolved = resolvedKnockout.get(match.id)
                    const homeTeam = resolved?.homeTeamId
                      ? teams.find((t) => t.id === resolved.homeTeamId)
                      : null
                    const awayTeam = resolved?.awayTeamId
                      ? teams.find((t) => t.id === resolved.awayTeamId)
                      : null
                    const canPlay =
                      editable &&
                      unlocked &&
                      groupProgress.done === groupProgress.total &&
                      Boolean(homeTeam && awayTeam)

                    if (!homeTeam || !awayTeam) {
                      return (
                        <div
                          key={match.id}
                          className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center text-sm text-muted-foreground"
                        >
                          Partido #{match.id} — equipos por definir
                        </div>
                      )
                    }

                    return (
                      <BracketMatchRow
                        key={match.id}
                        matchId={match.id}
                        home={{
                          name: homeTeam.nameEs,
                          iso2: homeTeam.iso2,
                          flagEmoji: homeTeam.flagEmoji,
                        }}
                        away={{
                          name: awayTeam.nameEs,
                          iso2: awayTeam.iso2,
                          flagEmoji: awayTeam.flagEmoji,
                        }}
                        homeTeamId={homeTeam.id}
                        awayTeamId={awayTeam.id}
                        initialHome={predictions[match.id]?.predHome ?? null}
                        initialAway={predictions[match.id]?.predAway ?? null}
                        initialAdvancesTeamId={predictions[match.id]?.predAdvancesTeamId ?? null}
                        initialDecidedIn={
                          (predictions[match.id]?.predDecidedIn as
                            | 'regulation'
                            | 'extra_time'
                            | 'penalties'
                            | null) ?? null
                        }
                        editable={canPlay ?? false}
                        knockout
                        onSaved={(prediction) => handlePredictionSaved(match.id, prediction)}
                      />
                    )
                  })}
                </div>
              </section>
            )
          })}

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              Volver a Grupos
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Siguiente: Campeón
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <p className="mb-6 text-sm text-muted-foreground">
            Elegí al campeón entre los dos finalistas según tu bracket predicho.
          </p>

          {finalists.home && finalists.away ? (
            <div className="mx-auto grid max-w-lg grid-cols-2 gap-4">
              {[finalists.home, finalists.away].map((team) => {
                const selected = championId === team.id
                return (
                  <button
                    key={team.id}
                    type="button"
                    disabled={!editable}
                    onClick={() => handleChampionSelect(team.id)}
                    className={cn(
                      'flex flex-col items-center gap-3 rounded-xl border p-6 transition-colors',
                      selected
                        ? 'border-primary bg-primary/10 ring-2 ring-primary'
                        : 'border-border bg-card hover:border-primary/40',
                      !editable && 'cursor-default opacity-80'
                    )}
                  >
                    <FlagIcon iso2={team.iso2} flagEmoji={team.flagEmoji} size="lg" />
                    <span className="font-heading text-xl tracking-wide">{team.nameEs}</span>
                    {selected && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                        <Trophy className="size-3.5" aria-hidden />
                        Campeón
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
              Completá las semifinales y la final para elegir campeón.
            </p>
          )}

          {editable && (
            <div className="mt-8 flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={handleLock}
                disabled={locking || !championId}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-green px-6 py-3 text-sm font-medium text-white hover:bg-brand-green/90 disabled:opacity-50"
              >
                <Check className="size-4" aria-hidden />
                Confirmar bracket completo
              </button>
              <p className="max-w-md text-center text-xs text-muted-foreground">
                Una vez confirmado no podrás modificarlo. Podés editarlo hasta {BRACKET_LOCK_LABEL}.
              </p>
            </div>
          )}

          {feedback && (
            <p
              className={cn(
                'mt-4 text-center text-sm',
                feedback.includes('confirmado') || feedback.includes('guardado')
                  ? 'text-brand-green'
                  : 'text-destructive'
              )}
            >
              {feedback}
            </p>
          )}

          <div className="mt-6 flex justify-start">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              Volver a Eliminatorias
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
