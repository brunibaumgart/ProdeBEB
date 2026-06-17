import { buildCelebrityBracket, type BuildCelebrityContext } from './build'
import { CELEBRITY_BRACKET_SOURCES } from './generated'
import type { CelebrityBracket, CelebrityBracketId } from './types'

export type { CelebrityBracket, CelebrityBracketId, CelebrityGroupInputMode } from './types'
export { CELEBRITY_BRACKET_SOURCES }

/** Comparación con famosos BEB (oculto por ahora). */
export const SHOW_CELEBRITY_BRACKETS = false

export function buildAllCelebrityBrackets(ctx: BuildCelebrityContext): CelebrityBracket[] {
  return CELEBRITY_BRACKET_SOURCES.map((source) => buildCelebrityBracket(source, ctx))
}

export function getCelebrityBracket(
  id: CelebrityBracketId,
  ctx: BuildCelebrityContext,
): CelebrityBracket {
  const source = CELEBRITY_BRACKET_SOURCES.find((entry) => entry.id === id)
  if (!source) throw new Error(`Celebrity bracket not found: ${id}`)
  return buildCelebrityBracket(source, ctx)
}

export type CompletoParticipantId = 'mine' | CelebrityBracketId

export function isCelebrityParticipant(
  participant: CompletoParticipantId,
): participant is CelebrityBracketId {
  return participant !== 'mine'
}
