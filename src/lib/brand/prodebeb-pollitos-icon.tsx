import { prodebebBrandColors as c } from '@/lib/brand/icon-font'

type ProdebebPollitosIconProps = {
  pollitosSrc: string
  variant: 'full' | 'compact'
}

function ArgentinaFlag({ width, height }: { width: number; height: number }) {
  return (
    <div
      style={{
        width,
        height,
        display: 'flex',
        overflow: 'hidden',
        borderRadius: 4,
        border: '2px solid rgba(255,255,255,0.25)',
      }}
    >
      <div style={{ width: '33.33%', height: '100%', background: '#75AADB' }} />
      <div style={{ width: '33.34%', height: '100%', background: '#FFFFFF' }} />
      <div style={{ width: '33.33%', height: '100%', background: '#75AADB' }} />
    </div>
  )
}

export function ProdebebPollitosIcon({ pollitosSrc, variant }: ProdebebPollitosIconProps) {
  const compact = variant === 'compact'
  const pollitosWidth = compact ? 118 : 280
  const pollitosHeight = compact ? 88 : 210
  const flagWidth = compact ? 34 : 56
  const flagHeight = compact ? 22 : 36
  const bebSize = compact ? 26 : 44

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(145deg, ${c.backgroundFrom} 0%, ${c.backgroundTo} 100%)`,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: compact ? 8 : 14,
        }}
      >
        <img
          src={pollitosSrc}
          alt=""
          width={pollitosWidth}
          height={pollitosHeight}
          style={{ objectFit: 'contain' }}
        />
        <ArgentinaFlag width={flagWidth} height={flagHeight} />
        <div
          style={{
            fontFamily: 'Bebas Neue',
            fontSize: bebSize,
            lineHeight: 0.9,
            color: c.gold,
            letterSpacing: compact ? 4 : 8,
          }}
        >
          BEB
        </div>
      </div>
    </div>
  )
}
