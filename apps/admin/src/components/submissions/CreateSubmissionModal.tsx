import { useState } from 'react'
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  Select,
  VStack,
  Alert,
  AlertIcon,
  useToast,
} from '@chakra-ui/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSchemas } from '@/hooks/useSchemas'
import { useCreateSubmission } from '@/hooks/useSubmissions'
import type { Schema } from '@/types/schema'

const createSubmissionSchema = z.object({
  schemaId: z.string().uuid('Please select a schema'),
  websiteUrl: z.string().url('Please enter a valid URL'),
})

type CreateSubmissionForm = z.infer<typeof createSubmissionSchema>

interface CreateSubmissionModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateSubmissionModal({ isOpen, onClose }: CreateSubmissionModalProps) {
  const toast = useToast()
  const { data: schemasData, isLoading: schemasLoading } = useSchemas()
  const createMutation = useCreateSubmission()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateSubmissionForm>({
    resolver: zodResolver(createSubmissionSchema),
    defaultValues: {
      schemaId: '',
      websiteUrl: '',
    },
  })

  const onSubmit = async (data: CreateSubmissionForm) => {
    setError(null)
    try {
      await createMutation.mutateAsync(data)
      toast({
        title: 'Submission created',
        description: 'The website will be crawled and data extracted.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      })
      reset()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create submission')
    }
  }

  const handleClose = () => {
    reset()
    setError(null)
    onClose()
  }

  const schemas: Schema[] = schemasData ?? []

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>New Submission</ModalHeader>
        <ModalCloseButton />
        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
          <ModalBody>
            <VStack spacing={4}>
              {error && (
                <Alert status="error" borderRadius="lg">
                  <AlertIcon />
                  {error}
                </Alert>
              )}

              <FormControl isInvalid={!!errors.schemaId}>
                <FormLabel>Schema</FormLabel>
                <Select
                  placeholder="Select a schema"
                  {...register('schemaId')}
                  isDisabled={schemasLoading}
                >
                  {schemas.map((schema) => (
                    <option key={schema.id} value={schema.id}>
                      {schema.name}
                    </option>
                  ))}
                </Select>
                <FormErrorMessage>{errors.schemaId?.message}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.websiteUrl}>
                <FormLabel>Website URL</FormLabel>
                <Input
                  type="url"
                  placeholder="https://example.com"
                  {...register('websiteUrl')}
                />
                <FormErrorMessage>{errors.websiteUrl?.message}</FormErrorMessage>
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting || createMutation.isPending}
            >
              Create Submission
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}
