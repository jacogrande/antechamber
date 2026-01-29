import { Box, VStack, Text, Flex } from '@chakra-ui/react'
import { Link, useLocation } from 'react-router-dom'

interface NavItem {
  label: string
  path: string
  icon: string
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: '📊' },
  { label: 'Schemas', path: '/schemas', icon: '📋' },
  { label: 'Webhooks', path: '/webhooks', icon: '🔗' },
  { label: 'Settings', path: '/settings', icon: '⚙️' },
]

interface SidebarProps {
  onClose?: () => void
}

export function Sidebar({ onClose }: SidebarProps) {
  const location = useLocation()

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <Box
      as="nav"
      w="full"
      h="full"
      bg="bg.surface"
      borderRight="1px solid"
      borderColor="border.default"
      py={6}
    >
      <Flex px={6} mb={8} align="center" gap={2}>
        <Text fontSize="xl" fontWeight="bold" color="brand.600">
          Onboarding
        </Text>
      </Flex>

      <VStack spacing={1} align="stretch" px={3}>
        {navItems.map((item) => (
          <Link key={item.path} to={item.path} onClick={onClose}>
            <Flex
              px={3}
              py={2.5}
              align="center"
              gap={3}
              borderRadius="lg"
              bg={isActive(item.path) ? 'interactive.muted' : 'transparent'}
              color={isActive(item.path) ? 'interactive.default' : 'text.muted'}
              fontWeight={isActive(item.path) ? 'semibold' : 'medium'}
              _hover={{
                bg: isActive(item.path) ? 'interactive.muted' : 'bg.subtle',
                color: isActive(item.path) ? 'interactive.default' : 'text.default',
              }}
              transition="all 0.15s"
            >
              <Text fontSize="lg">{item.icon}</Text>
              <Text fontSize="sm">{item.label}</Text>
            </Flex>
          </Link>
        ))}
      </VStack>
    </Box>
  )
}
