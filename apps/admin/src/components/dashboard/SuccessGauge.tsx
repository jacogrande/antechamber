import { cn } from '@/lib/utils'

interface SuccessGaugeProps {
  value: number
  size?: number
  strokeWidth?: number
  label?: string
}

export function SuccessGauge({
  value,
  size = 120,
  strokeWidth = 8,
  label,
}: SuccessGaugeProps) {
  // Determine color based on value
  const color = value >= 80 ? 'hsl(var(--success))' : value >= 50 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))'
  const trackColor = 'hsl(var(--muted))'

  // SVG calculations
  const center = size / 2
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clampedValue = Math.min(100, Math.max(0, value))
  const strokeDashoffset = circumference - (clampedValue / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="-rotate-90 [&_circle]:transition-all [&_circle]:duration-500 [&_circle]:ease-out motion-reduce:[&_circle]:transition-none"
      >
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span
          className={cn(
            'font-bold leading-none',
            size > 100 ? 'text-2xl' : 'text-lg'
          )}
          style={{ color }}
        >
          {Math.round(clampedValue)}%
        </span>
        {label && (
          <span className="mt-1 text-xs text-muted-foreground">
            {label}
          </span>
        )}
      </div>
    </div>
  )
}
