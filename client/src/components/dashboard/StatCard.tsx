import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface StatCardProps {
  icon: ReactNode
  label: string
  value: number | string
  helpText?: string
  colorScheme?: 'brand' | 'success' | 'warning' | 'error'
  isLoading?: boolean
  size?: 'sm' | 'md'
}

export function StatCard({
  icon,
  label,
  value,
  helpText,
  isLoading = false,
  size = 'md',
}: StatCardProps) {
  const isSmall = size === 'sm'

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className={cn('pt-6', isSmall ? 'p-4' : 'p-5')}>
          <div className={cn('flex items-start', isSmall ? 'gap-3' : 'gap-4')}>
            <Skeleton className={cn('rounded-xl', isSmall ? 'h-10 w-10' : 'h-12 w-12')} />
            <div className="flex-1">
              <Skeleton className="mb-3 h-3 w-1/2 rounded-lg" />
              <Skeleton className={cn('mb-2 w-2/5 rounded-lg', isSmall ? 'h-6' : 'h-8')} />
              {!isSmall && <Skeleton className="h-3 w-3/4 rounded-lg" />}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardContent className={cn('pt-6', isSmall ? 'p-4' : 'p-5')}>
        <div className={cn('flex items-start', isSmall ? 'gap-3' : 'gap-4')}>
          <div
            className={cn(
              'rounded-lg bg-muted',
              isSmall ? 'p-2' : 'p-3'
            )}
          >
            {icon}
          </div>
          <div className="flex flex-col">
            <span className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {label}
            </span>
            <span
              className={cn(
                'font-bold tracking-tight leading-tight',
                isSmall ? 'text-2xl' : 'text-3xl'
              )}
            >
              {value}
            </span>
            {helpText && (
              <span className="mt-1 text-xs text-muted-foreground">
                {helpText}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
