# Admin SPA MVP Plan

## Overview

A single-page application for tenant admins to manage their onboarding intake system. This is the administrative interface that complements the existing Hono API backend.

## Goals

1. Enable self-service tenant administration
2. Provide schema builder UI for defining extraction fields
3. Manage webhook integrations
4. View submission history and status

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | React 18+ | Widely adopted, excellent ecosystem |
| Build Tool | Vite | Fast HMR, native ESM, simple config |
| Routing | React Router v6 | Standard SPA routing |
| State | TanStack Query (React Query) | Server state management, caching, optimistic updates |
| Styling | Chakra UI v2 | Component library with built-in theming, accessible |
| Design Tokens | Chakra Theme + Custom Tokens | Consistent design system, easy customization |
| Forms | React Hook Form + Zod | Type-safe validation (reuse API schemas) |
| Auth | Supabase Auth JS | Direct integration with existing auth |
| HTTP | Fetch + custom hooks | Lightweight, no axios needed |

## Project Structure

```
apps/admin/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
├── src/
│   ├── main.tsx                 # App entry point
│   ├── App.tsx                  # Root component with providers
│   ├── routes.tsx               # Route definitions
│   ├── theme/
│   │   ├── index.ts             # Theme export
│   │   ├── foundations/
│   │   │   ├── colors.ts        # Color tokens
│   │   │   ├── typography.ts    # Font tokens
│   │   │   ├── spacing.ts       # Spacing scale
│   │   │   ├── radii.ts         # Border radius tokens
│   │   │   ├── shadows.ts       # Shadow tokens
│   │   │   └── breakpoints.ts   # Responsive breakpoints
│   │   ├── components/
│   │   │   ├── button.ts        # Button variants
│   │   │   ├── input.ts         # Input variants
│   │   │   ├── card.ts          # Card variants
│   │   │   ├── badge.ts         # Badge variants
│   │   │   └── index.ts         # Component overrides export
│   │   └── semantic-tokens.ts   # Light/dark semantic tokens
│   ├── api/
│   │   ├── client.ts            # API client with auth headers
│   │   ├── schemas.ts           # Schema API hooks
│   │   ├── webhooks.ts          # Webhook API hooks
│   │   └── submissions.ts       # Submission API hooks
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx     # Main layout wrapper
│   │   │   ├── Sidebar.tsx
│   │   │   └── Header.tsx
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── SignupForm.tsx
│   │   │   └── AuthGuard.tsx
│   │   ├── schemas/
│   │   │   ├── SchemaList.tsx
│   │   │   ├── SchemaBuilder.tsx
│   │   │   ├── FieldEditor.tsx
│   │   │   └── FieldTypeSelect.tsx
│   │   ├── webhooks/
│   │   │   ├── WebhookList.tsx
│   │   │   ├── WebhookForm.tsx
│   │   │   └── WebhookSecret.tsx
│   │   └── common/
│   │       ├── EmptyState.tsx
│   │       ├── LoadingSpinner.tsx
│   │       ├── ConfirmDialog.tsx
│   │       └── TagInput.tsx
│   ├── hooks/
│   │   ├── useAuth.ts           # Auth state and methods
│   │   ├── useTenant.ts         # Current tenant context
│   │   └── useColorModeValue.ts # Theme-aware values
│   ├── lib/
│   │   ├── supabase.ts          # Supabase client init
│   │   ├── utils.ts             # Utility functions
│   │   └── validation.ts        # Shared Zod schemas (import from API)
│   └── pages/
│       ├── Login.tsx
│       ├── Signup.tsx
│       ├── Dashboard.tsx
│       ├── Schemas.tsx
│       ├── SchemaDetail.tsx
│       ├── SchemaCreate.tsx
│       ├── Webhooks.tsx
│       └── Settings.tsx
```

---

## Design System

> **Built in Phase 1** (Section 1.2 and 1.3)

### Design Tokens

All design decisions are centralized in the theme for consistency and easy updates.

#### Colors (`src/theme/foundations/colors.ts`)

