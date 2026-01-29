import { Box, Flex, useDisclosure, Drawer, DrawerOverlay, DrawerContent, DrawerCloseButton } from '@chakra-ui/react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function AppShell() {
  const { isOpen, onOpen, onClose } = useDisclosure()

  return (
    <Flex h="100vh" overflow="hidden">
      {/* Desktop sidebar */}
      <Box
        display={{ base: 'none', md: 'block' }}
        w="sidebar"
        flexShrink={0}
      >
        <Sidebar />
      </Box>

      {/* Mobile sidebar drawer */}
      <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent maxW="sidebar">
          <DrawerCloseButton />
          <Sidebar onClose={onClose} />
        </DrawerContent>
      </Drawer>

      {/* Main content area */}
      <Flex flex={1} direction="column" overflow="hidden">
        <Header onMenuClick={onOpen} />
        <Box
          as="main"
          flex={1}
          overflow="auto"
          bg="bg.canvas"
          p={{ base: 4, md: 6 }}
        >
          <Outlet />
        </Box>
      </Flex>
    </Flex>
  )
}
