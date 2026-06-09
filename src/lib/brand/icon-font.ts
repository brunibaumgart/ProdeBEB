const BEBAS_NEUE_URL =
  'https://fonts.gstatic.com/s/bebasneue/v14/JTUSjIg69CK48gW7PXoo9Wlhyw.woff2'

export async function getBebasNeueFont() {
  const response = await fetch(BEBAS_NEUE_URL)
  if (!response.ok) {
    throw new Error('No se pudo cargar la fuente Bebas Neue para el ícono.')
  }
  return response.arrayBuffer()
}

export const prodebebIconFonts = (data: ArrayBuffer) =>
  [{ name: 'Bebas Neue', data, style: 'normal' as const, weight: 400 as const }]

export const prodebebBrandColors = {
  backgroundFrom: '#1A1A2E',
  backgroundTo: '#0D0D1A',
  gold: '#F5C542',
  goldDark: '#D4A82E',
  ink: '#0D0D1A',
  inkSoft: '#141428',
} as const