```typescript
export const colors = {
  // Brand colors
  brand: {
    50: '#E6F2FF',
    100: '#CCE5FF',
    200: '#99CBFF',
    300: '#66B0FF',
    400: '#3396FF',
    500: '#007BFF',  // Primary brand color
    600: '#0062CC',
    700: '#004A99',
    800: '#003166',
    900: '#001933',
  },

  // Semantic colors for status
  success: {
    50: '#E6F9F0',
    100: '#C2F0DB',
    200: '#85E1B7',
    300: '#47D293',
    400: '#22C97A',
    500: '#10B981',  // Primary success
    600: '#0D9668',
    700: '#0A714E',
    800: '#074D35',
    900: '#03281B',
  },

  warning: {
    50: '#FFF8E6',
    100: '#FFEFC2',
    200: '#FFDF85',
    300: '#FFCF47',
    400: '#FFBF0A',
    500: '#F59E0B',  // Primary warning
    600: '#C47F09',
    700: '#935F07',
    800: '#624004',
    900: '#312002',
  },

  error: {
    50: '#FEE9E9',
    100: '#FDD3D3',
    200: '#FBA7A7',
    300: '#F97B7B',
    400: '#F74F4F',
    500: '#EF4444',  // Primary error
    600: '#BF3636',
    700: '#8F2929',
    800: '#601B1B',
    900: '#300E0E',
  },

  // Neutral grays
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
};
```

#### Typography (`src/theme/foundations/typography.ts`)

```typescript
export const fonts = {
  heading: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
  body: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
  mono: `'JetBrains Mono', 'Fira Code', monospace`,
};

export const fontSizes = {
  xs: '0.75rem',    // 12px
  sm: '0.875rem',   // 14px
  md: '1rem',       // 16px
  lg: '1.125rem',   // 18px
  xl: '1.25rem',    // 20px
  '2xl': '1.5rem',  // 24px
  '3xl': '1.875rem', // 30px
  '4xl': '2.25rem', // 36px
  '5xl': '3rem',    // 48px
};

export const fontWeights = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

export const lineHeights = {
  tight: 1.25,
  normal: 1.5,
  relaxed: 1.625,
};

export const letterSpacings = {
  tight: '-0.025em',
  normal: '0',
  wide: '0.025em',
};
```

#### Spacing (`src/theme/foundations/spacing.ts`)

```typescript
// 4px base unit scale
export const space = {
  px: '1px',
  0: '0',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  3.5: '0.875rem',  // 14px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  7: '1.75rem',     // 28px
  8: '2rem',        // 32px
  9: '2.25rem',     // 36px
  10: '2.5rem',     // 40px
  12: '3rem',       // 48px
  14: '3.5rem',     // 56px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
};
```

#### Border Radius (`src/theme/foundations/radii.ts`)

```typescript
export const radii = {
  none: '0',
  sm: '0.25rem',    // 4px
  base: '0.375rem', // 6px
  md: '0.5rem',     // 8px
  lg: '0.75rem',    // 12px
  xl: '1rem',       // 16px
  '2xl': '1.5rem',  // 24px
  full: '9999px',
};
```

#### Shadows (`src/theme/foundations/shadows.ts`)

```typescript
export const shadows = {
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
  outline: '0 0 0 3px rgba(0, 123, 255, 0.5)',
  none: 'none',
};
```

#### Semantic Tokens (`src/theme/semantic-tokens.ts`)

