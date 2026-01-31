import { useState } from 'react'
import { MoreVertical, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TableCell, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
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
      <TableRow
        className="cursor-pointer hover:bg-muted/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <TableCell>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation()
                setIsExpanded(!isExpanded)
              }}
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
            <span
              className="font-mono text-sm truncate max-w-[300px]"
              title={webhook.endpointUrl}
            >
              {truncateUrl(webhook.endpointUrl)}
            </span>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex flex-wrap gap-1">
            {webhook.events.map((event) => (
              <WebhookEventBadge key={event} event={event} />
            ))}
          </div>
        </TableCell>
        <TableCell>
          <WebhookStatusBadge isActive={webhook.isActive} />
        </TableCell>
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => e.stopPropagation()}
                aria-label="Actions"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(webhook)
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
      <TableRow className={cn(!isExpanded && 'border-b-0')}>
        <TableCell colSpan={4} className="p-0">
          <div
            className={cn(
              'grid transition-all duration-200 ease-out',
              isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            )}
          >
            <div className="overflow-hidden">
              <div className="bg-muted p-4 border-t">
                <p className="font-medium text-sm mb-3">Delivery History</p>
                <WebhookDeliveryLog webhookId={webhook.id} />
              </div>
            </div>
          </div>
        </TableCell>
      </TableRow>
    </>
  )
}
