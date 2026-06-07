'use client'

import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'

interface CountdownTimerProps {
  targetDate: Date
  label?: string
  className?: string
  onComplete?: () => void
}

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
  total: number
}

function getTimeLeft(targetDate: Date): TimeLeft {
  const total = Math.max(0, targetDate.getTime() - Date.now())
  return {
    total,
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60),
  }
}

function pad(value: number): string {
  return value.toString().padStart(2, '0')
}

export function CountdownTimer({ targetDate, label, className, onComplete }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => getTimeLeft(targetDate))

  useEffect(() => {
    const interval = setInterval(() => {
      const next = getTimeLeft(targetDate)
      setTimeLeft(next)
      if (next.total === 0) onComplete?.()
    }, 1000)

    return () => clearInterval(interval)
  }, [targetDate, onComplete])

  const units = [
    { value: timeLeft.days, label: 'días' },
    { value: timeLeft.hours, label: 'hs' },
    { value: timeLeft.minutes, label: 'min' },
    { value: timeLeft.seconds, label: 'seg' },
  ]

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      {label && (
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      )}
      {timeLeft.total === 0 ? (
        <p className="font-heading text-2xl tracking-wide text-primary">¡ARRANCÓ!</p>
      ) : (
        <div className="flex items-center gap-2 sm:gap-3">
          {units.map((unit) => (
            <div key={unit.label} className="flex flex-col items-center">
              <span className="font-heading min-w-[2.5rem] rounded-lg bg-card px-2 py-1 text-center text-2xl tabular-nums text-primary sm:text-3xl">
                {pad(unit.value)}
              </span>
              <span className="mt-1 text-[10px] uppercase text-muted-foreground">{unit.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