```typescript
export const semanticTokens = {
  colors: {
    // Background tokens
    'bg.canvas': {
      default: 'gray.50',
      _dark: 'gray.900',
    },
    'bg.surface': {
      default: 'white',
      _dark: 'gray.800',
    },
    'bg.subtle': {
      default: 'gray.100',
      _dark: 'gray.700',
    },
    'bg.muted': {
      default: 'gray.200',
      _dark: 'gray.600',
    },

    // Text tokens
    'text.primary': {
      default: 'gray.900',
      _dark: 'gray.50',
    },
    'text.secondary': {
      default: 'gray.600',
      _dark: 'gray.400',
    },
    'text.muted': {
      default: 'gray.500',
      _dark: 'gray.500',
    },
    'text.inverse': {
      default: 'white',
      _dark: 'gray.900',
    },

    // Border tokens
    'border.default': {
      default: 'gray.200',
      _dark: 'gray.700',
    },
    'border.muted': {
      default: 'gray.100',
      _dark: 'gray.800',
    },
    'border.emphasis': {
      default: 'gray.300',
      _dark: 'gray.600',
    },

    // Interactive tokens
    'interactive.default': {
      default: 'brand.500',
      _dark: 'brand.400',
    },
    'interactive.hover': {
      default: 'brand.600',
      _dark: 'brand.300',
    },
    'interactive.active': {
      default: 'brand.700',
      _dark: 'brand.200',
    },

    // Status tokens
    'status.success': {
      default: 'success.500',
      _dark: 'success.400',
    },
    'status.warning': {
      default: 'warning.500',
      _dark: 'warning.400',
    },
    'status.error': {
      default: 'error.500',
      _dark: 'error.400',
    },
    'status.info': {
      default: 'brand.500',
      _dark: 'brand.400',
    },
  },
};
```

### Component Overrides

#### Button (`src/theme/components/button.ts`)

```typescript
import { defineStyleConfig } from '@chakra-ui/react';

export const Button = defineStyleConfig({
  baseStyle: {
    fontWeight: 'semibold',
    borderRadius: 'md',
    transition: 'all 0.2s',
  },
  sizes: {
    sm: {
      fontSize: 'sm',
      px: 3,
      py: 1.5,
    },
    md: {
      fontSize: 'md',
      px: 4,
      py: 2,
    },
    lg: {
      fontSize: 'lg',
      px: 6,
      py: 3,
    },
  },
  variants: {
    primary: {
      bg: 'brand.500',
      color: 'white',
      _hover: {
        bg: 'brand.600',
        _disabled: { bg: 'brand.500' },
      },
      _active: { bg: 'brand.700' },
    },
    secondary: {
      bg: 'bg.subtle',
      color: 'text.primary',
      border: '1px solid',
      borderColor: 'border.default',
      _hover: {
        bg: 'bg.muted',
        _disabled: { bg: 'bg.subtle' },
      },
    },
    ghost: {
      bg: 'transparent',
      color: 'text.primary',
      _hover: {
        bg: 'bg.subtle',
      },
    },
    danger: {
      bg: 'error.500',
      color: 'white',
      _hover: {
        bg: 'error.600',
        _disabled: { bg: 'error.500' },
      },
      _active: { bg: 'error.700' },
    },
  },
  defaultProps: {
    variant: 'primary',
    size: 'md',
  },
});
```

#### Input (`src/theme/components/input.ts`)

```typescript
import { defineStyleConfig } from '@chakra-ui/react';

export const Input = defineStyleConfig({
  baseStyle: {
    field: {
      borderRadius: 'md',
      _placeholder: {
        color: 'text.muted',
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
        _focus: {
          borderColor: 'brand.500',
          boxShadow: 'outline',
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
        _focus: {
          bg: 'bg.surface',
          borderColor: 'brand.500',
        },
      },
    },
  },
  defaultProps: {
    variant: 'outline',
  },
});
```

#### Card (`src/theme/components/card.ts`)

```typescript
import { defineStyleConfig } from '@chakra-ui/react';

export const Card = defineStyleConfig({
  baseStyle: {
    container: {
      bg: 'bg.surface',
      borderRadius: 'lg',
      border: '1px solid',
      borderColor: 'border.default',
      overflow: 'hidden',
    },
    header: {
      px: 6,
      py: 4,
      borderBottom: '1px solid',
      borderColor: 'border.muted',
    },
    body: {
      px: 6,
      py: 4,
    },
    footer: {
      px: 6,
      py: 4,
      borderTop: '1px solid',
      borderColor: 'border.muted',
    },
  },
  variants: {
    elevated: {
      container: {
        boxShadow: 'md',
        border: 'none',
      },
    },
    outline: {
      container: {
        boxShadow: 'none',
      },
    },
    filled: {
      container: {
        bg: 'bg.subtle',
        border: 'none',
      },
    },
  },
  defaultProps: {
    variant: 'outline',
  },
});
```

