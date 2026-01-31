import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const statVariants = cva('', {
  variants: {
    size: {
      default: '',
      sm: '',
      lg: '',
    },
  },
  defaultVariants: {
    size: 'default',
  },
})

const Stat = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof statVariants>
>(({ className, size, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col gap-1', statVariants({ size }), className)}
    {...props}
  />
))
Stat.displayName = 'Stat'

const StatLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
StatLabel.displayName = 'StatLabel'

const StatValue = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-3xl font-semibold tracking-tight', className)}
    {...props}
  />
))
StatValue.displayName = 'StatValue'

const StatHelpText = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-xs text-muted-foreground', className)}
    {...props}
  />
))
StatHelpText.displayName = 'StatHelpText'

const StatChange = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    isPositive?: boolean
    isNegative?: boolean
  }
>(({ className, isPositive, isNegative, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'text-xs font-medium',
      isPositive && 'text-success',
      isNegative && 'text-destructive',
      !isPositive && !isNegative && 'text-muted-foreground',
      className
    )}
    {...props}
  />
))
StatChange.displayName = 'StatChange'

export { Stat, StatLabel, StatValue, StatHelpText, StatChange }
