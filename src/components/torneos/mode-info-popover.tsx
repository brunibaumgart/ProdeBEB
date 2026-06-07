'use client'

import { Info } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'

interface ModeInfoPopoverProps {
  title: string
  scoring: string[]
}

export function ModeInfoPopover({ title, scoring }: ModeInfoPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={`Cómo se suman los puntos en ${title}`}
          />
        }
      >
        <Info className="size-3.5" aria-hidden />
      </PopoverTrigger>
      <PopoverContent>
        <PopoverTitle>{title} · cómo suman los puntos</PopoverTitle>
        <PopoverDescription render={<ul className="grid list-disc gap-1 pl-4" />}>
          {scoring.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </PopoverDescription>
      </PopoverContent>
    </Popover>
  )
}
