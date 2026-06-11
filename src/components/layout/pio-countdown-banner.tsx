'use client'

import { useEffect, useState } from 'react'

import { CountdownTimer } from '@/components/ui-mundial/countdown-timer'
import { PIO_REUNION_TARGET_ISO } from '@/lib/personal/pio-countdown'

const targetDate = new Date(PIO_REUNION_TARGET_ISO)

export function PioCountdownBanner() {
  const [visible, setVisible] = useState(() => targetDate.getTime() > Date.now())

  useEffect(() => {
    if (!visible) return
    const interval = window.setInterval(() => {
      if (targetDate.getTime() <= Date.now()) setVisible(false)
    }, 1000)
    return () => window.clearInterval(interval)
  }, [visible])

  if (!visible) return null

  return (
    <div className="border-b border-primary/25 bg-gradient-to-r from-primary/15 via-brand-gold/10 to-primary/15">
      <div className="mx-auto max-w-6xl px-4 py-3 text-center">
        <p className="font-heading text-2xl tracking-[0.35em] text-primary">333</p>
        <CountdownTimer
          targetDate={targetDate}
          className="mt-2"
          onComplete={() => setVisible(false)}
        />
        <p className="mt-1 text-[11px] text-muted-foreground">10 jul 2026 · hora Argentina</p>
      </div>
    </div>
  )
}
