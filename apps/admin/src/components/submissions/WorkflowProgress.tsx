import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WorkflowStep, WorkflowStepStatus } from '@/types/submission'

interface WorkflowProgressProps {
  steps: WorkflowStep[]
}

const statusStyles: Record<
  WorkflowStepStatus,
  { bg: string; border: string }
> = {
  pending: {
    bg: 'bg-muted',
    border: 'border-border',
  },
  running: {
    bg: 'bg-blue-50 dark:bg-blue-950',
    border: 'border-blue-400',
  },
  completed: {
    bg: 'bg-green-50 dark:bg-green-950',
    border: 'border-green-400',
  },
  failed: {
    bg: 'bg-red-50 dark:bg-red-950',
    border: 'border-red-400',
  },
}

function StepIcon({ status }: { status: WorkflowStepStatus }) {
  if (status === 'completed') {
    return <Check className="h-4 w-4 text-green-500" />
  }
  if (status === 'failed') {
    return <X className="h-4 w-4 text-red-500" />
  }
  if (status === 'running') {
    return (
      <span className="w-3 h-3 rounded-full bg-blue-400 animate-pulse" />
    )
  }
  return <span className="w-3 h-3 rounded-full bg-muted-foreground/30" />
}

function formatStepName(name: string): string {
  // Convert snake_case or camelCase to Title Case
  return name
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function WorkflowProgress({ steps }: WorkflowProgressProps) {
  if (steps.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No workflow steps recorded.
      </p>
    )
  }

  return (
    <div className="flex flex-col">
      {steps.map((step, index) => {
        const style = statusStyles[step.status]
        const isLast = index === steps.length - 1

        return (
          <div key={step.name} className="flex items-start gap-3 relative">
            {/* Connector line */}
            {!isLast && (
              <div
                className={cn(
                  'absolute left-[14px] top-8 w-0.5 h-[calc(100%-8px)]',
                  step.status === 'completed' ? 'bg-green-200 dark:bg-green-800' : 'bg-border'
                )}
              />
            )}

            {/* Step indicator */}
            <div
              className={cn(
                'w-8 h-8 rounded-full border-2 flex items-center justify-center z-10',
                style.bg,
                style.border
              )}
            >
              <StepIcon status={step.status} />
            </div>

            {/* Step content */}
            <div className="flex flex-col py-1 flex-1">
              <span className="font-medium text-sm">
                {formatStepName(step.name)}
              </span>
              {step.error && (
                <span className="text-red-500 text-xs">{step.error}</span>
              )}
              {step.completedAt && (
                <span className="text-muted-foreground text-xs">
                  Completed {new Date(step.completedAt).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
