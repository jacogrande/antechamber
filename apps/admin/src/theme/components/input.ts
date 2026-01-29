import { defineStyleConfig } from '@chakra-ui/react'

export const Input = defineStyleConfig({
  baseStyle: {
    field: {
      borderRadius: 'lg',
      _placeholder: {
        color: 'text.placeholder',
      },
    },
  },
  sizes: {
    sm: {
      field: {
        fontSize: 'sm',
        px: 3,
        h: 8,
      },
    },
    md: {
      field: {
        fontSize: 'md',
        px: 4,
        h: 10,
      },
    },
    lg: {
      field: {
        fontSize: 'lg',
        px: 4,
        h: 12,
      },
    },
  },
  variants: {
    outline: {
      field: {
        bg: 'bg.surface',
        border: '1px solid',
        borderColor: 'border.default',
        _hover: {
          borderColor: 'border.emphasis',
        },
        _focusVisible: {
          borderColor: 'brand.500',
          boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
        },
        _invalid: {
          borderColor: 'error.500',
          boxShadow: '0 0 0 1px var(--chakra-colors-error-500)',
        },
      },
    },
    filled: {
      field: {
        bg: 'bg.subtle',
        border: '1px solid',
        borderColor: 'transparent',
        _hover: {
          bg: 'bg.muted',
        },
        _focusVisible: {
          bg: 'bg.surface',
          borderColor: 'brand.500',
          boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
        },
        _invalid: {
          borderColor: 'error.500',
        },
      },
    },
  },
  defaultProps: {
    size: 'md',
    variant: 'outline',
  },
})
