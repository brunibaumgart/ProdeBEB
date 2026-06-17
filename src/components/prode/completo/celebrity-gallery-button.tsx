'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Images } from 'lucide-react'

import type { CelebrityBracket } from '@/lib/bracket/celebrity-predictions'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CelebrityGalleryButtonProps {
  celebrity: CelebrityBracket
  className?: string
  defaultOpen?: boolean
  onClose?: () => void
}

export function CelebrityGalleryButton({
  celebrity,
  className,
  defaultOpen = false,
  onClose,
}: CelebrityGalleryButtonProps) {
  const [open, setOpen] = useState(defaultOpen)
  const images = celebrity.galleryImages ?? []

  useEffect(() => {
    setOpen(defaultOpen)
  }, [defaultOpen])

  if (images.length === 0) return null

  function close() {
    setOpen(false)
    onClose?.()
  }

  return (
    <>
      {!defaultOpen ? (
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => setOpen(true)}
          className={cn('rounded-full', className)}
        >
          <Images aria-hidden />
          Ver predicción original
        </Button>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center">
          <div className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <p className="text-sm font-semibold">{celebrity.label}</p>
                <p className="text-xs text-muted-foreground">Capturas del prode original</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={close}>
                Cerrar
              </Button>
            </div>
            <div className="space-y-3 overflow-y-auto p-4">
              {images.map((src) => (
                <div key={src} className="overflow-hidden rounded-lg border border-border/60">
                  <Image
                    src={src}
                    alt={`Predicción de ${celebrity.label}`}
                    width={1200}
                    height={800}
                    className="h-auto w-full"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
