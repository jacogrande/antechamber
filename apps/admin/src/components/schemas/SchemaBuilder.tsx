import { useEffect, useCallback } from 'react'
import {
  Box,
  Flex,
  Input,
  Button,
  HStack,
  FormControl,
  FormLabel,
  Divider,
  useBreakpointValue,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  useDisclosure,
  IconButton,
} from '@chakra-ui/react'
import { useBlocker } from 'react-router-dom'
import { HiOutlineCog } from 'react-icons/hi'
import { FieldTypePalette } from './FieldTypePalette'
import { FieldCanvas } from './FieldCanvas'
import { FieldPropertiesPanel } from './FieldPropertiesPanel'
import { SchemaJsonPreview } from './SchemaJsonPreview'
import { ConfirmDialog } from '@/components/common'
import { useSchemaBuilderContext } from './SchemaBuilderProvider'

interface SchemaBuilderProps {
  onSave: () => void
  onCancel: () => void
  isSaving?: boolean
  saveLabel?: string
}

export function SchemaBuilder({
  onSave,
  onCancel,
  isSaving,
  saveLabel = 'Save',
}: SchemaBuilderProps) {
  const { state, setName, selectedField } = useSchemaBuilderContext()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const {
    isOpen: isConfirmOpen,
    onOpen: onConfirmOpen,
    onClose: onConfirmClose,
  } = useDisclosure()

  const isMobile = useBreakpointValue({ base: true, lg: false })

  const canSave = state.name.trim() && state.fields.length > 0

  // Block navigation when there are unsaved changes
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      state.isDirty && currentLocation.pathname !== nextLocation.pathname
  )

  // Show browser warning when closing/refreshing with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [state.isDirty])

  const handleCancel = useCallback(() => {
    if (state.isDirty) {
      onConfirmOpen()
    } else {
      onCancel()
    }
  }, [state.isDirty, onCancel, onConfirmOpen])

  const handleConfirmDiscard = useCallback(() => {
    onConfirmClose()
    onCancel()
  }, [onCancel, onConfirmClose])

  // Handle navigation blocker
  useEffect(() => {
    if (blocker.state === 'blocked') {
      onConfirmOpen()
    }
  }, [blocker.state, onConfirmOpen])

  const handleConfirmNavigation = useCallback(() => {
    onConfirmClose()
    if (blocker.state === 'blocked') {
      blocker.proceed()
    }
  }, [blocker, onConfirmClose])

  const handleCancelNavigation = useCallback(() => {
    onConfirmClose()
    if (blocker.state === 'blocked') {
      blocker.reset()
    }
  }, [blocker, onConfirmClose])

  return (
    <Flex direction="column" h="full">
      {/* Header */}
      <Box borderBottomWidth="1px" borderColor="border.default" p={4}>
        <Flex
          direction={{ base: 'column', md: 'row' }}
          gap={4}
          align={{ md: 'flex-end' }}
        >
          <FormControl flex={1}>
            <FormLabel fontSize="sm">Schema Name</FormLabel>
            <Input
              value={state.name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Company Onboarding"
              size="md"
            />
          </FormControl>
          <HStack spacing={3}>
            <Button variant="ghost" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={onSave}
              isLoading={isSaving}
              isDisabled={!canSave}
            >
              {saveLabel}
            </Button>
          </HStack>
        </Flex>
      </Box>

      {/* Three-panel layout */}
      <Flex flex={1} overflow="hidden">
        {/* Left panel - Field palette */}
        <Box
          w="200px"
          borderRightWidth="1px"
          borderColor="border.default"
          p={4}
          display={{ base: 'none', md: 'block' }}
          overflowY="auto"
        >
          <FieldTypePalette />
        </Box>

        {/* Center panel - Field canvas */}
        <Box flex={1} p={4} overflowY="auto">
          <FieldCanvas />

          {/* Mobile: Add field buttons inline */}
          <Box display={{ base: 'block', md: 'none' }} mt={4}>
            <Divider mb={4} />
            <FieldTypePalette />
          </Box>

          <Divider my={4} />
          <SchemaJsonPreview />
        </Box>

        {/* Right panel - Field properties (desktop) */}
        {!isMobile && (
          <Box
            w="320px"
            borderLeftWidth="1px"
            borderColor="border.default"
            bg="bg.subtle"
            overflowY="auto"
          >
            <FieldPropertiesPanel />
          </Box>
        )}

        {/* Mobile: Properties drawer trigger */}
        {isMobile && selectedField && (
          <IconButton
            aria-label="Edit field properties"
            icon={<HiOutlineCog />}
            position="fixed"
            bottom={4}
            right={4}
            size="lg"
            borderRadius="full"
            variant="primary"
            shadow="lg"
            onClick={onOpen}
          />
        )}

        {/* Mobile: Properties drawer */}
        <Drawer isOpen={isOpen} placement="bottom" onClose={onClose} size="md">
          <DrawerOverlay />
          <DrawerContent borderTopRadius="xl" maxH="80vh">
            <DrawerCloseButton />
            <DrawerHeader>Field Properties</DrawerHeader>
            <DrawerBody>
              <FieldPropertiesPanel />
            </DrawerBody>
          </DrawerContent>
        </Drawer>
      </Flex>

      {/* Unsaved changes confirmation */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={blocker.state === 'blocked' ? handleCancelNavigation : onConfirmClose}
        onConfirm={blocker.state === 'blocked' ? handleConfirmNavigation : handleConfirmDiscard}
        title="Discard changes?"
        message="You have unsaved changes. Are you sure you want to leave? Your changes will be lost."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        isDestructive
      />
    </Flex>
  )
}
