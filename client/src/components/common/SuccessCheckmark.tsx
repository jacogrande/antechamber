interface SuccessCheckmarkProps {
  size?: number
}

export function SuccessCheckmark({ size = 64 }: SuccessCheckmarkProps) {
  return (
    <svg
      viewBox="0 0 52 52"
      width={size}
      height={size}
      className="[&_circle]:origin-center [&_circle]:animate-scale-in [&_path]:animate-checkmark motion-reduce:[&_circle]:animate-none motion-reduce:[&_path]:animate-none motion-reduce:[&_circle]:opacity-100 motion-reduce:[&_path]:stroke-dashoffset-0"
    >
      <circle
        cx="26"
        cy="26"
        r="24"
        className="fill-success"
        style={{
          animation: 'scale-in 0.4s ease-out forwards',
        }}
      />
      <path
        fill="none"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14 27l8 8 16-16"
        style={{
          strokeDasharray: 50,
          strokeDashoffset: 50,
          animation: 'checkmark-draw 0.3s ease-out 0.3s forwards',
        }}
      />
    </svg>
  )
}
