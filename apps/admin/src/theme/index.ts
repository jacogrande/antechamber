import { extendTheme, type ThemeConfig } from '@chakra-ui/react'
import { colors } from './foundations/colors'
import { fonts, fontSizes, fontWeights, lineHeights, letterSpacings } from './foundations/typography'
import { space, sizes } from './foundations/spacing'
import { radii } from './foundations/radii'
import { shadows } from './foundations/shadows'
import { semanticTokens } from './semantic-tokens'
import { Button, Input, Card, Badge } from './components'

const config: ThemeConfig = {
  initialColorMode: 'system',
  useSystemColorMode: true,
}

export const theme = extendTheme({
  config,
  colors,
  fonts,
  fontSizes,
  fontWeights,
  lineHeights,
  letterSpacings,
  space,
  sizes,
  radii,
  shadows,
  semanticTokens,
  components: {
    Button,
    Input,
    Card,
    Badge,
  },
  styles: {
    global: {
      body: {
        bg: 'bg.canvas',
        color: 'text.default',
      },
    },
  },
})

export type Theme = typeof theme