#### Badge (`src/theme/components/badge.ts`)

```typescript
import { defineStyleConfig } from '@chakra-ui/react';

export const Badge = defineStyleConfig({
  baseStyle: {
    fontWeight: 'medium',
    fontSize: 'xs',
    borderRadius: 'full',
    px: 2,
    py: 0.5,
    textTransform: 'none',
  },
  variants: {
    solid: {
      bg: 'brand.500',
      color: 'white',
    },
    subtle: {
      bg: 'brand.50',
      color: 'brand.700',
    },
    outline: {
      border: '1px solid',
      borderColor: 'brand.500',
      color: 'brand.500',
    },
    success: {
      bg: 'success.100',
      color: 'success.700',
    },
    warning: {
      bg: 'warning.100',
      color: 'warning.700',
    },
    error: {
      bg: 'error.100',
      color: 'error.700',
    },
  },
  defaultProps: {
    variant: 'subtle',
  },
});
```

### Theme Assembly (`src/theme/index.ts`)

```typescript
import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

// Foundations
import { colors } from './foundations/colors';
import { fonts, fontSizes, fontWeights, lineHeights, letterSpacings } from './foundations/typography';
import { space } from './foundations/spacing';
import { radii } from './foundations/radii';
import { shadows } from './foundations/shadows';
import { semanticTokens } from './semantic-tokens';

// Components
import { Button } from './components/button';
import { Input } from './components/input';
import { Card } from './components/card';
import { Badge } from './components/badge';

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: true,
};

export const theme = extendTheme({
  config,
  colors,
  fonts,
  fontSizes,
  fontWeights,
  lineHeights,
  letterSpacings,
  space,
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
        color: 'text.primary',
      },
    },
  },
});
```

### App Provider Setup (`src/App.tsx`)

```tsx
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { theme } from './theme';
import { router } from './routes';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
});

export function App() {
  return (
    <>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <ChakraProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </ChakraProvider>
    </>
  );
}
```

---

## Features

> Each feature maps to the Implementation Order phases below.

### Authentication & Shell (Phase 1, Sections 1.4-1.6)

#### Login Page
- Email/password login form
- "Forgot password" link (Supabase handles reset flow)
- Redirect to dashboard on success
- Error handling for invalid credentials

#### Signup Page
- Email/password registration
- Redirect to login with "check your email" message
- Email verification via Supabase

#### Auth Guard
- HOC/component to protect authenticated routes
- Redirect to login if no session
- Show loading state while checking auth

#### App Shell
- Sidebar navigation (Schemas, Webhooks, Settings)
- Header with user menu (profile, logout)
- Tenant selector (if user belongs to multiple tenants)
- Color mode toggle (light/dark)
- Responsive: collapsible sidebar on mobile

### Schema Management (Phase 2, Sections 2.1-2.4)

#### Schema List
- Table/card view of all schemas
- Shows: name, field count, latest version, created date
- Actions: view, create new version
- Empty state with CTA to create first schema

#### Schema Builder (Create)
- Schema name input
- Field list with drag-to-reorder
- "Add Field" button opens field editor
- Preview panel showing JSON structure
- Save creates schema + version 1

#### Field Editor
- Modal or drawer panel
- Fields:
  - Key (auto-slugified from label)
  - Label
  - Type (dropdown: string, number, boolean, enum, string[])
  - Required (toggle)
  - Instructions (textarea)
  - Enum Options (conditional, tag input)
  - Validation Rules (collapsible accordion)
    - Regex pattern
    - Min/Max length
  - Confidence Threshold (slider 0-1)
  - Source Hints (tag input)
- Validation feedback in real-time

#### Schema Detail / Version History
- View schema with all fields
- Version selector dropdown
- Diff view between versions (nice-to-have)
- "Create New Version" button
- Version history timeline

#### Create New Version
- Pre-populated with current version's fields
- Same field editor UI
- On save, creates new version (auto-incremented)

### Webhook Management (Phase 3, Sections 3.1-3.5)

#### Webhook List
- Table showing: endpoint URL (truncated), events, status, created date
- Status badge: Active / Inactive
- Actions: view secret, delete

