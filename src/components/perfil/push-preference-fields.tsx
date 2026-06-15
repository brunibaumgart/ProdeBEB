'use client'

import { cn } from '@/lib/utils'

export interface PushPreferenceValues {
  reminders: boolean
  kickoff: boolean
  surprise: boolean
}

interface PushPreferenceFieldsProps {
  values: PushPreferenceValues
  onChange: (values: PushPreferenceValues) => void
  showSurprise: boolean
  disabled?: boolean
  compact?: boolean
}

function PreferenceOption({
  id,
  label,
  description,
  checked,
  disabled,
  compact,
  onCheckedChange,
}: {
  id: string
  label: string
  description: string
  checked: boolean
  disabled?: boolean
  compact?: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-lg border border-border/70 bg-muted/20 transition-colors hover:bg-muted/35',
        compact ? 'p-3' : 'p-3.5',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onCheckedChange(event.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-primary"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
      </span>
    </label>
  )
}

export function PushPreferenceFields({
  values,
  onChange,
  showSurprise,
  disabled = false,
  compact = false,
}: PushPreferenceFieldsProps) {
  return (
    <div className={cn('grid gap-2', compact ? 'gap-2' : 'gap-2.5')}>
      <PreferenceOption
        id="push-pref-reminders"
        label="Recordatorio de predicciones"
        description="A las 11:00 te avisamos si te falta cargar Fecha a Fecha."
        checked={values.reminders}
        disabled={disabled}
        compact={compact}
        onCheckedChange={(reminders) => onChange({ ...values, reminders })}
      />
      <PreferenceOption
        id="push-pref-kickoff"
        label="Arranque y goles en vivo"
        description="Te avisamos cuando arranca un partido y cada vez que confirmamos un gol."
        checked={values.kickoff}
        disabled={disabled}
        compact={compact}
        onCheckedChange={(kickoff) => onChange({ ...values, kickoff })}
      />
      {showSurprise ? (
        <PreferenceOption
          id="push-pref-surprise"
          label="Notificaciones sorpresa"
          description="Avisos especiales y sorpresas de ProdeBEB solo para vos."
          checked={values.surprise}
          disabled={disabled}
          compact={compact}
          onCheckedChange={(surprise) => onChange({ ...values, surprise })}
        />
      ) : null}
    </div>
  )
}
