import {
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Box,
  Code,
  IconButton,
  HStack,
  useClipboard,
  useToast,
} from '@chakra-ui/react'
import { HiOutlineClipboardCopy } from 'react-icons/hi'
import { useSchemaBuilderContext } from './SchemaBuilderProvider'

export function SchemaJsonPreview() {
  const { state } = useSchemaBuilderContext()
  const json = JSON.stringify(state.fields, null, 2)
  const { onCopy } = useClipboard(json)
  const toast = useToast()

  const handleCopy = () => {
    onCopy()
    toast({
      title: 'Copied to clipboard',
      status: 'success',
      duration: 2000,
      isClosable: true,
    })
  }

  return (
    <Accordion allowToggle>
      <AccordionItem border="none">
        <HStack>
          <AccordionButton flex={1} px={0}>
            <Box flex={1} textAlign="left" fontSize="sm" fontWeight="medium">
              JSON Preview
            </Box>
            <AccordionIcon />
          </AccordionButton>
          <IconButton
            aria-label="Copy JSON"
            icon={<HiOutlineClipboardCopy />}
            size="sm"
            variant="ghost"
            onClick={handleCopy}
          />
        </HStack>
        <AccordionPanel px={0} pb={4}>
          <Box
            as="pre"
            p={4}
            bg="bg.subtle"
            borderRadius="md"
            fontSize="xs"
            fontFamily="mono"
            overflowX="auto"
            maxH="300px"
            overflowY="auto"
          >
            <Code bg="transparent" whiteSpace="pre">
              {json}
            </Code>
          </Box>
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  )
}
