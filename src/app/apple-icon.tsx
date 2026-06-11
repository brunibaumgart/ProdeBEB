import { ImageResponse } from 'next/og'

import { getBebasNeueFont, prodebebIconFonts } from '@/lib/brand/icon-font'
import { getPollitosImageBase64 } from '@/lib/brand/pollitos-asset'
import { ProdebebPollitosIcon } from '@/lib/brand/prodebeb-pollitos-icon'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default async function AppleIcon() {
  const [font, pollitosSrc] = await Promise.all([getBebasNeueFont(), getPollitosImageBase64()])

  return new ImageResponse(<ProdebebPollitosIcon pollitosSrc={pollitosSrc} variant="compact" />, {
    ...size,
    fonts: prodebebIconFonts(font),
  })
}
