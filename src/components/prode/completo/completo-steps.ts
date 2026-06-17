import type { CompletoStepId } from '@/components/prode/completo/completo-step-nav'

export type { CompletoStepId }

export const COMPLETO_STEPS: { id: CompletoStepId; label: string }[] = [
  { id: 1, label: 'Grupos' },
  { id: 2, label: 'Mejores terceros' },
  { id: 3, label: 'Eliminatorias' },
]