#### Create Webhook
- Endpoint URL input (validates HTTPS)
- Event checkboxes (currently just `submission.confirmed`)
- On success, show secret once with copy button
- Warning: "Save this secret, it won't be shown again"

#### Webhook Detail
- Show endpoint, events, status
- "Reveal Secret" button (requires re-auth or confirmation)
- Delete with confirmation modal
- Delivery history (Phase 4 nice-to-have)

### Dashboard & Settings (Phase 4, Sections 4.1-4.2)

#### Dashboard
- Recent submissions (last 10)
- Quick stats: total submissions, pending, confirmed
- Schema count, webhook count
- Activity feed from audit logs

#### Submission Viewer (Read-only)
- List submissions with status filter
- View extracted fields with citations
- Link to context pack / CSV download

#### Settings
- Tenant name/slug (read-only for now)
- Color mode preference
- Team members (future)
- API keys (future)

---

## UI Components (Chakra Examples)

> Reference implementations for components built in Phases 1-3.

### Schema Builder Field Editor (Phase 2)

```tsx
import {
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  DrawerCloseButton,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  Select,
  Textarea,
  Switch,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Button,
  HStack,
  VStack,
  Box,
} from '@chakra-ui/react';
import { useForm, Controller } from 'react-hook-form';

export function FieldEditorDrawer({ isOpen, onClose, field, onSave }) {
  const { control, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: field,
  });

  const fieldType = watch('type');

  return (
    <Drawer isOpen={isOpen} onClose={onClose} size="md">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader borderBottomWidth="1px">
          {field ? 'Edit Field' : 'Add Field'}
        </DrawerHeader>

        <DrawerBody>
          <VStack spacing={5} align="stretch">
            <FormControl isInvalid={!!errors.label}>
              <FormLabel>Display Label</FormLabel>
              <Controller
                name="label"
                control={control}
                rules={{ required: 'Label is required' }}
                render={({ field }) => <Input {...field} />}
              />
              <FormErrorMessage>{errors.label?.message}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.key}>
              <FormLabel>Field Key</FormLabel>
              <Controller
                name="key"
                control={control}
                rules={{ required: 'Key is required' }}
                render={({ field }) => <Input {...field} fontFamily="mono" />}
              />
              <FormErrorMessage>{errors.key?.message}</FormErrorMessage>
            </FormControl>

            <FormControl>
              <FormLabel>Field Type</FormLabel>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select {...field}>
                    <option value="string">Text</option>
                    <option value="number">Number</option>
                    <option value="boolean">Yes/No</option>
                    <option value="enum">Single Select</option>
                    <option value="string[]">Multiple Values</option>
                  </Select>
                )}
              />
            </FormControl>

            <FormControl display="flex" alignItems="center">
              <FormLabel mb={0}>Required</FormLabel>
              <Controller
                name="required"
                control={control}
                render={({ field }) => (
                  <Switch
                    isChecked={field.value}
                    onChange={field.onChange}
                    colorScheme="brand"
                  />
                )}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Extraction Instructions</FormLabel>
              <Controller
                name="instructions"
                control={control}
                render={({ field }) => (
                  <Textarea {...field} rows={3} />
                )}
              />
            </FormControl>

            {fieldType === 'enum' && (
              <FormControl>
                <FormLabel>Options</FormLabel>
                {/* TagInput component */}
              </FormControl>
            )}

            <Accordion allowToggle>
              <AccordionItem border="none">
                <AccordionButton px={0}>
                  <Box flex="1" textAlign="left" fontWeight="medium">
                    Advanced Settings
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel px={0}>
                  <VStack spacing={4} align="stretch">
                    <FormControl>
                      <FormLabel>Confidence Threshold</FormLabel>
                      <Controller
                        name="confidenceThreshold"
                        control={control}
                        render={({ field }) => (
                          <Slider
                            value={field.value ?? 0.5}
                            onChange={field.onChange}
                            min={0}
                            max={1}
                            step={0.1}
                            colorScheme="brand"
                          >
                            <SliderTrack>
                              <SliderFilledTrack />
                            </SliderTrack>
                            <SliderThumb />
                          </Slider>
                        )}
                      />
                    </FormControl>

                    <FormControl>
                      <FormLabel>Source Hints</FormLabel>
                      {/* TagInput component */}
                    </FormControl>

                    <FormControl>
                      <FormLabel>Regex Pattern</FormLabel>
                      <Controller
                        name="validation.regex"
                        control={control}
                        render={({ field }) => (
                          <Input {...field} fontFamily="mono" />
                        )}
                      />
                    </FormControl>

                    <HStack>
                      <FormControl>
                        <FormLabel>Min Length</FormLabel>
                        <Controller
                          name="validation.minLen"
                          control={control}
                          render={({ field }) => (
                            <Input {...field} type="number" />
                          )}
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel>Max Length</FormLabel>
                        <Controller
                          name="validation.maxLen"
                          control={control}
                          render={({ field }) => (
                            <Input {...field} type="number" />
                          )}
                        />
                      </FormControl>
                    </HStack>
                  </VStack>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          </VStack>
        </DrawerBody>

        <DrawerFooter borderTopWidth="1px">
          <Button variant="secondary" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit(onSave)}>
            Save Field
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
```

