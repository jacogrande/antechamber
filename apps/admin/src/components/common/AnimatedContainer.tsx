import type { ReactNode, HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type AnimationType = 'bounce' | 'scale' | 'fade' | 'pulse'

interface AnimatedContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  animation?: AnimationType
  duration?: number
  delay?: number
}

const animationClasses: Record<AnimationType, string> = {
  bounce: 'animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2',
  scale: 'animate-in fade-in-0 zoom-in-95',
  fade: 'animate-in fade-in-0',
  pulse: 'animate-pulse',
}

export function AnimatedContainer({
  children,
  animation = 'bounce',
  duration,
  delay = 0,
  className,
  style,
  ...props
}: AnimatedContainerProps) {
  const animationClass = animationClasses[animation]

  return (
    <div
      className={cn(
        animationClass,
        'motion-reduce:animate-none motion-reduce:opacity-100',
        className
      )}
      style={{
        ...style,
        animationDelay: delay ? `${delay}s` : undefined,
        animationDuration: duration ? `${duration}s` : undefined,
      }}
      {...props}
    >
      {children}
    </div>
  )
}
