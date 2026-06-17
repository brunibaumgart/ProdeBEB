'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Check, Lock } from 'lucide-react'

import { lockBracket } from '@/app/actions/bracket'
import { BracketMatchRow } from '@/components/prode/bracket-match-row'
import { CompletoGroupMobile } from '@/components/prode/completo/completo-group-mobile'
import {
  CompletoStepNav,
  type CompletoStepId,
} from '@/components/prode/completo/completo-step-nav'
import { COMPLETO_STEPS } from '@/components/prode/completo/completo-steps'
import { KnockoutBracketView } from '@/components/prode/knockout-bracket-view'
import { SyncGroupStageButton } from '@/components/prode/sync-group-stage-button'
import { GroupTable } from '@/components/ui-mundial/group-table'
import { resolveGroupStandingsFromPredictions } from '@/lib/bracket'
import { getDownstreamKnockoutMatchIds } from '@/lib/bracket/knockout-bracket-layout'
import { resolvePredictedBracket } from '@/lib/bracket/predicted-bracket'
import { BRACKET_LOCK_LABEL } from '@/lib/bracket/lock'
import { ThirdPlaceTiebreakPanel } from '@/components/prode/third-place-tiebreak-panel'
import {
  CompletoParticipantHeader,
  CompletoParticipantNav,
} from '@/components/prode/completo/completo-participant-nav'
import { CelebrityGalleryButton } from '@/components/prode/completo/celebrity-gallery-button'
import {
  buildAllCelebrityBrackets,
  isCelebrityParticipant,
  SHOW_CELEBRITY_BRACKETS,
  type CompletoParticipantId,
} from '@/lib/bracket/celebrity-predictions'
import {
  computeCelebrityCompletePoints,
  type CelebrityFinishedMatch,
  type CelebrityPointsBreakdown,
} from '@/lib/scoring/complete/celebrity-points'
import type { Standing } from '@/lib/bracket'
import {
  isThirdPlaceTiebreakComplete,
  sanitizeThirdPlaceTiebreakOrder,
  type ThirdPlaceTiebreakOrder,
} from '@/lib/bracket/third-place-tiebreak'
import type { BracketSlotPrediction } from '@/lib/queries/bracket'
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
  initialThirdPlaceTiebreakOrder: ThirdPlaceTiebreakOrder
  locked: boolean
  globallyLocked: boolean
  matchdayGroupCount: number
  totalGroupMatches: number
  finishedMatches?: CelebrityFinishedMatch[]
  actualGroupStandings?: Record<string, Standing[]>
}

const GROUPS = 'ABCDEFGHIJKL'.split('')

type WizardStep = CompletoStepId

