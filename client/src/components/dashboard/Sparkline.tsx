interface SparklineProps {
  data: number[]
  width?: number | string
  height?: number
  color?: string
  showFill?: boolean
}

export function Sparkline({
  data,
  width = '100%',
  height = 40,
  color,
  showFill = true,
}: SparklineProps) {
  const lineColor = color ?? 'hsl(var(--primary))'

  if (data.length < 2) {
    return null
  }

  // Normalize data to 0-1 range
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const normalized = data.map((v) => (v - min) / range)

  // Generate SVG path
  const points = normalized.map((value, index) => {
    const x = (index / (data.length - 1)) * 100
    const y = (1 - value) * (height - 4) + 2
    return { x, y }
  })

  // Create line path
  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ')

  // Create fill path
  const fillPath = `${linePath} L 100 ${height} L 0 ${height} Z`

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      className="[&_path]:transition-all [&_path]:duration-300 motion-reduce:[&_path]:transition-none"
    >
      {showFill && (
        <path
          d={fillPath}
          fill={lineColor}
          opacity={0.1}
        />
      )}
      <path
        d={linePath}
        fill="none"
        stroke={lineColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={3}
        fill={lineColor}
      />
    </svg>
  )
}
