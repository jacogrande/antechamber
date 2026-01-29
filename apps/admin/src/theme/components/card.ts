import { cardAnatomy } from '@chakra-ui/anatomy'
import { createMultiStyleConfigHelpers } from '@chakra-ui/react'

const { definePartsStyle, defineMultiStyleConfig } =
  createMultiStyleConfigHelpers(cardAnatomy.keys)

const baseStyle = definePartsStyle({
  container: {
    borderRadius: 'xl',
  },
  header: {
    pb: 2,
  },
  body: {
    py: 4,
  },
  footer: {
    pt: 2,
  },
})

const variants = {
  elevated: definePartsStyle({
    container: {
      bg: 'bg.surface',
      boxShadow: 'md',
    },
  }),
  outline: definePartsStyle({
    container: {
      bg: 'bg.surface',
      border: '1px solid',
      borderColor: 'border.default',
    },
  }),
  filled: definePartsStyle({
    container: {
      bg: 'bg.subtle',
    },
  }),
}

export const Card = defineMultiStyleConfig({
  baseStyle,
  variants,
  defaultProps: {
    variant: 'outline',
  },
})
