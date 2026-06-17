/**
 * Genera src/lib/bracket/celebrity-predictions/generated.ts a partir de resultados
 * expresados como "EquipoA goles-goles EquipoB" (name_es o alias).
 *
 * Uso: npx tsx scripts/build-celebrity-predictions.ts
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import fixture from '../data/fixture.json'
import teamsData from '../data/teams_data.json'

type ScoreEntry = { a: string; b: string; home: number; away: number }

function normalizeTeamName(raw: string): string {
  const key = raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')

  const aliases: Record<string, string> = {
    mex: 'México',
    mexico: 'México',
    sudafrica: 'Sudáfrica',
    'corea del sur': 'Corea del Sur',
    corea: 'Corea del Sur',
    checa: 'República Checa',
    'republica checa': 'República Checa',
    canada: 'Canadá',
    bosnia: 'Bosnia y Herzegovina',
    'bosnia y herzegovina': 'Bosnia y Herzegovina',
    qatar: 'Catar',
    catár: 'Catar',
    suiza: 'Suiza',
    brasil: 'Brasil',
    marruecos: 'Marruecos',
    haiti: 'Haití',
    escocia: 'Escocia',
    'ee.uu.': 'Estados Unidos',
    'estados unidos': 'Estados Unidos',
    usa: 'Estados Unidos',
    paraguay: 'Paraguay',
    turquia: 'Turquía',
    australia: 'Australia',
    alemania: 'Alemania',
    curazao: 'Curazao',
    'costa de marfil': 'Costa de Marfil',
    ecuador: 'Ecuador',
    'paises bajos': 'Países Bajos',
    japon: 'Japón',
    suecia: 'Suecia',
    tunez: 'Túnez',
    belgica: 'Bélgica',
    egipto: 'Egipto',
    eipto: 'Egipto',
    iran: 'Irán',
    'nueva zelanda': 'Nueva Zelanda',
    españa: 'España',
    espana: 'España',
    'cabo verde': 'Cabo Verde',
    uruguay: 'Uruguay',
    'arabia saudita': 'Arabia Saudita',
    francia: 'Francia',
    senegal: 'Senegal',
    noruega: 'Noruega',
    irak: 'Iraq',
    iraq: 'Iraq',
    argentina: 'Argentina',
    argelia: 'Argelia',
    austria: 'Austria',
    jordania: 'Jordania',
    portugal: 'Portugal',
    congo: 'República Democrática del Congo',
    'rd congo': 'República Democrática del Congo',
    uzbekistan: 'Uzbekistán',
    colombia: 'Colombia',
    inglaterra: 'Inglaterra',
    croacia: 'Croacia',
    ghana: 'Ghana',
    panama: 'Panamá',
  }

  if (aliases[key]) return aliases[key]

  const byEs = new Map(
    teamsData.teams.map((t) => [
      t.name_es
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, ''),
      t.name_es,
    ]),
  )
  if (byEs.has(key)) return byEs.get(key)!

  const byEn = new Map(
    teamsData.teams.map((t) => [
      t.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, ''),
      t.name_es,
    ]),
  )
  if (byEn.has(key)) return byEn.get(key)!

  throw new Error(`Equipo desconocido: "${raw}"`)
}

const nameEsToEnglish = new Map(teamsData.teams.map((t) => [t.name_es, t.name]))

function mapScores(entries: ScoreEntry[]): Record<number, { predHome: number; predAway: number }> {
  const groupMatches = fixture.matches.filter((m) => m.group)
  const englishToEs = new Map(teamsData.teams.map((t) => [t.name, t.name_es]))
  const result: Record<number, { predHome: number; predAway: number }> = {}

  for (const entry of entries) {
    const teamA = normalizeTeamName(entry.a)
    const teamB = normalizeTeamName(entry.b)
    const englishA = nameEsToEnglish.get(teamA)
    const englishB = nameEsToEnglish.get(teamB)
    if (!englishA || !englishB) {
      throw new Error(`Sin mapeo EN para ${teamA} o ${teamB}`)
    }

    const match = groupMatches.find(
      (m) =>
        (m.home === englishA && m.away === englishB) ||
        (m.home === englishB && m.away === englishA),
    )
    if (!match) {
      throw new Error(`Partido no encontrado: ${teamA} vs ${teamB}`)
    }

    const predHome =
      match.home === englishA ? entry.home : match.home === englishB ? entry.away : NaN
    const predAway =
      match.away === englishB ? entry.away : match.away === englishA ? entry.home : NaN

    if (Number.isNaN(predHome) || Number.isNaN(predAway)) {
      throw new Error(`Orientación fallida: ${teamA} vs ${teamB}`)
    }

    result[match.id] = { predHome, predAway }
  }

  if (Object.keys(result).length !== entries.length) {
    throw new Error(`Duplicados en entradas (${entries.length} vs ${Object.keys(result).length})`)
  }

  return result
}

const davoGroups: ScoreEntry[] = [
  // A
  { a: 'México', b: 'Sudáfrica', home: 2, away: 1 },
  { a: 'Corea del Sur', b: 'República Checa', home: 0, away: 0 },
  { a: 'México', b: 'Corea del Sur', home: 1, away: 2 },
  { a: 'República Checa', b: 'Sudáfrica', home: 1, away: 0 },
  { a: 'México', b: 'República Checa', home: 1, away: 0 },
  { a: 'Corea del Sur', b: 'Sudáfrica', home: 2, away: 0 },
  // B
  { a: 'Canadá', b: 'Bosnia y Herzegovina', home: 1, away: 1 },
  { a: 'Catar', b: 'Suiza', home: 0, away: 3 },
  { a: 'Canadá', b: 'Catar', home: 2, away: 1 },
  { a: 'Bosnia y Herzegovina', b: 'Suiza', home: 0, away: 1 },
  { a: 'Suiza', b: 'Canadá', home: 0, away: 0 },
  { a: 'Bosnia y Herzegovina', b: 'Catar', home: 3, away: 0 },
  // C
  { a: 'Brasil', b: 'Marruecos', home: 1, away: 2 },
  { a: 'Haití', b: 'Escocia', home: 0, away: 1 },
  { a: 'Brasil', b: 'Haití', home: 5, away: 0 },
  { a: 'Marruecos', b: 'Escocia', home: 0, away: 1 },
  { a: 'Brasil', b: 'Escocia', home: 2, away: 0 },
  { a: 'Marruecos', b: 'Haití', home: 3, away: 0 },
  // D
  { a: 'Estados Unidos', b: 'Paraguay', home: 1, away: 1 },
  { a: 'Turquía', b: 'Australia', home: 3, away: 0 },
  { a: 'Paraguay', b: 'Turquía', home: 1, away: 1 },
  { a: 'Estados Unidos', b: 'Australia', home: 2, away: 0 },
  { a: 'Paraguay', b: 'Australia', home: 2, away: 0 },
  { a: 'Estados Unidos', b: 'Turquía', home: 1, away: 2 },
  // E
  { a: 'Alemania', b: 'Curazao', home: 7, away: 0 },
  { a: 'Costa de Marfil', b: 'Ecuador', home: 1, away: 2 },
  { a: 'Alemania', b: 'Costa de Marfil', home: 0, away: 0 },
  { a: 'Ecuador', b: 'Curazao', home: 2, away: 0 },
  { a: 'Ecuador', b: 'Alemania', home: 1, away: 0 },
  { a: 'Curazao', b: 'Costa de Marfil', home: 0, away: 2 },
  // F
  { a: 'Países Bajos', b: 'Japón', home: 2, away: 2 },
  { a: 'Suecia', b: 'Túnez', home: 3, away: 3 },
  { a: 'Suecia', b: 'Túnez', home: 3, away: 1 },
  { a: 'Países Bajos', b: 'Suecia', home: 1, away: 0 },
  { a: 'Japón', b: 'Túnez', home: 3, away: 0 },
  { a: 'Japón', b: 'Suecia', home: 3, away: 2 },
  { a: 'Países Bajos', b: 'Túnez', home: 2, away: 0 },
  // G
  { a: 'Bélgica', b: 'Egipto', home: 3, away: 1 },
  { a: 'Irán', b: 'Nueva Zelanda', home: 0, away: 0 },
  { a: 'Bélgica', b: 'Irán', home: 1, away: 0 },
  { a: 'Egipto', b: 'Nueva Zelanda', home: 2, away: 0 },
  { a: 'Bélgica', b: 'Nueva Zelanda', home: 2, away: 0 },
  { a: 'Egipto', b: 'Irán', home: 1, away: 1 },
  // H
  { a: 'España', b: 'Cabo Verde', home: 6, away: 0 },
  { a: 'Uruguay', b: 'Arabia Saudita', home: 1, away: 0 },
  { a: 'España', b: 'Arabia Saudita', home: 4, away: 0 },
  { a: 'Cabo Verde', b: 'Uruguay', home: 0, away: 1 },
  { a: 'Cabo Verde', b: 'Arabia Saudita', home: 0, away: 3 },
  { a: 'España', b: 'Uruguay', home: 2, away: 0 },
  // I
  { a: 'Francia', b: 'Senegal', home: 1, away: 0 },
  { a: 'Iraq', b: 'Noruega', home: 0, away: 4 },
  { a: 'Francia', b: 'Iraq', home: 7, away: 0 },
  { a: 'Senegal', b: 'Noruega', home: 2, away: 1 },
  { a: 'Francia', b: 'Noruega', home: 2, away: 1 },
  { a: 'Senegal', b: 'Iraq', home: 2, away: 0 },
  // J
  { a: 'Argentina', b: 'Argelia', home: 2, away: 2 },
  { a: 'Austria', b: 'Jordania', home: 2, away: 0 },
  { a: 'Argentina', b: 'Austria', home: 2, away: 0 },
  { a: 'Argelia', b: 'Jordania', home: 2, away: 0 },
  { a: 'Argentina', b: 'Jordania', home: 5, away: 0 },
  { a: 'Argelia', b: 'Austria', home: 1, away: 1 },
  // K
  { a: 'Portugal', b: 'República Democrática del Congo', home: 0, away: 1 },
  { a: 'Uzbekistán', b: 'Colombia', home: 0, away: 3 },
  { a: 'Portugal', b: 'Uzbekistán', home: 2, away: 0 },
  { a: 'Colombia', b: 'República Democrática del Congo', home: 4, away: 1 },
  { a: 'República Democrática del Congo', b: 'Uzbekistán', home: 1, away: 0 },
  { a: 'Portugal', b: 'Colombia', home: 2, away: 2 },
  // L
  { a: 'Inglaterra', b: 'Croacia', home: 1, away: 0 },
  { a: 'Ghana', b: 'Panamá', home: 2, away: 0 },
  { a: 'Inglaterra', b: 'Ghana', home: 1, away: 0 },
  { a: 'Croacia', b: 'Panamá', home: 1, away: 0 },
  { a: 'Inglaterra', b: 'Panamá', home: 6, away: 2 },
  { a: 'Croacia', b: 'Ghana', home: 1, away: 1 },
]

// Davo tiene dos resultados Suecia-Túnez; el fixture solo tiene uno (M12). Se usa 3-1.
davoGroups.splice(
  davoGroups.findIndex((e) => e.a === 'Suecia' && e.b === 'Túnez' && e.home === 3 && e.away === 3),
  1,
)

const maldiniGroups: ScoreEntry[] = [
  // A
  { a: 'México', b: 'Sudáfrica', home: 2, away: 0 },
  { a: 'Corea del Sur', b: 'República Checa', home: 1, away: 1 },
  { a: 'República Checa', b: 'Sudáfrica', home: 3, away: 1 },
  { a: 'México', b: 'Corea del Sur', home: 1, away: 1 },
  { a: 'Sudáfrica', b: 'Corea del Sur', home: 0, away: 1 },
  { a: 'República Checa', b: 'México', home: 1, away: 2 },
  // B
  { a: 'Canadá', b: 'Bosnia y Herzegovina', home: 2, away: 2 },
  { a: 'Catar', b: 'Suiza', home: 0, away: 3 },
  { a: 'Bosnia y Herzegovina', b: 'Catar', home: 2, away: 0 },
  { a: 'Suiza', b: 'Canadá', home: 2, away: 0 },
  { a: 'Suiza', b: 'Bosnia y Herzegovina', home: 1, away: 1 },
  { a: 'Canadá', b: 'Catar', home: 4, away: 1 },
  // C
  { a: 'Brasil', b: 'Marruecos', home: 1, away: 1 },
  { a: 'Haití', b: 'Escocia', home: 0, away: 3 },
  { a: 'Brasil', b: 'Haití', home: 3, away: 0 },
  { a: 'Escocia', b: 'Marruecos', home: 0, away: 1 },
  { a: 'Escocia', b: 'Brasil', home: 1, away: 1 },
  { a: 'Marruecos', b: 'Haití', home: 3, away: 1 },
  // D
  { a: 'Turquía', b: 'Estados Unidos', home: 3, away: 1 },
  { a: 'Paraguay', b: 'Australia', home: 2, away: 0 },
  { a: 'Turquía', b: 'Paraguay', home: 1, away: 1 },
  { a: 'Estados Unidos', b: 'Australia', home: 1, away: 1 },
  { a: 'Australia', b: 'Turquía', home: 0, away: 2 },
  { a: 'Estados Unidos', b: 'Paraguay', home: 1, away: 1 },
  // E
  { a: 'Alemania', b: 'Curazao', home: 5, away: 0 },
  { a: 'Costa de Marfil', b: 'Ecuador', home: 1, away: 1 },
  { a: 'Alemania', b: 'Costa de Marfil', home: 2, away: 1 },
  { a: 'Ecuador', b: 'Curazao', home: 3, away: 0 },
  { a: 'Ecuador', b: 'Alemania', home: 1, away: 1 },
  { a: 'Curazao', b: 'Costa de Marfil', home: 0, away: 4 },
  // F
  { a: 'Suecia', b: 'Países Bajos', home: 1, away: 2 },
  { a: 'Japón', b: 'Túnez', home: 3, away: 0 },
  { a: 'Suecia', b: 'Japón', home: 1, away: 2 },
  { a: 'Túnez', b: 'Países Bajos', home: 1, away: 3 },
  { a: 'Túnez', b: 'Suecia', home: 1, away: 1 },
  { a: 'Países Bajos', b: 'Japón', home: 2, away: 2 },
  // G
  { a: 'Bélgica', b: 'Egipto', home: 0, away: 0 },
  { a: 'Irán', b: 'Nueva Zelanda', home: 1, away: 0 },
  { a: 'Bélgica', b: 'Irán', home: 2, away: 0 },
  { a: 'Nueva Zelanda', b: 'Egipto', home: 0, away: 1 },
  { a: 'Nueva Zelanda', b: 'Bélgica', home: 0, away: 4 },
  { a: 'Egipto', b: 'Irán', home: 1, away: 1 },
  // H
  { a: 'España', b: 'Cabo Verde', home: 5, away: 1 },
  { a: 'Arabia Saudita', b: 'Uruguay', home: 1, away: 1 },
  { a: 'España', b: 'Arabia Saudita', home: 3, away: 0 },
  { a: 'Uruguay', b: 'Cabo Verde', home: 3, away: 0 },
  { a: 'Uruguay', b: 'España', home: 1, away: 1 },
  { a: 'Cabo Verde', b: 'Arabia Saudita', home: 1, away: 2 },
  // I
  { a: 'Iraq', b: 'Francia', home: 0, away: 3 },
  { a: 'Senegal', b: 'Noruega', home: 2, away: 2 },
  { a: 'Iraq', b: 'Senegal', home: 1, away: 3 },
  { a: 'Noruega', b: 'Francia', home: 1, away: 3 },
  { a: 'Noruega', b: 'Iraq', home: 2, away: 0 },
  { a: 'Francia', b: 'Senegal', home: 2, away: 1 },
  // J
  { a: 'Argentina', b: 'Argelia', home: 1, away: 0 },
  { a: 'Austria', b: 'Jordania', home: 3, away: 0 },
  { a: 'Argentina', b: 'Austria', home: 1, away: 1 },
  { a: 'Jordania', b: 'Argelia', home: 0, away: 2 },
  { a: 'Jordania', b: 'Argentina', home: 0, away: 4 },
  { a: 'Argelia', b: 'Austria', home: 1, away: 2 },
  // K
  { a: 'República Democrática del Congo', b: 'Portugal', home: 0, away: 3 },
  { a: 'Uzbekistán', b: 'Colombia', home: 1, away: 3 },
  { a: 'República Democrática del Congo', b: 'Uzbekistán', home: 0, away: 0 },
  { a: 'Colombia', b: 'Portugal', home: 1, away: 2 },
  { a: 'Colombia', b: 'República Democrática del Congo', home: 3, away: 1 },
  { a: 'Portugal', b: 'Uzbekistán', home: 3, away: 0 },
  // L
  { a: 'Inglaterra', b: 'Croacia', home: 1, away: 1 },
  { a: 'Ghana', b: 'Panamá', home: 2, away: 1 },
  { a: 'Inglaterra', b: 'Ghana', home: 2, away: 0 },
  { a: 'Panamá', b: 'Croacia', home: 0, away: 1 },
  { a: 'Panamá', b: 'Inglaterra', home: 0, away: 4 },
  { a: 'Croacia', b: 'Ghana', home: 1, away: 1 },
]

const davoGroupScores = mapScores(davoGroups)
const maldiniGroupScores = mapScores(maldiniGroups)

console.log('Davo matches:', Object.keys(davoGroupScores).length)
console.log('Maldini matches:', Object.keys(maldiniGroupScores).length)

const cobraGroupOrder: Record<string, string[]> = {
  A: ['México', 'Corea del Sur', 'República Checa', 'Sudáfrica'],
  B: ['Canadá', 'Suiza', 'Bosnia y Herzegovina', 'Catar'],
  C: ['Marruecos', 'Brasil', 'Escocia', 'Haití'],
  D: ['Estados Unidos', 'Paraguay', 'Turquía', 'Australia'],
  E: ['Alemania', 'Ecuador', 'Costa de Marfil', 'Curazao'],
  F: ['Japón', 'Países Bajos', 'Suecia', 'Túnez'],
  G: ['Bélgica', 'Irán', 'Egipto', 'Nueva Zelanda'],
  H: ['España', 'Uruguay', 'Cabo Verde', 'Arabia Saudita'],
  I: ['Francia', 'Noruega', 'Senegal', 'Irak'],
  J: ['Argentina', 'Argelia', 'Austria', 'Jordania'],
  K: ['Colombia', 'Portugal', 'República Democrática del Congo', 'Uzbekistán'],
  L: ['Inglaterra', 'Ghana', 'Panamá', 'Croacia'],
}

const cobraThirdPlaces = [
  'Suecia',
  'Escocia',
  'República Democrática del Congo',
  'Cabo Verde',
  'Senegal',
  'Turquía',
  'Costa de Marfil',
  'Egipto',
]

type KnockoutPick = { winner: string; loser: string }

const davoKnockout: KnockoutPick[] = [
  { winner: 'México', loser: 'Canadá' },
  { winner: 'Marruecos', loser: 'Japón' },
  { winner: 'Ecuador', loser: 'Escocia' },
  { winner: 'Senegal', loser: 'Estados Unidos' },
  { winner: 'Colombia', loser: 'Argelia' },
  { winner: 'España', loser: 'Jordania' },
  { winner: 'Bosnia y Herzegovina', loser: 'Turquía' },
  { winner: 'Bélgica', loser: 'República Checa' },
  { winner: 'Países Bajos', loser: 'Brasil' },
  { winner: 'Francia', loser: 'Costa de Marfil' },
  { winner: 'Alemania', loser: 'Corea del Sur' },
  { winner: 'Inglaterra', loser: 'Noruega' },
  { winner: 'Argentina', loser: 'Uruguay' },
  { winner: 'Paraguay', loser: 'Egipto' },
  { winner: 'Suiza', loser: 'Austria' },
  { winner: 'Portugal', loser: 'Croacia' },
  { winner: 'Japón', loser: 'México' },
  { winner: 'Ecuador', loser: 'Senegal' },
  { winner: 'España', loser: 'Colombia' },
  { winner: 'Bélgica', loser: 'Bosnia y Herzegovina' },
  { winner: 'Francia', loser: 'Países Bajos' },
  { winner: 'Alemania', loser: 'Inglaterra' },
  { winner: 'Argentina', loser: 'Paraguay' },
  { winner: 'Portugal', loser: 'Suiza' },
  { winner: 'Japón', loser: 'Ecuador' },
  { winner: 'España', loser: 'Bélgica' },
  { winner: 'Francia', loser: 'Alemania' },
  { winner: 'Argentina', loser: 'Portugal' },
  { winner: 'España', loser: 'Japón' },
  { winner: 'Francia', loser: 'Argentina' },
  { winner: 'España', loser: 'Francia' },
  { winner: 'Argentina', loser: 'Japón' },
]

const cobraKnockout: KnockoutPick[] = [
  { winner: 'Alemania', loser: 'Turquía' },
  { winner: 'Francia', loser: 'Suecia' },
  { winner: 'Corea del Sur', loser: 'Suiza' },
  { winner: 'Brasil', loser: 'Japón' },
  { winner: 'Portugal', loser: 'Ghana' },
  { winner: 'España', loser: 'Argelia' },
  { winner: 'Estados Unidos', loser: 'Costa de Marfil' },
  { winner: 'Bélgica', loser: 'Cabo Verde' },
  { winner: 'Marruecos', loser: 'Países Bajos' },
  { winner: 'Noruega', loser: 'Ecuador' },
  { winner: 'México', loser: 'Escocia' },
  { winner: 'Inglaterra', loser: 'República Democrática del Congo' },
  { winner: 'Argentina', loser: 'Uruguay' },
  { winner: 'Paraguay', loser: 'Irán' },
  { winner: 'Canadá', loser: 'Egipto' },
  { winner: 'Colombia', loser: 'Senegal' },
  { winner: 'Alemania', loser: 'Francia' },
  { winner: 'Brasil', loser: 'Corea del Sur' },
  { winner: 'España', loser: 'Portugal' },
  { winner: 'Estados Unidos', loser: 'Bélgica' },
  { winner: 'Noruega', loser: 'Marruecos' },
  { winner: 'México', loser: 'Inglaterra' },
  { winner: 'Argentina', loser: 'Paraguay' },
  { winner: 'Colombia', loser: 'Canadá' },
  { winner: 'Brasil', loser: 'Alemania' },
  { winner: 'España', loser: 'Estados Unidos' },
  { winner: 'Noruega', loser: 'México' },
  { winner: 'Argentina', loser: 'Colombia' },
  { winner: 'España', loser: 'Brasil' },
  { winner: 'Argentina', loser: 'Noruega' },
  { winner: 'Argentina', loser: 'España' },
]

const maldiniKnockout: KnockoutPick[] = [
  { winner: 'Alemania', loser: 'Escocia' },
  { winner: 'Francia', loser: 'Estados Unidos' },
  { winner: 'Corea del Sur', loser: 'Bosnia y Herzegovina' },
  { winner: 'Brasil', loser: 'Japón' },
  { winner: 'Croacia', loser: 'Colombia' },
  { winner: 'España', loser: 'Austria' },
  { winner: 'Turquía', loser: 'Canadá' },
  { winner: 'Bélgica', loser: 'República Checa' },
  { winner: 'Marruecos', loser: 'Países Bajos' },
  { winner: 'Ecuador', loser: 'Senegal' },
  { winner: 'México', loser: 'Costa de Marfil' },
  { winner: 'Inglaterra', loser: 'Noruega' },
  { winner: 'Argentina', loser: 'Uruguay' },
  { winner: 'Paraguay', loser: 'Egipto' },
  { winner: 'Suiza', loser: 'Irán' },
  { winner: 'Portugal', loser: 'Ghana' },
  { winner: 'Francia', loser: 'Alemania' },
  { winner: 'Brasil', loser: 'Corea del Sur' },
  { winner: 'España', loser: 'Croacia' },
  { winner: 'Turquía', loser: 'Bélgica' },
  { winner: 'Francia', loser: 'Brasil' },
  { winner: 'España', loser: 'Turquía' },
  { winner: 'Inglaterra', loser: 'Ecuador' },
  { winner: 'Portugal', loser: 'México' },
  { winner: 'Argentina', loser: 'Paraguay' },
  { winner: 'Portugal', loser: 'Suiza' },
  { winner: 'Francia', loser: 'Brasil' },
  { winner: 'España', loser: 'Turquía' },
  { winner: 'Inglaterra', loser: 'Portugal' },
  { winner: 'Portugal', loser: 'Argentina' },
  { winner: 'Francia', loser: 'Inglaterra' },
  { winner: 'España', loser: 'Portugal' },
]

const output = `// AUTO-GENERATED — npx tsx scripts/build-celebrity-predictions.ts
import type { CelebrityBracketSource } from './types'

export const CELEBRITY_BRACKET_SOURCES: CelebrityBracketSource[] = [
  {
    id: 'davo',
    label: 'Davo',
    shortLabel: 'Davo',
    description: 'Marcadores en todos los partidos de grupos y llave completa.',
    groupInputMode: 'scores',
    groupScores: ${JSON.stringify(davoGroupScores, null, 2)},
    knockoutPicks: ${JSON.stringify(davoKnockout, null, 2)},
    championNameEs: 'España',
  },
  {
    id: 'cobra',
    label: 'La Cobra',
    shortLabel: 'Cobra',
    description: 'Orden de clasificación por grupo y llave (sin marcadores de fase de grupos).',
    groupInputMode: 'standings-only',
    groupStandingsOrder: ${JSON.stringify(cobraGroupOrder, null, 2)},
    thirdPlaceOrder: ${JSON.stringify(cobraThirdPlaces.map((n) => normalizeTeamName(n)), null, 2)},
    knockoutPicks: ${JSON.stringify(cobraKnockout, null, 2)},
    championNameEs: 'Argentina',
  },
  {
    id: 'maldini-dieguez',
    label: 'Maldini & Dieguez',
    shortLabel: 'M&D',
    description: 'Marcadores en todos los partidos de grupos y llave completa.',
    groupInputMode: 'scores',
    groupScores: ${JSON.stringify(maldiniGroupScores, null, 2)},
    knockoutPicks: ${JSON.stringify(maldiniKnockout, null, 2)},
    championNameEs: 'España',
    galleryImages: [
      '/prode/celebrity-brackets/maldini-dieguez-grupos-a-c.png',
      '/prode/celebrity-brackets/maldini-dieguez-grupos-d-f.png',
      '/prode/celebrity-brackets/maldini-dieguez-grupos-g-i.png',
      '/prode/celebrity-brackets/maldini-dieguez-grupos-j-l.png',
      '/prode/celebrity-brackets/maldini-dieguez-llave.png',
    ],
  },
]
`

const outPath = resolve(process.cwd(), 'src/lib/bracket/celebrity-predictions/generated.ts')
writeFileSync(outPath, output)
console.log('Wrote', outPath)
