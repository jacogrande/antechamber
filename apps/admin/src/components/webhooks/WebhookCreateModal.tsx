import { useState } from 'react'
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  FormHelperText,
  FormErrorMessage,
  Input,
  Checkbox,
  VStack,
  Text,
} from '@chakra-ui/react'
import type { CreateWebhookInput, WebhookEventType } from '@/types/webhook'

interface WebhookCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (input: CreateWebhookInput) => void
  isLoading?: boolean
}

const AVAILABLE_EVENTS: { value: WebhookEventType; label: string; description: string }[] = [
  {
    value: 'submission.confirmed',
    label: 'submission.confirmed',
    description: 'Triggered when a submission is confirmed',
  },
]

export function WebhookCreateModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}: WebhookCreateModalProps) {
  const [endpointUrl, setEndpointUrl] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<WebhookEventType[]>(['submission.confirmed'])
  const [urlError, setUrlError] = useState<string | null>(null)

  const validateUrl = (url: string): boolean => {
    if (!url) {
      setUrlError('Endpoint URL is required')
      return false
    }
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'https:') {
        setUrlError('URL must use HTTPS')
        return false
      }
      setUrlError(null)
      return true
    } catch {
      setUrlError('Please enter a valid URL')
      return false
    }
  }

  const handleSubmit = () => {
    if (!validateUrl(endpointUrl)) return
    if (selectedEvents.length === 0) return

    onSubmit({
      endpointUrl,
      events: selectedEvents,
    })
  }

  const handleClose = () => {
    setEndpointUrl('')
    setSelectedEvents(['submission.confirmed'])
    setUrlError(null)
    onClose()
  }

  const toggleEvent = (event: WebhookEventType) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Add Webhook</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={5} align="stretch">
            <FormControl isRequired isInvalid={!!urlError}>
              <FormLabel>Endpoint URL</FormLabel>
              <Input
                placeholder="https://"
                value={endpointUrl}
                onChange={(e) => {
                  setEndpointUrl(e.target.value)
                  if (urlError) validateUrl(e.target.value)
                }}
                onBlur={() => endpointUrl && validateUrl(endpointUrl)}
              />
              {urlError ? (
                <FormErrorMessage>{urlError}</FormErrorMessage>
              ) : (
                <FormHelperText>Must be HTTPS</FormHelperText>
              )}
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Events</FormLabel>
              <VStack align="stretch" spacing={2}>
                {AVAILABLE_EVENTS.map((event) => (
                  <Checkbox
                    key={event.value}
                    isChecked={selectedEvents.includes(event.value)}
                    onChange={() => toggleEvent(event.value)}
                  >
                    <VStack align="start" spacing={0}>
                      <Text fontFamily="mono" fontSize="sm">
                        {event.label}
                      </Text>
                      <Text fontSize="xs" color="text.muted">
                        {event.description}
                      </Text>
                    </VStack>
                  </Checkbox>
                ))}
              </VStack>
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter gap={3}>
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={isLoading}
            isDisabled={!endpointUrl || selectedEvents.length === 0}
          >
            Add Webhook
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
