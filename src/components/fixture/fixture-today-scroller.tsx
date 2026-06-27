'use client'

import { useEffect } from 'react'

export function FixtureTodayScroller({ todayKey }: { todayKey: string }) {
  useEffect(() => {
    const el = document.getElementById(`day-${todayKey}`)
    if (el) {
      el.scrollIntoView({ behavior: 'instant', block: 'start' })
    }
  }, [todayKey])

  return null
}
