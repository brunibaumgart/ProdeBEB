import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const BEBAS_NEUE_PATH = join(process.cwd(), 'src/lib/brand/fonts/BebasNeue-Regular.ttf')

export async function getBebasNeueFont() {
  return readFile(BEBAS_NEUE_PATH)
}

export const prodebebIconFonts = (data: Buffer) =>
  [{ name: 'Bebas Neue', data, style: 'normal' as const, weight: 400 as const }]

export const prodebebBrandColors = {
  backgroundFrom: '#1A1A2E',
  backgroundTo: '#0D0D1A',
  gold: '#F5C542',
  goldDark: '#D4A82E',
  ink: '#0D0D1A',
  inkSoft: '#141428',
} as const