### Status Badge Component (Phase 2/3 - used in Schema and Webhook lists)

```tsx
import { Badge, type BadgeProps } from '@chakra-ui/react';

type Status = 'pending' | 'draft' | 'confirmed' | 'failed' | 'active' | 'inactive';

const statusVariants: Record<Status, BadgeProps['variant']> = {
  pending: 'warning',
  draft: 'subtle',
  confirmed: 'success',
  failed: 'error',
  active: 'success',
  inactive: 'subtle',
};

const statusLabels: Record<Status, string> = {
  pending: 'Pending',
  draft: 'Draft',
  confirmed: 'Confirmed',
  failed: 'Failed',
  active: 'Active',
  inactive: 'Inactive',
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <Badge variant={statusVariants[status]}>
      {statusLabels[status]}
    </Badge>
  );
}
```

---

## API Integration

> Authentication built in Phase 1 (Section 1.5), API client and hooks in Phase 2 (Section 2.1).

### Authentication Flow (Phase 1)

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

```typescript
// src/hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password });

  const signUp = (email: string, password: string) =>
    supabase.auth.signUp({ email, password });

  const signOut = () => supabase.auth.signOut();

  return { session, user, loading, signIn, signUp, signOut };
}
```

### API Client (Phase 2)

```typescript
// src/api/client.ts
import { supabase } from '@/lib/supabase';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const tenantId = localStorage.getItem('currentTenantId');

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'X-Tenant-ID': tenantId || '',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'API request failed');
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}
```

### React Query Hooks Example (Phase 2)

```typescript
// src/api/schemas.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@chakra-ui/react';
import { apiClient } from './client';
import type { CreateSchemaRequest } from '@shared/types/api';

export function useSchemas() {
  return useQuery({
    queryKey: ['schemas'],
    queryFn: () => apiClient<{ schemas: Schema[] }>('/api/schemas'),
  });
}

export function useCreateSchema() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (data: CreateSchemaRequest) =>
      apiClient('/api/schemas', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schemas'] });
      toast({
        title: 'Schema created',
        status: 'success',
        duration: 3000,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create schema',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    },
  });
}
```

---

## Routes (Phase 1, Section 1.4)

```tsx
// src/routes.tsx
import { createBrowserRouter } from 'react-router-dom';

export const router = createBrowserRouter([
  // Public routes
  { path: '/login', element: <Login /> },
  { path: '/signup', element: <Signup /> },

  // Protected routes
  {
    path: '/',
    element: <AuthGuard><AppShell /></AuthGuard>,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'schemas', element: <Schemas /> },
      { path: 'schemas/new', element: <SchemaCreate /> },
      { path: 'schemas/:schemaId', element: <SchemaDetail /> },
      { path: 'schemas/:schemaId/versions/new', element: <SchemaVersionCreate /> },
      { path: 'webhooks', element: <Webhooks /> },
      { path: 'webhooks/new', element: <WebhookCreate /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
]);
```

