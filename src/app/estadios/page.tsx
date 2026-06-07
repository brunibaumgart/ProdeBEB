import { AppShell } from '@/components/layout/app-shell'
import { getAllVenues, getGoogleMapsUrl } from '@/lib/queries/venues'
import { MapPin, Users } from 'lucide-react'

export default async function EstadiosPage() {
  const venues = await getAllVenues()

  return (
    <AppShell pathname="/estadios">
      <div className="mb-6">
        <h1 className="font-heading text-3xl tracking-wide">ESTADIOS</h1>
        <p className="mt-2 text-muted-foreground">
          {venues.length} sedes en USA, México y Canadá
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {venues.map((venue) => (
          <article
            key={venue.id}
            className="flex flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
          >
            <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <MapPin className="size-5" aria-hidden />
            </div>
            <h2 className="font-heading text-xl tracking-wide">{venue.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {venue.city}, {venue.country}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Users className="size-3.5" aria-hidden />
                {venue.capacity.toLocaleString('es-AR')} espectadores
              </span>
              <span>·</span>
              <span>
                {venue._count.matches} partido{venue._count.matches !== 1 ? 's' : ''}
              </span>
            </div>
            <a
              href={getGoogleMapsUrl(venue)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 text-sm font-medium text-primary hover:underline"
            >
              Ver en Google Maps →
            </a>
          </article>
        ))}
      </div>
    </AppShell>
  )
}
