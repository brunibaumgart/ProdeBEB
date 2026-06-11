import type { MetadataRoute } from 'next'

import { getSiteUrl } from '@/lib/site-url'
import { getOfficialMatchIds } from '@/lib/queries/matches'
import { getOfficialTeamSlugs } from '@/lib/queries/teams'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl()
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    '',
    '/fixture',
    '/grupos',
    '/estadisticas',
    '/selecciones',
    '/prode',
    '/prode/fecha',
    '/prode/completo',
    '/torneos',
  ].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: now,
    changeFrequency: path.startsWith('/prode') ? 'hourly' : 'daily',
    priority: path === '' ? 1 : path === '/prode' ? 0.9 : 0.7,
  }))

  try {
    const [teamSlugs, matchIds] = await Promise.all([getOfficialTeamSlugs(), getOfficialMatchIds()])

    const teamRoutes: MetadataRoute.Sitemap = teamSlugs.map((slug) => ({
      url: `${baseUrl}/selecciones/${slug}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6,
    }))

    const matchRoutes: MetadataRoute.Sitemap = matchIds.map((id) => ({
      url: `${baseUrl}/fixture/${id}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.5,
    }))

    return [...staticRoutes, ...teamRoutes, ...matchRoutes]
  } catch {
    return staticRoutes
  }
}
