import fs from 'fs'
import path from 'path'

import type { MatchRound, Confederation, Position } from '@/types'

export interface FixtureMatch {
  id: number
  round: MatchRound
  matchday?: number
  group?: string
  date: string
  time_arg: string
  home: string
  away: string
  venue: string
  city: string
  country: string
  home_score: number | null
  away_score: number | null
  status: 'scheduled' | 'live' | 'finished'
}

export interface FixtureVenue {
  name: string
  city: string
  country: string
  capacity: number
}

export interface FixtureData {
  tournament: string
  start_date: string
  end_date: string
  groups: Record<string, string[]>
  venues: FixtureVenue[]
  matches: FixtureMatch[]
}

export interface TeamData {
  name: string
  name_es: string
  group: string
  iso2: string
  confederation: Confederation
  flag_emoji: string
  kit_primary: string
  kit_secondary: string
  kit_third?: string
  text_on_primary: string
}

export interface RoundConfig {
  label_es: string
  short: string
}

export interface PositionConfig {
  label_en: string
  short: string
  color: string
}

export interface TeamsDataFile {
  tournament_brand: {
    name: string
    tagline: string
    colors: Record<string, string>
  }
  teams: TeamData[]
  confederations: Record<string, { color: string; label_es: string }>
  rounds: Record<MatchRound, RoundConfig>
  positions: Record<Position, PositionConfig>
}

function readJson<T>(filename: string): T {
  return JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'data', filename), 'utf-8')
  ) as T
}

let fixtureCache: FixtureData | null = null
let teamsCache: TeamsDataFile | null = null

export function getFixtureData(): FixtureData {
  if (!fixtureCache) fixtureCache = readJson<FixtureData>('fixture.json')
  return fixtureCache
}

export function getTeamsData(): TeamsDataFile {
  if (!teamsCache) teamsCache = readJson<TeamsDataFile>('teams_data.json')
  return teamsCache
}

export function getTeams(): TeamData[] {
  return getTeamsData().teams
}

export function getRounds(): Record<MatchRound, RoundConfig> {
  return getTeamsData().rounds
}

export function getPositions(): Record<Position, PositionConfig> {
  return getTeamsData().positions
}
