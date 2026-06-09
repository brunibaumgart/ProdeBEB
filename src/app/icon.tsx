import { ImageResponse } from 'next/og'

import { getBebasNeueFont, prodebebIconFonts } from '@/lib/brand/icon-font'
import { ProdebebAppIcon } from '@/lib/brand/prodebeb-app-icon'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default async function Icon() {
  const font = await getBebasNeueFont()

  return new ImageResponse(<ProdebebAppIcon variant="full" />, {
    ...size,
    fonts: prodebebIconFonts(font),
  })
}
