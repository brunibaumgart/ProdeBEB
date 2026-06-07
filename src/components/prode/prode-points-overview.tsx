import { cn } from '@/lib/utils'

interface ProdePointsOverviewProps {
  pointsMatchday: number
  pointsScorers: number
  pointsComplete: number
  pointsFriendly?: number
  showFriendly?: boolean
}

export function ProdePointsOverview({
  pointsMatchday,
  pointsScorers,
  pointsComplete,
  pointsFriendly = 0,
  showFriendly = false,
}: ProdePointsOverviewProps) {
  const cards = [
    {
      label: 'Fecha a Fecha',
      value: pointsMatchday,
      highlight: false,
    },
    {
      label: 'Goleadores',
      value: pointsScorers,
      highlight: false,
    },
    {
      label: 'Completo',
      value: pointsComplete,
      highlight: false,
    },
  ]

  if (showFriendly) {
    cards.push({
      label: 'Amistosos',
      value: pointsFriendly,
      highlight: true,
    })
  }

  return (
    <section
      className={cn(
        'mb-8 grid gap-3',
        showFriendly ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'
      )}
    >
      {cards.map((card) => (
        <div
          key={card.label}
          className={cn(
            'rounded-xl border p-4 text-center',
            card.highlight
              ? 'border-violet-500/40 bg-violet-500/10'
              : 'border-border bg-card'
          )}
        >
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{card.label}</p>
          <p
            className={cn(
              'font-heading text-3xl tabular-nums',
              card.highlight ? 'text-violet-300' : 'text-foreground'
            )}
          >
            {card.value}
          </p>
        </div>
      ))}
    </section>
  )
}
