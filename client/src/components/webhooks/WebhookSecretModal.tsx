import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CopyButton } from '@/components/common'

interface WebhookSecretModalProps {
  isOpen: boolean
  onClose: () => void
  secret: string
}

export function WebhookSecretModal({ isOpen, onClose, secret }: WebhookSecretModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Webhook Created</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <Alert variant="destructive" className="border-amber-500 bg-amber-50 dark:bg-amber-950/30">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            <AlertTitle className="text-amber-800 dark:text-amber-400">
              Save your signing secret
            </AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              This secret will only be shown once. Use it to verify webhook signatures.
            </AlertDescription>
          </Alert>

          <div className="bg-muted rounded-md p-3 border">
            <div className="flex items-center justify-between gap-2">
              <code className="text-sm font-mono break-all flex-1">
                {secret}
              </code>
              <CopyButton value={secret} label="Copy secret" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
