import { Link, useLocation } from 'react-router-dom'
import { BarChart3, ClipboardList, Link2, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface NavItem {
  label: string
  path: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: BarChart3 },
  { label: 'Schemas', path: '/schemas', icon: ClipboardList },
  { label: 'Webhooks', path: '/webhooks', icon: Link2 },
  { label: 'Settings', path: '/settings', icon: Settings },
]

interface SidebarProps {
  onClose?: () => void
}

export function Sidebar({ onClose }: SidebarProps) {
  const location = useLocation()

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="flex h-full w-full flex-col border-r border-border bg-sidebar py-6">
      {/* Logo */}
      <div className="mb-8 flex items-center gap-3 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <span className="text-lg font-bold text-primary-foreground">A</span>
        </div>
        <span className="text-lg font-bold tracking-tight text-foreground">
          Antechamber
        </span>
      </div>

      {/* Navigation */}
      <div className="flex flex-1 flex-col gap-1 px-3">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)

          return (
            <Link key={item.path} to={item.path} onClick={onClose}>
              <div
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                  active
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                    : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground font-medium'
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-4 pt-4">
        <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
          <div className="h-2 w-2 rounded-full bg-success" />
          <span className="text-xs text-muted-foreground">
            All systems operational
          </span>
        </div>
      </div>
    </nav>
  )
}
