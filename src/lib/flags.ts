const FLAG_OVERRIDES: Record<string, string> = {
  'GB-SCT': 'gb-sct',
  'GB-ENG': 'gb-eng',
}

export function getFlagCode(iso2: string): string {
  return (FLAG_OVERRIDES[iso2] ?? iso2).toLowerCase()
}
