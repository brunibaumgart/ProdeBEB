'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

import { BebMascotMark } from '@/components/ui-mundial/beb-mascot-mark'
import { cn } from '@/lib/utils'

const PULL_THRESHOLD = 72
const MAX_PULL = 120

interface PullToRefreshProps {
  children: React.ReactNode
}

export function PullToRefresh({ children }: PullToRefreshProps) {
  const router = useRouter()
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startYRef = useRef<number | null>(null)
  const pullingRef = useRef(false)
  const pullDistanceRef = useRef(0)
  const refreshingRef = useRef(false)
  const enabledRef = useRef(false)

  const resetPull = useCallback(() => {
    startYRef.current = null
    pullingRef.current = false
    pullDistanceRef.current = 0
    setPullDistance(0)
  }, [])

  const triggerRefresh = useCallback(() => {
    if (refreshingRef.current) return

    refreshingRef.current = true
    setRefreshing(true)
    pullDistanceRef.current = PULL_THRESHOLD
    setPullDistance(PULL_THRESHOLD)
    router.refresh()

    window.setTimeout(() => {
      refreshingRef.current = false
      setRefreshing(false)
      resetPull()
    }, 900)
  }, [resetPull, router])

  useEffect(() => {
    enabledRef.current =
      typeof window !== 'undefined' &&
      window.matchMedia('(pointer: coarse)').matches

    function onTouchStart(event: TouchEvent) {
      if (!enabledRef.current || refreshingRef.current || window.scrollY > 0) return
      if (event.touches.length !== 1) return

      startYRef.current = event.touches[0].clientY
      pullingRef.current = true
    }

    function onTouchMove(event: TouchEvent) {
      if (!pullingRef.current || startYRef.current == null || refreshingRef.current) return
      if (window.scrollY > 0) {
        resetPull()
        return
      }

      const delta = event.touches[0].clientY - startYRef.current
      if (delta <= 0) {
        pullDistanceRef.current = 0
        setPullDistance(0)
        return
      }

      event.preventDefault()
      const nextPull = Math.min(MAX_PULL, delta * 0.55)
      pullDistanceRef.current = nextPull
      setPullDistance(nextPull)
    }

    function onTouchEnd() {
      if (!pullingRef.current || refreshingRef.current) return

      if (pullDistanceRef.current >= PULL_THRESHOLD) {
        triggerRefresh()
        return
      }

      resetPull()
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('touchcancel', onTouchEnd, { passive: true })

    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [resetPull, triggerRefresh])

  const progress = Math.min(1, pullDistance / PULL_THRESHOLD)
  const isVisible = pullDistance > 8 || refreshing

  return (
    <>
      <div
        aria-hidden
        className={cn(
          'pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center transition-opacity duration-200 md:hidden',
          isVisible ? 'opacity-100' : 'opacity-0',
        )}
        style={{
          transform: `translateY(${Math.max(0, pullDistance - 48)}px)`,
        }}
      >
        <div
          className={cn(
            'rounded-2xl border border-border/70 bg-background/95 px-4 py-3 shadow-lg backdrop-blur-sm transition-transform duration-200',
            refreshing && 'animate-pulse',
          )}
          style={{
            transform: `scale(${0.82 + progress * 0.18})`,
            opacity: 0.35 + progress * 0.65,
          }}
        >
          <BebMascotMark
            imageClassName={cn(refreshing && 'animate-bounce')}
            className="gap-1"
          />
        </div>
      </div>
      {children}
    </>
  )
}
