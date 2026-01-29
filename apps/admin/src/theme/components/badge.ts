import { defineStyleConfig } from '@chakra-ui/react'

export const Badge = defineStyleConfig({
  baseStyle: {
    fontWeight: 'medium',
    borderRadius: 'md',
    textTransform: 'none',
    fontSize: 'xs',
    px: 2,
    py: 0.5,
  },
  variants: {
    solid: {
      bg: 'brand.600',
      color: 'white',
    },
    subtle: {
      bg: 'interactive.muted',
      color: 'interactive.default',
    },
    outline: {
      bg: 'transparent',
      border: '1px solid',
      borderColor: 'border.default',
      color: 'text.default',
    },
    success: {
      bg: 'status.success.bg',
      color: 'status.success',
    },
    warning: {
      bg: 'status.warning.bg',
      color: 'status.warning',
    },
    error: {
      bg: 'status.error.bg',
      color: 'status.error',
    },
  },
  defaultProps: {
    variant: 'subtle',
  },
})
