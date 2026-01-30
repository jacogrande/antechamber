import { useState, useCallback } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface CopyButtonProps {
  value: string
  label?: string
  size?: 'sm' | 'default' | 'lg'
}

export function CopyButton({ value, label = 'Copy', size = 'sm' }: CopyButtonProps) {
  const [hasCopied, setHasCopied] = useState(false)

  const handleClick = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value)
      setHasCopied(true)
      setTimeout(() => setHasCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [value])

  const sizeClasses = {
    sm: 'h-8 w-8',
    default: 'h-9 w-9',
    lg: 'h-10 w-10',
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(sizeClasses[size])}
          onClick={handleClick}
          aria-label={hasCopied ? 'Copied' : label}
        >
          {hasCopied ? (
            <Check className="h-4 w-4 text-success" />
          ) : (
            <Copy className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{hasCopied ? 'Copied!' : label}</p>
      </TooltipContent>
    </Tooltip>
  )
}
