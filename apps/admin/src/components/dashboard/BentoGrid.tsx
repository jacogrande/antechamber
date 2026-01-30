import type { ReactNode, HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface BentoGridProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

/**
 * Bento Grid Layout
 *
 * Asymmetric grid layout for dashboard cards with visual hierarchy.
 * Uses CSS Grid with named areas that stack on mobile.
 *
 * Grid template (desktop):
 * +--------------------+-----------+-----------+
 * |                    |  schemas  |  webhooks |
 * |    submissions     +-----------+-----------+
 * |                    |      success          |
 * +--------------------+-----------------------+
 * |              activity                      |
 * +--------------------------------------------+
 */
export function BentoGrid({ children, className, ...props }: BentoGridProps) {
  return (
    <div
      className={cn(
        'grid gap-4',
        // Mobile: single column
        'grid-cols-1',
        // Tablet: 2 columns
        'md:grid-cols-2',
        // Desktop: 3 columns
        'lg:grid-cols-3',
        // Grid template areas for different breakpoints
        '[grid-template-areas:"submissions"_"schemas"_"webhooks"_"success"_"activity"]',
        'md:[grid-template-areas:"submissions_schemas"_"submissions_webhooks"_"success_success"_"activity_activity"]',
        'lg:[grid-template-areas:"submissions_schemas_webhooks"_"submissions_success_success"_"activity_activity_activity"]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export type BentoAreaName = 'submissions' | 'schemas' | 'webhooks' | 'success' | 'activity'
