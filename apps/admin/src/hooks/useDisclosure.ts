import { useState, useCallback } from 'react'

export interface UseDisclosureReturn {
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
  onToggle: () => void
  setIsOpen: (value: boolean) => void
}

export function useDisclosure(defaultIsOpen = false): UseDisclosureReturn {
  const [isOpen, setIsOpen] = useState(defaultIsOpen)

  const onOpen = useCallback(() => setIsOpen(true), [])
  const onClose = useCallback(() => setIsOpen(false), [])
  const onToggle = useCallback(() => setIsOpen(prev => !prev), [])

  return {
    isOpen,
    onOpen,
    onClose,
    onToggle,
    setIsOpen,
  }
}
