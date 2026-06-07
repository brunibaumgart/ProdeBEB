'use client'

import { useState } from 'react'
import { Check, Copy, Share2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

interface ShareTournamentLinkProps {
  joinUrl: string
  tournamentName: string
}

export function ShareTournamentLink({ joinUrl, tournamentName }: ShareTournamentLinkProps) {
  const [copied, setCopied] = useState(false)

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(joinUrl)
      setCopied(true)
      toast.success('Link copiado')
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('No se pudo copiar el link')
    }
  }

  async function shareLink() {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `Unite a ${tournamentName} en ProdeBEB`,
          text: `Sumate al torneo "${tournamentName}" en ProdeBEB.`,
          url: joinUrl,
        })
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }

    await copyLink()
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <code className="max-w-full truncate rounded-md border border-border bg-muted/40 px-3 py-1.5 text-sm">
        {joinUrl}
      </code>
      <Button type="button" variant="outline" size="sm" onClick={copyLink}>
        {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        {copied ? 'Copiado' : 'Copiar'}
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={shareLink}>
        <Share2 className="size-4" aria-hidden />
        Compartir
      </Button>
    </div>
  )
}
