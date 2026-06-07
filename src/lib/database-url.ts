const LEGACY_SSL_MODES = new Set(['prefer', 'require', 'verify-ca'])

export function resolveDatabaseUrl(connectionString = process.env.DATABASE_URL): string {
  if (!connectionString) {
    throw new Error('DATABASE_URL is not defined')
  }

  try {
    const url = new URL(connectionString)
    const sslmode = url.searchParams.get('sslmode')

    if (!sslmode || LEGACY_SSL_MODES.has(sslmode)) {
      url.searchParams.set('sslmode', 'verify-full')
    }

    return url.toString()
  } catch {
    return connectionString
  }
}
