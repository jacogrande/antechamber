import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  VStack,
  Text,
  HStack,
  Box,
  Code,
  Alert,
  AlertIcon,
} from '@chakra-ui/react'
import { HiOutlineExclamation } from 'react-icons/hi'
import { CopyButton } from '@/components/common'

interface WebhookSecretModalProps {
  isOpen: boolean
  onClose: () => void
  secret: string
}

export function WebhookSecretModal({ isOpen, onClose, secret }: WebhookSecretModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" closeOnOverlayClick={false}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Webhook Created</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Alert status="warning" variant="left-accent">
              <AlertIcon as={HiOutlineExclamation} />
              <Text fontSize="sm">
                <strong>Save your signing secret</strong>
                <br />
                This secret will only be shown once. Use it to verify webhook signatures.
              </Text>
            </Alert>

            <Box
              bg="bg.subtle"
              borderRadius="md"
              p={3}
              border="1px solid"
              borderColor="border.default"
            >
              <HStack justify="space-between" align="center">
                <Code
                  bg="transparent"
                  fontSize="sm"
                  fontFamily="mono"
                  wordBreak="break-all"
                  flex={1}
                >
                  {secret}
                </Code>
                <CopyButton value={secret} label="Copy secret" />
              </HStack>
            </Box>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
