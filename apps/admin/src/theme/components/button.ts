import { defineStyleConfig } from '@chakra-ui/react'

export const Button = defineStyleConfig({
  baseStyle: {
    fontWeight: 'medium',
    borderRadius: 'lg',
    transition: 'all 0.2s',
    _focusVisible: {
      boxShadow: 'outline',
    },
  },
  sizes: {
    sm: {
      fontSize: 'sm',
      px: 3,
      py: 1.5,
      h: 8,
    },
    md: {
      fontSize: 'md',
      px: 4,
      py: 2,
      h: 10,
    },
    lg: {
      fontSize: 'lg',
      px: 6,
      py: 3,
      h: 12,
    },
  },
  variants: {
    primary: {
      bg: 'brand.600',
      color: 'white',
      _hover: {
        bg: 'brand.700',
        _disabled: {
          bg: 'brand.600',
        },
      },
      _active: {
        bg: 'brand.800',
      },
    },
    secondary: {
      bg: 'bg.surface',
      color: 'text.default',
      border: '1px solid',
      borderColor: 'border.default',
      _hover: {
        bg: 'bg.subtle',
        _disabled: {
          bg: 'bg.surface',
        },
      },
      _active: {
        bg: 'bg.muted',
      },
    },
    ghost: {
      bg: 'transparent',
      color: 'text.default',
      _hover: {
        bg: 'bg.subtle',
        _disabled: {
          bg: 'transparent',
        },
      },
      _active: {
        bg: 'bg.muted',
      },
    },
    danger: {
      bg: 'error.600',
      color: 'white',
      _hover: {
        bg: 'error.700',
        _disabled: {
          bg: 'error.600',
        },
      },
      _active: {
        bg: 'error.800',
      },
    },
  },
  defaultProps: {
    size: 'md',
    variant: 'primary',
  },
})
