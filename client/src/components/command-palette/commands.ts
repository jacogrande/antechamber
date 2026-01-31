import {
  Home,
  FileText,
  Globe,
  Settings,
  Plus,
  Moon,
  Sun,
  type LucideIcon,
} from 'lucide-react'

export interface Command {
  id: string
  label: string
  icon?: LucideIcon
  shortcut?: string
  group: 'navigation' | 'actions' | 'theme'
  action: 'navigate' | 'callback'
  path?: string
  callback?: () => void
}

/**
 * Static navigation commands
 */
export const navigationCommands: Command[] = [
  {
    id: 'nav-dashboard',
    label: 'Go to Dashboard',
    icon: Home,
    shortcut: 'G D',
    group: 'navigation',
    action: 'navigate',
    path: '/',
  },
  {
    id: 'nav-schemas',
    label: 'Go to Schemas',
    icon: FileText,
    shortcut: 'G S',
    group: 'navigation',
    action: 'navigate',
    path: '/schemas',
  },
  {
    id: 'nav-webhooks',
    label: 'Go to Webhooks',
    icon: Globe,
    shortcut: 'G W',
    group: 'navigation',
    action: 'navigate',
    path: '/webhooks',
  },
  {
    id: 'nav-settings',
    label: 'Go to Settings',
    icon: Settings,
    shortcut: 'G ,',
    group: 'navigation',
    action: 'navigate',
    path: '/settings',
  },
]

/**
 * Quick action commands
 */
export const actionCommands: Command[] = [
  {
    id: 'action-new-schema',
    label: 'Create New Schema',
    icon: Plus,
    shortcut: 'N S',
    group: 'actions',
    action: 'navigate',
    path: '/schemas/create',
  },
]

/**
 * Theme commands (callback-based)
 */
export function getThemeCommands(
  theme: string | undefined,
  setTheme: (theme: string) => void
): Command[] {
  const isDark = theme === 'dark'
  return [
    {
      id: 'theme-toggle',
      label: isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      icon: isDark ? Sun : Moon,
      shortcut: 'T T',
      group: 'theme',
      action: 'callback',
      callback: () => setTheme(isDark ? 'light' : 'dark'),
    },
  ]
}

/**
 * Get all commands with dynamic theme commands
 */
export function getAllCommands(
  theme: string | undefined,
  setTheme: (theme: string) => void
): Command[] {
  return [
    ...navigationCommands,
    ...actionCommands,
    ...getThemeCommands(theme, setTheme),
  ]
}

/**
 * Group labels for display
 */
export const groupLabels: Record<Command['group'], string> = {
  navigation: 'Navigation',
  actions: 'Quick Actions',
  theme: 'Theme',
}
