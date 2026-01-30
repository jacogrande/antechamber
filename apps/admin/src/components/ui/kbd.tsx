import * as React from 'react'
import { cn } from '@/lib/utils'

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  keys?: string | string[]
}

const Kbd = React.forwardRef<HTMLElement, KbdProps>(
  ({ className, keys, children, ...props }, ref) => {
    const keyArray = keys
      ? Array.isArray(keys)
        ? keys
        : [keys]
      : []

    if (keyArray.length === 0 && children) {
      return (
        <kbd
          ref={ref}
          className={cn(
            'pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground',
            className
          )}
          {...props}
        >
          {children}
        </kbd>
      )
    }

    return (
      <span className="inline-flex items-center gap-0.5">
        {keyArray.map((key, index) => (
          <React.Fragment key={key}>
            <kbd
              ref={index === 0 ? ref : undefined}
              className={cn(
                'pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground',
                className
              )}
              {...props}
            >
              {formatKey(key)}
            </kbd>
            {index < keyArray.length - 1 && (
              <span className="text-xs text-muted-foreground">+</span>
            )}
          </React.Fragment>
        ))}
      </span>
    )
  }
)
Kbd.displayName = 'Kbd'

function formatKey(key: string): string {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0

  const keyMap: Record<string, string> = {
    mod: isMac ? '⌘' : 'Ctrl',
    ctrl: isMac ? '⌃' : 'Ctrl',
    alt: isMac ? '⌥' : 'Alt',
    shift: '⇧',
    meta: '⌘',
    cmd: '⌘',
    enter: '↵',
    backspace: '⌫',
    delete: '⌦',
    escape: 'Esc',
    tab: '⇥',
    space: '␣',
    up: '↑',
    down: '↓',
    left: '←',
    right: '→',
  }

  const lowerKey = key.toLowerCase()
  return keyMap[lowerKey] || key.toUpperCase()
}

export { Kbd }
