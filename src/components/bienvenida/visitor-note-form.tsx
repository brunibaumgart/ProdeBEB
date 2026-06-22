'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { createVisitorNote } from '@/app/actions/visitor-notes'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const MAX_MESSAGE_LENGTH = 1000

export function VisitorNoteForm() {
  const [name, setName] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    startTransition(async () => {
      const result = await createVisitorNote({ name, isAnonymous, message })
      if (!result.ok) {
        toast.error(result.error)
        return
      }

      toast.success(result.message)
      setMessage('')
      setName('')
      setIsAnonymous(false)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="visitor-name">Tu nombre (opcional)</Label>
        <Input
          id="visitor-name"
          name="name"
          placeholder="¿Cómo te llamás?"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={isAnonymous || isPending}
          maxLength={60}
        />
      </div>

      <Label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
        <Checkbox
          checked={isAnonymous}
          onCheckedChange={(checked) => setIsAnonymous(Boolean(checked))}
          disabled={isPending}
        />
        Dejar como anónimo
      </Label>

      <div className="grid gap-2">
        <Label htmlFor="visitor-message">Tu mensaje</Label>
        <textarea
          id="visitor-message"
          name="message"
          rows={4}
          placeholder="Contanos qué te pareció la app, qué te gustaría ver…"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          disabled={isPending}
          maxLength={MAX_MESSAGE_LENGTH}
          required
          className={cn(
            'w-full min-w-0 resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none',
            'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
            'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30',
          )}
        />
        <p className="text-right text-xs text-muted-foreground">
          {message.length}/{MAX_MESSAGE_LENGTH}
        </p>
      </div>

      <Button type="submit" disabled={isPending || message.trim().length === 0}>
        {isPending ? 'Enviando…' : 'Enviar mensaje'}
      </Button>
    </form>
  )
}
