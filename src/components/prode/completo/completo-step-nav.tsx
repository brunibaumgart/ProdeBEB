import { cn } from '@/lib/utils'

export type CompletoStepId = 1 | 2 | 3

const STEPS: { id: CompletoStepId; short: string }[] = [
  { id: 1, short: 'Grupos' },
  { id: 2, short: '3ros' },
  { id: 3, short: 'Llave' },
]

interface CompletoStepNavProps {
  step: CompletoStepId
  onStepChange: (step: CompletoStepId) => void
  canEnterStep: (step: CompletoStepId) => boolean
  badges: Partial<Record<CompletoStepId, string>>
}

export function CompletoStepNav({
  step,
  onStepChange,
  canEnterStep,
  badges,
}: CompletoStepNavProps) {
  return (
    <nav
      className="grid shrink-0 grid-cols-3 gap-1 rounded-xl border border-border bg-muted/30 p-1"
      aria-label="Etapas del Prode Completo"
    >
      {STEPS.map((item) => {
        const active = step === item.id
        const enabled = canEnterStep(item.id)
        const badge = badges[item.id]

        return (
          <button
            key={item.id}
            type="button"
            disabled={!enabled}
            onClick={() => onStepChange(item.id)}
            className={cn(
              'flex flex-col items-center justify-center rounded-lg px-1 py-2 text-center transition-colors',
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-card/80',
              !enabled && 'cursor-not-allowed opacity-40',
            )}
          >
            <span className="text-[11px] font-semibold leading-tight">{item.short}</span>
            {badge ? (
              <span
                className={cn(
                  'mt-0.5 text-[9px] tabular-nums leading-none',
                  active ? 'text-primary-foreground/80' : 'text-muted-foreground',
                )}
              >
                {badge}
              </span>
            ) : null}
          </button>
        )
      })}
    </nav>
  )
}
