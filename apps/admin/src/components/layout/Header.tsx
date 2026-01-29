import {
  Flex,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Avatar,
  useColorMode,
  Box,
  Text,
} from '@chakra-ui/react'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, signOut } = useAuth()
  const { colorMode, toggleColorMode } = useColorMode()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <Flex
      as="header"
      h="header"
      px={4}
      align="center"
      justify="space-between"
      bg="bg.surface"
      borderBottom="1px solid"
      borderColor="border.default"
    >
      <Flex align="center" gap={2}>
        {onMenuClick && (
          <IconButton
            display={{ base: 'flex', md: 'none' }}
            aria-label="Open menu"
            variant="ghost"
            onClick={onMenuClick}
            fontSize="xl"
          >
            ☰
          </IconButton>
        )}
      </Flex>

      <Flex align="center" gap={2}>
        <IconButton
          aria-label="Toggle color mode"
          variant="ghost"
          onClick={toggleColorMode}
          fontSize="lg"
        >
          {colorMode === 'light' ? '🌙' : '☀️'}
        </IconButton>

        <Menu>
          <MenuButton>
            <Avatar
              size="sm"
              name={user?.email ?? 'User'}
              bg="brand.500"
              color="white"
              cursor="pointer"
            />
          </MenuButton>
          <MenuList>
            <Box px={3} py={2}>
              <Text fontSize="sm" fontWeight="medium">
                {user?.email}
              </Text>
            </Box>
            <MenuDivider />
            <MenuItem onClick={() => navigate('/settings')}>Settings</MenuItem>
            <MenuItem onClick={() => void handleSignOut()} color="error.600">
              Sign out
            </MenuItem>
          </MenuList>
        </Menu>
      </Flex>
    </Flex>
  )
}
