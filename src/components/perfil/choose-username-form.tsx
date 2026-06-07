'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { chooseUsername } from '@/app/actions/profile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ChooseUsernameFormProps {
  suggestedUsername?: string | null
}

export function ChooseUsernameForm({ suggestedUsername }: ChooseUsernameFormProps) {
  const router = useRouter()
  const [username, setUsername] = useState(suggestedUsername ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await chooseUsername(username)
      if (!result.ok) {
        setError(result.error)
        return
      }

      router.push('/prode')
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-md flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="username">Nombre de usuario</Label>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="fedeestef06"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          aria-invalid={error != null}
          required
        />
        <p className="text-sm text-muted-foreground">
          Entre 3 y 20 caracteres. Letras, números y guión bajo. Debe ser único en ProdeBEB.
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" disabled={isPending || username.trim().length === 0}>
        {isPending ? 'Guardando…' : 'Continuar'}
      </Button>
    </form>
  )
}
