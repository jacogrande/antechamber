import { useState } from 'react'
import {
  Tr,
  Td,
  Text,
  HStack,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Collapse,
  Box,
} from '@chakra-ui/react'
import {
  HiOutlineDotsVertical,
  HiOutlineTrash,
  HiOutlineChevronDown,
  HiOutlineChevronRight,
} from 'react-icons/hi'
import type { Webhook } from '@/types/webhook'
import { WebhookStatusBadge } from './WebhookStatusBadge'
import { WebhookEventBadge } from './WebhookEventBadge'
import { WebhookDeliveryLog } from './WebhookDeliveryLog'

interface WebhookRowProps {
  webhook: Webhook
  onDelete: (webhook: Webhook) => void
}

export function WebhookRow({ webhook, onDelete }: WebhookRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const truncateUrl = (url: string, maxLength = 40): string => {
    if (url.length <= maxLength) return url
    return url.substring(0, maxLength) + '...'
  }

  return (
    <>
      <Tr
        _hover={{ bg: 'bg.subtle' }}
        cursor="pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Td>
          <HStack spacing={2}>
            <IconButton
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
              icon={isExpanded ? <HiOutlineChevronDown /> : <HiOutlineChevronRight />}
              size="xs"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                setIsExpanded(!isExpanded)
              }}
            />
            <Text
              fontFamily="mono"
              fontSize="sm"
              title={webhook.endpointUrl}
              isTruncated
              maxW="300px"
            >
              {truncateUrl(webhook.endpointUrl)}
            </Text>
          </HStack>
        </Td>
        <Td>
          <HStack spacing={1} flexWrap="wrap">
            {webhook.events.map((event) => (
              <WebhookEventBadge key={event} event={event} />
            ))}
          </HStack>
        </Td>
        <Td>
          <WebhookStatusBadge isActive={webhook.isActive} />
        </Td>
        <Td>
          <Menu>
            <MenuButton
              as={IconButton}
              aria-label="Actions"
              icon={<HiOutlineDotsVertical />}
              size="sm"
              variant="ghost"
              onClick={(e) => e.stopPropagation()}
            />
            <MenuList>
              <MenuItem
                icon={<HiOutlineTrash />}
                color="status.error"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(webhook)
                }}
              >
                Delete
              </MenuItem>
            </MenuList>
          </Menu>
        </Td>
      </Tr>
      <Tr>
        <Td colSpan={4} p={0} borderBottom={isExpanded ? undefined : 'none'}>
          <Collapse in={isExpanded} animateOpacity>
            <Box bg="bg.subtle" p={4} borderTop="1px solid" borderColor="border.default">
              <Text fontWeight="medium" mb={3} fontSize="sm">
                Delivery History
              </Text>
              <WebhookDeliveryLog webhookId={webhook.id} />
            </Box>
          </Collapse>
        </Td>
      </Tr>
    </>
  )
}
