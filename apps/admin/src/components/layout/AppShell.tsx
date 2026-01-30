import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { CommandPaletteProvider } from '@/components/command-palette'
import { useDisclosure } from '@/hooks/useDisclosure'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

export function AppShell() {
  const { isOpen, onOpen, onClose } = useDisclosure()

  return (
    <CommandPaletteProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Desktop sidebar */}
        <div className="hidden md:block w-64 flex-shrink-0 relative">
          <Sidebar />
        </div>

        {/* Mobile sidebar sheet */}
        <Sheet open={isOpen} onOpenChange={(open) => (open ? onOpen() : onClose())}>
          <SheetContent side="left" className="w-64 p-0">
            <Sidebar onClose={onClose} />
          </SheetContent>
        </Sheet>

        {/* Main content area */}
        <div className="flex flex-1 flex-col overflow-hidden relative">
          <Header onMenuClick={onOpen} />
          <main
            className={cn(
              'flex-1 overflow-auto bg-background p-4 md:p-6',
              'relative'
            )}
          >
            <div className="mx-auto max-w-[1400px]">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </CommandPaletteProvider>
  )
}
