import { getFlagCode } from '@/lib/flags'
import { getTeams, type TeamData } from '@/lib/data'

export function slugifyTeamName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function getTeamByName(name: string): TeamData | undefined {
  return getTeams().find((team) => team.name === name)
}

export function getTeamByNameEs(nameEs: string): TeamData | undefined {
  return getTeams().find((team) => team.name_es === nameEs)
}

export function getTeamBySlug(slug: string): TeamData | undefined {
  return getTeams().find((team) => slugifyTeamName(team.name) === slug)
}

export function getTeamFlagCode(team: TeamData): string {
  return getFlagCode(team.iso2)
}

export function getTeamsByGroup(group: string): TeamData[] {
  return getTeams().filter((team) => team.group === group)
}

export function getTeamsByConfederation(confederation: string): TeamData[] {
  return getTeams().filter((team) => team.confederation === confederation)
}