---

## Environment Variables

```bash
# apps/admin/.env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:3000
```

---

## Build & Deployment (Phase 4, Section 4.4)

### Development

```bash
cd apps/admin
bun install
bun run dev  # Vite dev server on :5173
```

### Production Build

```bash
bun run build  # Outputs to dist/
bun run preview  # Preview production build
```

### Deployment Options

1. **Vercel** (recommended)
   - Auto-detected as Vite project
   - Set environment variables in dashboard
   - Configure rewrites for SPA routing

2. **Static hosting** (S3, Cloudflare Pages, Netlify)
   - Upload `dist/` folder
   - Configure fallback to `index.html` for client-side routing

### Vercel Configuration

```json
// vercel.json
{
  "rewrites": [
    { "source": "/((?!assets/).*)", "destination": "/index.html" }
  ]
}
```

---

## Implementation Order

### Phase 1: Foundation & Design System (Week 1) ✅

**1.1 Project Setup**
- [x] Initialize Vite + React + TypeScript project
- [x] Install dependencies: `@chakra-ui/react`, `@emotion/react`, `@emotion/styled`, `framer-motion`
- [x] Install dependencies: `react-router-dom`, `@tanstack/react-query`, `react-hook-form`, `zod`
- [x] Install dependencies: `@supabase/supabase-js`
- [x] Configure TypeScript paths (`@/` alias)
- [x] Set up environment variables

**1.2 Design System - Foundations**
- [x] Create `src/theme/foundations/colors.ts` - brand, semantic, and gray palettes
- [x] Create `src/theme/foundations/typography.ts` - fonts, sizes, weights, line heights
- [x] Create `src/theme/foundations/spacing.ts` - spacing scale
- [x] Create `src/theme/foundations/radii.ts` - border radius tokens
- [x] Create `src/theme/foundations/shadows.ts` - shadow tokens
- [x] Create `src/theme/semantic-tokens.ts` - light/dark mode semantic tokens

**1.3 Design System - Component Overrides**
- [x] Create `src/theme/components/button.ts` - primary, secondary, ghost, danger variants
- [x] Create `src/theme/components/input.ts` - outline, filled variants
- [x] Create `src/theme/components/card.ts` - elevated, outline, filled variants
- [x] Create `src/theme/components/badge.ts` - status variants (success, warning, error)
- [x] Create `src/theme/index.ts` - assemble theme with `extendTheme`

**1.4 App Shell & Providers**
- [x] Create `src/App.tsx` with ChakraProvider, QueryClientProvider, RouterProvider
- [x] Create `src/main.tsx` entry point with ColorModeScript
- [x] Create `src/routes.tsx` with route definitions

**1.5 Authentication**
- [x] Create `src/lib/supabase.ts` - Supabase client initialization
- [x] Create `src/hooks/useAuth.ts` - auth state, signIn, signUp, signOut
- [x] Create `src/components/auth/AuthGuard.tsx` - protected route wrapper
- [x] Create `src/pages/Login.tsx` - login form page
- [x] Create `src/pages/Signup.tsx` - signup form page

**1.6 Layout Components**
- [x] Create `src/components/layout/AppShell.tsx` - main layout with sidebar + content
- [x] Create `src/components/layout/Sidebar.tsx` - navigation sidebar
- [x] Create `src/components/layout/Header.tsx` - header with user menu, tenant selector, color mode toggle

### Phase 2: Schema Management (Week 2)

**2.1 API Layer**
- [ ] Create `src/api/client.ts` - fetch wrapper with auth headers
- [ ] Create `src/api/schemas.ts` - useSchemas, useSchema, useCreateSchema, useCreateSchemaVersion hooks

**2.2 Common Components**
- [ ] Create `src/components/common/EmptyState.tsx` - empty state with icon and CTA
- [ ] Create `src/components/common/LoadingSpinner.tsx` - centered spinner
- [ ] Create `src/components/common/TagInput.tsx` - tag input for arrays (enum options, source hints)

