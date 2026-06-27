import { cn } from '@/lib/utils'

interface ProdePointsOverviewProps {
  pointsMatchday: number
  pointsScorers: number
  pointsComplete: number
  pointsTotal: number
  pointsFriendly?: number
  showFriendly?: boolean
}

export function ProdePointsOverview({
  pointsMatchday,
  pointsScorers,
  pointsComplete,
  pointsTotal,
  pointsFriendly = 0,
  showFriendly = false,
}: ProdePointsOverviewProps) {
  const cards = [
    {
      label: 'Fecha a Fecha',
      value: pointsMatchday,
      highlight: false,
      disabled: false,
    },
    {
      label: 'Goleadores',
      value: pointsScorers,
      highlight: false,
      disabled: false,
    },
    {
      label: 'Completo',
      value: pointsComplete,
      highlight: false,
      disabled: false,
    },
    {
      label: 'Total',
      value: pointsTotal,
      highlight: true,
      disabled: false,
    },
  ]

  if (showFriendly) {
    cards.push({
      label: 'Amistosos',
      value: pointsFriendly,
      highlight: true,
      disabled: false,
    })
  }

  return (
    <section
      className={cn(
        'mb-8 grid gap-3',
        showFriendly ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4',
      )}
    >
      {cards.map((card) => (
        <div
          key={card.label}
          className={cn(
            'rounded-xl border p-4 text-center',
            card.disabled
              ? 'border-border/60 bg-muted/20 opacity-70'
              : card.highlight
                ? 'border-primary/30 bg-primary/5'
                : 'border-border bg-card',
          )}
        >
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {card.label}
            {card.disabled ? (
              <span className="mt-0.5 block text-[10px] normal-case tracking-normal">
                Próximamente
              </span>
            ) : null}
          </p>
          <p
            className={cn(
              'font-heading text-3xl tabular-nums',
              card.disabled
                ? 'text-muted-foreground'
                : card.highlight
                  ? 'text-primary'
                  : 'text-foreground',
            )}
          >
            {card.value}
          </p>
        </div>
      ))}
    </section>
  )
}
