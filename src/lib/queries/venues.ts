import type { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'

export type VenueWithMatchCount = Prisma.VenueGetPayload<object> & {
  _count: { matches: number }
}

export async function getAllVenues(): Promise<VenueWithMatchCount[]> {
  return prisma.venue.findMany({
    include: { _count: { select: { matches: true } } },
    orderBy: { name: 'asc' },
  })
}

export async function getVenueById(id: string): Promise<VenueWithMatchCount | null> {
  return prisma.venue.findUnique({
    where: { id },
    include: { _count: { select: { matches: true } } },
  })
}

export function getGoogleMapsUrl(venue: { name: string; city: string; country: string }): string {
  const query = encodeURIComponent(`${venue.name}, ${venue.city}, ${venue.country}`)
  return `https://www.google.com/maps/search/?api=1&query=${query}`
}
