import { ImageResponse } from 'next/og'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1A1A2E 0%, #0D0D1A 100%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <div style={{ fontSize: 120 }}>⚽</div>
          <div
            style={{
              fontSize: 52,
              fontWeight: 700,
              color: '#F5C542',
              letterSpacing: 2,
            }}
          >
            PBEB
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
