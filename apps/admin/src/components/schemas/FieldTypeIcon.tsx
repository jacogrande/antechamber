import { Icon } from '@chakra-ui/react'
import {
  HiOutlineMenuAlt2,
  HiOutlineHashtag,
  HiOutlineCheckCircle,
  HiOutlineCollection,
  HiOutlineViewList,
} from 'react-icons/hi'
import type { FieldType } from '@/types/schema'

const iconMap: Record<FieldType, React.ElementType> = {
  string: HiOutlineMenuAlt2,
  number: HiOutlineHashtag,
  boolean: HiOutlineCheckCircle,
  enum: HiOutlineCollection,
  'string[]': HiOutlineViewList,
}

interface FieldTypeIconProps {
  type: FieldType
  boxSize?: number | string
  color?: string
}

export function FieldTypeIcon({ type, boxSize = 5, color }: FieldTypeIconProps) {
  const IconComponent = iconMap[type]
  return <Icon as={IconComponent} boxSize={boxSize} color={color} />
}

export function getFieldTypeLabel(type: FieldType): string {
  const labels: Record<FieldType, string> = {
    string: 'Text',
    number: 'Number',
    boolean: 'Yes/No',
    enum: 'Choice',
    'string[]': 'List',
  }
  return labels[type]
}
