import { useState } from 'react'
import { IconButton, Tooltip, useClipboard } from '@chakra-ui/react'
import { HiOutlineClipboardCopy, HiOutlineClipboardCheck } from 'react-icons/hi'

interface CopyButtonProps {
  value: string
  label?: string
  size?: 'xs' | 'sm' | 'md'
}

export function CopyButton({ value, label = 'Copy', size = 'sm' }: CopyButtonProps) {
  const { onCopy, hasCopied } = useClipboard(value)
  const [showTooltip, setShowTooltip] = useState(false)

  const handleClick = () => {
    onCopy()
    setShowTooltip(true)
    setTimeout(() => setShowTooltip(false), 2000)
  }

  return (
    <Tooltip
      label={hasCopied ? 'Copied!' : label}
      isOpen={showTooltip || undefined}
      closeOnClick={false}
    >
      <IconButton
        aria-label={hasCopied ? 'Copied' : label}
        icon={hasCopied ? <HiOutlineClipboardCheck /> : <HiOutlineClipboardCopy />}
        size={size}
        variant="ghost"
        onClick={handleClick}
        color={hasCopied ? 'status.success' : 'text.muted'}
      />
    </Tooltip>
  )
}
