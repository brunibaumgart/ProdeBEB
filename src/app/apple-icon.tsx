import { ImageResponse } from 'next/og'

import { getBebasNeueFont, prodebebIconFonts } from '@/lib/brand/icon-font'
import { ProdebebAppIcon } from '@/lib/brand/prodebeb-app-icon'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default async function AppleIcon() {
  const font = await getBebasNeueFont()

  return new ImageResponse(<ProdebebAppIcon variant="compact" />, {
    ...size,
    fonts: prodebebIconFonts(font),
  })
}
