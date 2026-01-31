/**
 * Field Type Visual System
 *
 * Centralized configuration for field type colors, icons, and labels.
 */

import {
  AlignLeft,
  Hash,
  ToggleLeft,
  ChevronDown,
  List,
  type LucideIcon,
} from 'lucide-react'
import type { FieldType } from '@/types/schema'

export interface FieldTypeConfig {
  label: string
  icon: LucideIcon
  /** Tailwind color classes */
  colors: {
    text: string
    bg: string
    textDark: string
    bgDark: string
    badge: string
  }
}

export const fieldTypeConfig: Record<FieldType, FieldTypeConfig> = {
  string: {
    label: 'Text',
    icon: AlignLeft,
    colors: {
      text: 'text-primary',
      bg: 'bg-primary/10',
      textDark: 'dark:text-primary',
      bgDark: 'dark:bg-primary/20',
      badge: 'bg-primary/10 text-primary',
    },
  },
  number: {
    label: 'Number',
    icon: Hash,
    colors: {
      text: 'text-success',
      bg: 'bg-success/10',
      textDark: 'dark:text-success',
      bgDark: 'dark:bg-success/20',
      badge: 'bg-success/10 text-success',
    },
  },
  boolean: {
    label: 'Yes/No',
    icon: ToggleLeft,
    colors: {
      text: 'text-violet-600',
      bg: 'bg-violet-100',
      textDark: 'dark:text-violet-400',
      bgDark: 'dark:bg-violet-900',
      badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300',
    },
  },
  enum: {
    label: 'Choice',
    icon: ChevronDown,
    colors: {
      text: 'text-warning',
      bg: 'bg-warning/10',
      textDark: 'dark:text-warning',
      bgDark: 'dark:bg-warning/20',
      badge: 'bg-warning/10 text-warning',
    },
  },
  'string[]': {
    label: 'List',
    icon: List,
    colors: {
      text: 'text-muted-foreground',
      bg: 'bg-muted',
      textDark: 'dark:text-muted-foreground',
      bgDark: 'dark:bg-muted',
      badge: 'bg-muted text-muted-foreground',
    },
  },
}

export function getFieldTypeLabel(type: FieldType): string {
  return fieldTypeConfig[type].label
}

export function getFieldTypeIcon(type: FieldType): LucideIcon {
  return fieldTypeConfig[type].icon
}

export function getFieldTypeColors(type: FieldType) {
  return fieldTypeConfig[type].colors
}
