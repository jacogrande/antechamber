import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Webhook</DialogTitle>
          <DialogDescription>
            Configure a webhook endpoint to receive event notifications.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-4">
          <div className="space-y-2">
            <Label htmlFor="endpoint-url">
              Endpoint URL <span className="text-destructive">*</span>
            </Label>
            <Input
              id="endpoint-url"
              placeholder="https://"
              value={endpointUrl}
              onChange={(e) => {
                setEndpointUrl(e.target.value)
                if (urlError) validateUrl(e.target.value)
              }}
              onBlur={() => endpointUrl && validateUrl(endpointUrl)}
              className={urlError ? 'border-destructive' : ''}
            />
            {urlError ? (
              <p className="text-sm text-destructive">{urlError}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Must be HTTPS</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>
              Events <span className="text-destructive">*</span>
            </Label>
            <div className="flex flex-col gap-2">
              {AVAILABLE_EVENTS.map((event) => (
                <div key={event.value} className="flex items-start gap-3">
                  <Checkbox
                    id={`event-${event.value}`}
                    checked={selectedEvents.includes(event.value)}
                    onCheckedChange={() => toggleEvent(event.value)}
                  />
                  <div className="flex flex-col">
                    <Label
                      htmlFor={`event-${event.value}`}
                      className="font-mono text-sm cursor-pointer"
                    >
                      {event.label}
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {event.description}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!endpointUrl || selectedEvents.length === 0 || isLoading}
            isLoading={isLoading}
          >
            Add Webhook
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