export function CompletoWizard({
  teams,
  groupMatches,
  knockoutMatches,
  initialPredictions,
  initialThirdPlaceTiebreakOrder,
  locked,
  globallyLocked,
  matchdayGroupCount,
  totalGroupMatches,
  finishedMatches = [],
  actualGroupStandings = {},
}: CompletoWizardProps) {
  const editable = !globallyLocked
  const [step, setStep] = useState<WizardStep>(1)
  const [predictions, setPredictions] = useState(initialPredictions)
  const [tiebreakOrder, setTiebreakOrder] = useState<ThirdPlaceTiebreakOrder>(
    initialThirdPlaceTiebreakOrder,
  )
  const [selectedGroup, setSelectedGroup] = useState('A')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [locking, setLocking] = useState(false)
  const [participant, setParticipant] = useState<CompletoParticipantId>('mine')
  const [showGallery, setShowGallery] = useState(false)

  const celebrityContext = useMemo(
    () => ({
      teams,
      groupMatches,
      knockoutMatches,
    }),
    [teams, groupMatches, knockoutMatches],
  )

  const celebrities = useMemo(
    () =>
      SHOW_CELEBRITY_BRACKETS ? buildAllCelebrityBrackets(celebrityContext) : [],
    [celebrityContext],
  )

  const activeCelebrity = useMemo(
    () =>
      SHOW_CELEBRITY_BRACKETS && isCelebrityParticipant(participant)
        ? celebrities.find((celebrity) => celebrity.id === participant) ?? null
        : null,
    [celebrities, participant],
  )

  const actualStandingsMap = useMemo(
    () => new Map(Object.entries(actualGroupStandings)),
    [actualGroupStandings],
  )

  const celebrityPoints = useMemo(() => {
    if (!SHOW_CELEBRITY_BRACKETS) return {}
    const map: Partial<Record<string, CelebrityPointsBreakdown>> = {}
    for (const celebrity of celebrities) {
      const points = computeCelebrityCompletePoints(
        celebrity,
        finishedMatches,
        actualStandingsMap.size > 0 ? actualStandingsMap : null,
        teams,
        knockoutMatches,
      )
      if (points) map[celebrity.id] = points
    }
    return map
  }, [celebrities, finishedMatches, actualStandingsMap, teams, knockoutMatches])

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

  const displayPredictions = activeCelebrity?.predictions ?? predictions
  const displayTiebreakOrder = activeCelebrity?.tiebreakOrder ?? tiebreakOrder
  const displayGroupStandings = activeCelebrity?.groupStandings ?? groupStandings
  const displayEditable = !activeCelebrity && editable
  const displayGroupInputMode = activeCelebrity?.groupInputMode ?? 'scores'

  const groupProgress = useMemo(() => {
    const total = groupMatches.length
    const done = groupMatches.filter((m) => displayPredictions[m.id] != null).length
    return { done, total }
  }, [groupMatches, displayPredictions])

  const groupsComplete = activeCelebrity?.groupsComplete ?? groupProgress.done === groupProgress.total

  const resolvedKnockout = useMemo(
    () =>
      resolvePredictedBracket(
        displayGroupStandings,
        knockoutMatches.map((m) => ({
          id: m.id,
          homeLabel: m.homeLabel,
          awayLabel: m.awayLabel,
        })),
        displayPredictions,
        displayPredictions,
        teamByName,
        displayTiebreakOrder,
      ),
    [
      displayGroupStandings,
      knockoutMatches,
      displayPredictions,
      teamByName,
      displayTiebreakOrder,
    ],
  )

  const tiebreakComplete = useMemo(
    () =>
      activeCelebrity?.tiebreakComplete ??
      isThirdPlaceTiebreakComplete(groupStandings, tiebreakOrder),
    [activeCelebrity, groupStandings, tiebreakOrder],
  )

  const teamByNameForTiebreak = useMemo(
    () =>
      new Map(
        teams.map((team) => [
          team.name,
          {
            nameEs: team.nameEs,
            iso2: team.iso2,
            flagEmoji: team.flagEmoji,
            group: team.group,
          },
        ]),
      ),
    [teams],
  )

  useEffect(() => {
    setTiebreakOrder((current) => sanitizeThirdPlaceTiebreakOrder(groupStandings, current))
  }, [groupStandings])

  const knockoutProgress = useMemo(() => {
    const total = knockoutMatches.length
    const done = knockoutMatches.filter((m) => displayPredictions[m.id] != null).length
    return { done, total }
  }, [knockoutMatches, displayPredictions])

  const knockoutComplete =
    activeCelebrity?.knockoutComplete ?? knockoutProgress.done === knockoutProgress.total

  function canEnterStep(target: WizardStep): boolean {
    if (activeCelebrity) return true
    if (target <= 2) return true
    return groupsComplete && tiebreakComplete
  }

  function handlePredictionSaved(matchId: number, prediction: BracketSlotPrediction) {
    setPredictions((prev) => {
      const next = { ...prev, [matchId]: prediction }
      if (matchId <= 72) {
        for (const id of Object.keys(next).map(Number)) {
          if (id >= 73) delete next[id]
        }
      } else {
        for (const id of getDownstreamKnockoutMatchIds(matchId)) {
          delete next[id]
        }
      }
      return next
    })
  }

  async function handleLock() {
    setLocking(true)
    setFeedback(null)
    const result = await lockBracket()
    setFeedback(result.ok ? result.message : result.error)
    setLocking(false)
    if (result.ok) window.location.reload()
  }

  const stepBadges: Partial<Record<WizardStep, string>> = activeCelebrity
    ? {
        1: activeCelebrity.groupInputMode === 'standings-only' ? 'Posiciones' : 'Completo',
        2: 'Listo',
        3: activeCelebrity.championNameEs,
      }
    : {
        1: `${groupProgress.done}/${groupProgress.total}`,
        2: groupsComplete ? (tiebreakComplete ? 'OK' : '…') : undefined,
        3: `${knockoutProgress.done}/${knockoutProgress.total}`,
      }

  const statusBanner = globallyLocked ? (
    <div className="flex shrink-0 items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      <Lock className="size-3.5 shrink-0" aria-hidden />
      Cerrado ({BRACKET_LOCK_LABEL})
    </div>
  ) : locked ? (
    <div className="flex shrink-0 items-center gap-2 rounded-lg border border-brand-green/30 bg-brand-green/5 px-3 py-2 text-xs text-muted-foreground">
      <Check className="size-3.5 shrink-0 text-brand-green" aria-hidden />
      Confirmado · editable hasta {BRACKET_LOCK_LABEL}
    </div>
  ) : null

  return (
    <div>
      {/* ── Móvil: una pantalla, sin scroll ── */}
      <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden lg:hidden">
        <div className="flex shrink-0 items-center justify-between gap-2">
          <Link
            href="/prode"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ← Prode
          </Link>
          <span className="font-heading text-sm tracking-wide">COMPLETO</span>
          <span className="text-[10px] text-muted-foreground">{BRACKET_LOCK_LABEL}</span>
        </div>

        {statusBanner}

        {SHOW_CELEBRITY_BRACKETS ? (
          <CompletoParticipantNav
            participant={participant}
            onParticipantChange={setParticipant}
            celebrities={celebrities}
            celebrityPoints={celebrityPoints}
          />
        ) : null}

        {SHOW_CELEBRITY_BRACKETS && activeCelebrity ? (
          <CompletoParticipantHeader
            celebrity={activeCelebrity}
            points={celebrityPoints[activeCelebrity.id] ?? null}
            onShowGallery={
              activeCelebrity.galleryImages?.length
                ? () => setShowGallery(true)
                : undefined
            }
          />
        ) : null}

        <CompletoStepNav
          step={step}
          onStepChange={setStep}
          canEnterStep={canEnterStep}
          badges={stepBadges}
        />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {step === 1 && (
            <CompletoGroupMobile
              groupMatches={groupMatches}
              groupStandings={displayGroupStandings}
              predictions={displayPredictions}
              editable={displayEditable}
              groupInputMode={displayGroupInputMode}
              matchdayGroupCount={matchdayGroupCount}
              groupProgress={groupProgress}
              onPredictionSaved={handlePredictionSaved}
            />
          )}

          {step === 2 && (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <ThirdPlaceTiebreakPanel
                groupStandings={displayGroupStandings}
                teamByName={teamByNameForTiebreak}
                tiebreakOrder={displayTiebreakOrder}
                editable={displayEditable}
                groupsComplete={groupsComplete}
                onOrderChange={setTiebreakOrder}
                dense
              />
            </div>
          )}

          {step === 3 && (
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
              <KnockoutBracketView
                teams={teams}
                resolvedKnockout={resolvedKnockout}
                predictions={displayPredictions}
                editable={displayEditable}
                groupsComplete={groupsComplete}
                onPredictionSaved={handlePredictionSaved}
                mobileFit
              />

              {displayEditable && !locked && knockoutComplete && (
                <button
                  type="button"
                  onClick={handleLock}
                  disabled={locking}
                  className="shrink-0 rounded-lg bg-brand-green py-3 text-sm font-medium text-white disabled:opacity-50"
                >
                  {locking ? 'Confirmando…' : 'Confirmar bracket'}
                </button>
              )}

              {displayEditable && locked && (
                <p className="shrink-0 text-center text-[10px] text-muted-foreground">
                  Confirmado · podés seguir editando hasta el {BRACKET_LOCK_LABEL}
                </p>
              )}

              {feedback && (
                <p
                  className={cn(
                    'shrink-0 text-center text-xs',
                    feedback.includes('confirmado') || feedback.includes('guardado')
                      ? 'text-brand-green'
                      : 'text-destructive',
                  )}
                >
                  {feedback}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Desktop ── */}
      <div className="hidden lg:block">
      {globallyLocked && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <Lock className="size-4 shrink-0" aria-hidden />
          El Prode Completo cerró ({BRACKET_LOCK_LABEL}).
        </div>
      )}

      {locked && !globallyLocked && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-brand-green/30 bg-brand-green/5 px-4 py-3 text-sm text-muted-foreground">
          <Check className="size-4 shrink-0 text-brand-green" aria-hidden />
          Tu bracket está confirmado. Podés seguir editándolo hasta el {BRACKET_LOCK_LABEL}.
        </div>
      )}

      {SHOW_CELEBRITY_BRACKETS ? (
        <CompletoParticipantNav
          participant={participant}
          onParticipantChange={setParticipant}
          celebrities={celebrities}
          celebrityPoints={celebrityPoints}
          className="mb-4"
        />
      ) : null}

      {SHOW_CELEBRITY_BRACKETS && activeCelebrity ? (
        <CompletoParticipantHeader
          celebrity={activeCelebrity}
          points={celebrityPoints[activeCelebrity.id] ?? null}
          onShowGallery={
            activeCelebrity.galleryImages?.length ? () => setShowGallery(true) : undefined
          }
          className="mb-4"
        />
      ) : null}

      <nav className="mb-8 flex flex-wrap gap-2">
        {COMPLETO_STEPS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              if (canEnterStep(s.id)) setStep(s.id)
            }}
            disabled={!canEnterStep(s.id)}
            className={cn(
              'flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
              step === s.id
                ? 'border-primary bg-primary/15 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground',
              !canEnterStep(s.id) && 'cursor-not-allowed opacity-50',
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
            {s.id === 2 && groupsComplete && (
              <span className="text-xs opacity-70">{tiebreakComplete ? 'Listo' : 'Pendiente'}</span>
            )}
            {s.id === 3 && (
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
            {activeCelebrity
              ? activeCelebrity.groupInputMode === 'standings-only'
                ? 'Orden de clasificación por grupo y llave eliminatoria.'
                : 'Predicción completa de fase de grupos y eliminatorias.'
              : 'Elegí victoria local, empate o victoria visitante en cada partido. La tabla se actualiza en tiempo real según esos resultados.'}
          </p>

          {displayEditable && (
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
              const done = groupMatchIds.filter((id) => displayPredictions[id]).length
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
                    done === groupMatchIds.length && done > 0 && 'border-brand-green/40',
                  )}
                >
                  {group} ({done}/{groupMatchIds.length})
                </button>
              )
            })}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <GroupTable
                group={selectedGroup}
                standings={displayGroupStandings.get(selectedGroup) ?? []}
                compact
                orderOnly={displayGroupInputMode === 'standings-only'}
              />
            </div>

            {displayGroupInputMode === 'scores' ? (
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
                    initialHome={displayPredictions[match.id]?.predHome ?? null}
                    initialAway={displayPredictions[match.id]?.predAway ?? null}
                    editable={displayEditable}
                    onSaved={(prediction) => handlePredictionSaved(match.id, prediction)}
                  />
                ))}
            </div>
            ) : (
              <p className="rounded-lg border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
                Esta predicción solo incluye el orden final del grupo, sin marcadores partido a
                partido.
              </p>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!groupsComplete}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Siguiente: Mejores terceros
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <ThirdPlaceTiebreakPanel
            groupStandings={displayGroupStandings}
            teamByName={teamByNameForTiebreak}
            tiebreakOrder={displayTiebreakOrder}
            editable={displayEditable}
            groupsComplete={groupsComplete}
            onOrderChange={setTiebreakOrder}
          />

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
              disabled={!tiebreakComplete}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Siguiente: Eliminatorias
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <KnockoutBracketView
            teams={teams}
            resolvedKnockout={resolvedKnockout}
            predictions={displayPredictions}
            editable={displayEditable}
            groupsComplete={groupsComplete}
            onPredictionSaved={handlePredictionSaved}
          />

          {displayEditable && !locked && knockoutComplete && (
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={handleLock}
                disabled={locking}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-green px-6 py-3 text-sm font-medium text-white hover:bg-brand-green/90 disabled:opacity-50"
              >
                <Check className="size-4" aria-hidden />
                Confirmar bracket completo
              </button>
              <p className="max-w-md text-center text-xs text-muted-foreground">
                El campeón es quien elijas en la final. Podés seguir editando hasta el{' '}
                {BRACKET_LOCK_LABEL}.
              </p>
            </div>
          )}

          {displayEditable && locked && (
            <p className="text-center text-sm text-muted-foreground">
              Bracket confirmado. Los cambios que guardes se actualizan en tu puntaje hasta el{' '}
              {BRACKET_LOCK_LABEL}.
            </p>
          )}

          {feedback && (
            <p
              className={cn(
                'text-center text-sm',
                feedback.includes('confirmado') || feedback.includes('guardado')
                  ? 'text-brand-green'
                  : 'text-destructive',
              )}
            >
              {feedback}
            </p>
          )}

          <div className="flex justify-start">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              Volver a Mejores terceros
            </button>
          </div>
        </div>
      )}
      </div>

      {SHOW_CELEBRITY_BRACKETS && showGallery && activeCelebrity?.galleryImages?.length ? (
        <CelebrityGalleryButton
          celebrity={activeCelebrity}
          className="hidden"
          defaultOpen
          onClose={() => setShowGallery(false)}
        />
      ) : null}
    </div>
  )
}
