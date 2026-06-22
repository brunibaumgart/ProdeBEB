'use client'

import { useEffect } from 'react'

const SESSION_FLAG = 'visit-tracked'

export function VisitTracker() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_FLAG)) return
      sessionStorage.setItem(SESSION_FLAG, '1')
    } catch {
      // sessionStorage no disponible: igual registramos la visita.
    }

    void fetch('/api/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: window.location.pathname }),
      keepalive: true,
    }).catch(() => {
      // Silencioso: el tracking no debe afectar la experiencia.
    })
  }, [])

  return null
}
