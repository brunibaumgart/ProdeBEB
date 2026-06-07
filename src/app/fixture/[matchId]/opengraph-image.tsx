import { ImageResponse } from 'next/og'
import { notFound } from 'next/navigation'

import { getMatchTitle } from '@/lib/match-label'
import { getMatchById } from '@/lib/queries/matches'
import { formatDbMatchKickoff } from '@/lib/time'

export const alt = 'Partido ProdeBEB'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

interface Props {
  params: Promise<{ matchId: string }>
}

export default async function Image({ params }: Props) {
  const { matchId } = await params
  const id = parseInt(matchId, 10)
  if (Number.isNaN(id)) notFound()

  const match = await getMatchById(id, { includeTestMatches: false })
  if (!match) notFound()

  const title = getMatchTitle(match)
  const subtitle = `${formatDbMatchKickoff(match.date, match.timeArg)} · ${match.venue.name}`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 64,
          background: 'linear-gradient(135deg, #1A1A2E 0%, #0D0D1A 100%)',
          color: 'white',
        }}
      >
        <div style={{ fontSize: 28, color: '#F5C542', marginBottom: 16 }}>ProdeBEB · Mundial 2026</div>
        <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1, marginBottom: 24 }}>{title}</div>
        <div style={{ fontSize: 28, color: '#CBD5E1' }}>{subtitle}</div>
      </div>
    ),
    { ...size },
  )
}
