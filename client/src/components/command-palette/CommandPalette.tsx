import { useCallback, useMemo } from 'react'
import { Command as Cmdk } from 'cmdk'
import { Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from 'next-themes'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Kbd } from '@/components/ui/kbd'
import { getAllCommands, groupLabels, type Command } from './commands'
import { cn } from '@/lib/utils'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()

  // Get all commands with current theme state
  const commands = useMemo(
    () => getAllCommands(theme, setTheme),
    [theme, setTheme]
  )

  // Group commands by group
  const groupedCommands = useMemo(() => {
    const groups: Record<string, Command[]> = {}
    for (const cmd of commands) {
      if (!groups[cmd.group]) {
        groups[cmd.group] = []
      }
      groups[cmd.group].push(cmd)
    }
    return groups
  }, [commands])

  const handleSelect = useCallback(
    (command: Command) => {
      onClose()

      if (command.action === 'navigate' && command.path) {
        navigate(command.path)
      } else if (command.action === 'callback' && command.callback) {
        command.callback()
      }
    },
    [navigate, onClose]
  )

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="p-0 overflow-hidden max-w-lg gap-0">
        <Cmdk
          label="Command Menu"
          loop
          filter={(value, search) => {
            // Custom fuzzy-ish filter
            const lowerValue = value.toLowerCase()
            const lowerSearch = search.toLowerCase()
            if (lowerValue.includes(lowerSearch)) return 1
            // Check if search terms are in order
            let searchIndex = 0
            for (const char of lowerValue) {
              if (char === lowerSearch[searchIndex]) {
                searchIndex++
                if (searchIndex === lowerSearch.length) return 0.5
              }
            }
            return 0
          }}
        >
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Cmdk.Input
              placeholder="Type a command or search..."
              autoFocus
              className="flex-1 text-base outline-none bg-transparent border-none"
            />
          </div>

          {/* Command list */}
          <Cmdk.List className="max-h-[320px] overflow-y-auto p-2">
            <Cmdk.Empty className="py-8 text-center text-muted-foreground">
              No results found.
            </Cmdk.Empty>

            {Object.entries(groupedCommands).map(([group, cmds]) => (
              <Cmdk.Group key={group} heading={groupLabels[group as Command['group']]}>
                <div className="mb-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
                    {groupLabels[group as Command['group']]}
                  </span>
                </div>
                {cmds.map((command) => (
                  <Cmdk.Item
                    key={command.id}
                    value={command.label}
                    onSelect={() => handleSelect(command)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer',
                      'transition-colors data-[selected=true]:bg-accent'
                    )}
                  >
                    {command.icon && (
                      <command.icon className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="flex-1 text-sm">{command.label}</span>
                    {command.shortcut && (
                      <div className="flex items-center gap-1">
                        {command.shortcut.split(' ').map((key, i) => (
                          <Kbd key={i} className="text-xs">
                            {key}
                          </Kbd>
                        ))}
                      </div>
                    )}
                  </Cmdk.Item>
                ))}
              </Cmdk.Group>
            ))}
          </Cmdk.List>

          {/* Footer */}
          <div className="px-4 py-2 border-t bg-muted/50 flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Kbd className="text-xs">↑↓</Kbd>
              <span>Navigate</span>
            </div>
            <div className="flex items-center gap-1">
              <Kbd className="text-xs">↵</Kbd>
              <span>Select</span>
            </div>
            <div className="flex items-center gap-1">
              <Kbd className="text-xs">Esc</Kbd>
              <span>Close</span>
            </div>
          </div>
        </Cmdk>
      </DialogContent>
    </Dialog>
  )
}
