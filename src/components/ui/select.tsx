'use client'

import * as React from 'react'
import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export type SelectOption<T extends string | number = string> = {
  value: T
  label: string
  disabled?: boolean
}

interface FieldSelectProps<T extends string | number> {
  value: T
  onValueChange: (value: T) => void
  options: SelectOption<T>[]
  disabled?: boolean
  className?: string
  'aria-label'?: string
}

function FieldSelect<T extends string | number>({
  value,
  onValueChange,
  options,
  disabled = false,
  className,
  'aria-label': ariaLabel,
}: FieldSelectProps<T>) {
  const [open, setOpen] = useState(false)
  const selected = options.find((option) => option.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        aria-label={ariaLabel ?? selected?.label}
        className={cn('w-full', className)}
        render={
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="h-9 w-full justify-between px-3 font-normal"
          />
        }
      >
        <span className="truncate">{selected?.label ?? 'Elegir'}</span>
        <ChevronDown
          className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-(--anchor-width) max-h-60 overflow-y-auto p-1"
      >
        <ul role="listbox" aria-label={ariaLabel} className="space-y-0.5">
          {options.map((option) => {
            const isSelected = option.value === value
            return (
              <li key={String(option.value)} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  disabled={option.disabled}
                  onClick={() => {
                    if (option.disabled) return
                    onValueChange(option.value)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors',
                    isSelected
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground hover:bg-muted',
                    option.disabled && 'cursor-not-allowed opacity-40',
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected ? <Check className="size-4 shrink-0" aria-hidden /> : null}
                </button>
              </li>
            )
          })}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

export { FieldSelect }
