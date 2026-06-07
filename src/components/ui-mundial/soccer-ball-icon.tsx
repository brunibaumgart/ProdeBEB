import { cn } from '@/lib/utils'

interface SoccerBallIconProps {
  className?: string
}

export function SoccerBallIcon({ className }: SoccerBallIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn('size-4', className)}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" fill="white" />
      <path
        d="M12 4.8 14.4 8.6 18.8 9.2 15.4 12.1 16.3 16.5 12 14.2 7.7 16.5 8.6 12.1 5.2 9.2 9.6 8.6Z"
        fill="none"
        stroke="#525252"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      <path
        d="M12 4.8 12 8.6M16.3 16.5 13.4 14.8M7.7 16.5 10.6 14.8M5.2 9.2 8.6 10.4M18.8 9.2 15.4 10.4"
        fill="none"
        stroke="#525252"
        strokeWidth="0.75"
        strokeLinecap="round"
      />
    </svg>
  )
}