**2.3 Schema Components**
- [ ] Create `src/components/schemas/SchemaCard.tsx` - schema summary card
- [ ] Create `src/components/schemas/SchemaList.tsx` - grid/list of schema cards
- [ ] Create `src/components/schemas/FieldTypeSelect.tsx` - field type dropdown
- [ ] Create `src/components/schemas/FieldEditor.tsx` - drawer for editing a single field
- [ ] Create `src/components/schemas/FieldList.tsx` - sortable list of fields
- [ ] Create `src/components/schemas/SchemaBuilder.tsx` - full schema builder with field list + preview

**2.4 Schema Pages**
- [ ] Create `src/pages/Schemas.tsx` - schema list page
- [ ] Create `src/pages/SchemaCreate.tsx` - create new schema page
- [ ] Create `src/pages/SchemaDetail.tsx` - view schema with version history
- [ ] Create `src/pages/SchemaVersionCreate.tsx` - create new version page

### Phase 3: Webhook Management (Week 3)

**3.1 API Layer**
- [ ] Create `src/api/webhooks.ts` - useWebhooks, useCreateWebhook, useDeleteWebhook hooks

**3.2 Common Components**
- [ ] Create `src/components/common/ConfirmDialog.tsx` - confirmation modal using AlertDialog
- [ ] Create `src/components/common/CopyButton.tsx` - copy to clipboard button

**3.3 Webhook Components**
- [ ] Create `src/components/webhooks/WebhookCard.tsx` - webhook summary with status badge
- [ ] Create `src/components/webhooks/WebhookList.tsx` - list of webhook cards
- [ ] Create `src/components/webhooks/WebhookForm.tsx` - create webhook form
- [ ] Create `src/components/webhooks/WebhookSecret.tsx` - secret display with copy + warning

**3.4 Webhook Pages**
- [ ] Create `src/pages/Webhooks.tsx` - webhook list page
- [ ] Create `src/pages/WebhookCreate.tsx` - create webhook page (or modal)

**3.5 Polish & Error Handling**
- [ ] Add Skeleton loading states to list pages
- [ ] Create `src/components/common/ErrorBoundary.tsx` - error boundary wrapper
- [ ] Configure global toast notifications for mutations
- [ ] Responsive design pass - mobile sidebar, stacked layouts

### Phase 4: Dashboard, Settings & Launch (Week 4)

**4.1 Dashboard**
- [ ] Create `src/api/submissions.ts` - useSubmissions hook (read-only)
- [ ] Create `src/components/dashboard/StatCard.tsx` - metric card
- [ ] Create `src/components/dashboard/RecentSubmissions.tsx` - recent submissions table
- [ ] Create `src/pages/Dashboard.tsx` - dashboard with stats and recent activity

**4.2 Settings**
- [ ] Create `src/hooks/useTenant.ts` - current tenant context
- [ ] Create `src/pages/Settings.tsx` - tenant info, color mode preference

**4.3 Testing & QA**
- [ ] Manual testing of all authentication flows
- [ ] Manual testing of schema CRUD operations
- [ ] Manual testing of webhook CRUD operations
- [ ] Manual testing of responsive layouts
- [ ] Fix bugs and edge cases

**4.4 Deployment**
- [ ] Configure Vercel project
- [ ] Set environment variables in Vercel
- [ ] Deploy to staging environment
- [ ] Smoke test staging
- [ ] Deploy to production
- [ ] Update documentation

---

## Future Enhancements (Post-MVP)

1. **Submission Management**
   - View all submissions
   - Filter by status
   - Re-trigger failed workflows

2. **Webhook Delivery Logs**
   - View delivery attempts
   - Retry failed deliveries
   - Response body inspection

3. **Team Management**
   - Invite team members
   - Role assignment (admin, editor, viewer)
   - Remove members

4. **Audit Log Viewer**
   - Searchable activity history
   - Filter by event type, user, date

5. **API Key Management**
   - Generate API keys for programmatic access
   - Scope-limited keys

6. **Schema Templates**
   - Pre-built schemas for common use cases
   - "B2B SaaS Profile", "E-commerce Store", etc.

7. **White-labeling**
   - Custom brand colors via tenant settings
   - Dynamic theme generation from brand.500
