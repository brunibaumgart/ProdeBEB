import { prodebebBrandColors as c } from '@/lib/brand/icon-font'

type ProdebebAppIconProps = {
  variant: 'full' | 'compact'
}

export function ProdebebAppIcon({ variant }: ProdebebAppIconProps) {
  const badgeSize = variant === 'compact' ? 132 : 300
  const badgeRadius = variant === 'compact' ? 28 : 56
  const pSize = variant === 'compact' ? 72 : 196
  const bebSize = variant === 'compact' ? 28 : 52
  const wordmarkSize = variant === 'compact' ? 0 : 44
  const showWordmark = variant === 'full'

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
          gap: showWordmark ? 28 : 0,
        }}
      >
        <div
          style={{
            width: badgeSize,
            height: badgeSize,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: badgeRadius,
            background: `linear-gradient(180deg, ${c.gold} 0%, ${c.goldDark} 100%)`,
            boxShadow: '0 18px 48px rgba(0, 0, 0, 0.45)',
            border: `3px solid rgba(255, 255, 255, 0.12)`,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: bebSize > 0 ? -8 : 0,
            }}
          >
            <div
              style={{
                fontFamily: 'Bebas Neue',
                fontSize: pSize,
                lineHeight: 0.82,
                color: c.ink,
                letterSpacing: 2,
              }}
            >
              P
            </div>
            {bebSize > 0 ? (
              <div
                style={{
                  fontFamily: 'Bebas Neue',
                  fontSize: bebSize,
                  lineHeight: 0.9,
                  color: c.inkSoft,
                  letterSpacing: variant === 'compact' ? 3 : 6,
                  marginTop: variant === 'compact' ? -4 : -10,
                }}
              >
                BEB
              </div>
            ) : null}
          </div>
        </div>

        {showWordmark ? (
          <div
            style={{
              fontFamily: 'Bebas Neue',
              fontSize: wordmarkSize,
              color: c.gold,
              letterSpacing: 8,
            }}
          >
            PRODEBEB
          </div>
        ) : null}
      </div>
    </div>
  )
}
