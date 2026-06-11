import { ImageResponse } from 'next/og'

import { getBebasNeueFont, prodebebIconFonts } from '@/lib/brand/icon-font'
import { getPollitosImageBase64 } from '@/lib/brand/pollitos-asset'
import { ProdebebPollitosIcon } from '@/lib/brand/prodebeb-pollitos-icon'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default async function Icon() {
  const [font, pollitosSrc] = await Promise.all([getBebasNeueFont(), getPollitosImageBase64()])

  return new ImageResponse(<ProdebebPollitosIcon pollitosSrc={pollitosSrc} variant="full" />, {
    ...size,
    fonts: prodebebIconFonts(font),
  })
}
