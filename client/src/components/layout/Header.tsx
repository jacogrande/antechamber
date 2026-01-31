import { useNavigate } from 'react-router-dom'
import { useTheme } from '@/components/theme-provider'
import { useAuth } from '@/hooks/useAuth'
import { useCommandPalette } from '@/components/command-palette'
import { Menu, Moon, Sun, Settings, LogOut, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import {
  Avatar,
  AvatarFallback,
} from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const { open: openCommandPalette } = useCommandPalette()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const getInitials = (email: string | undefined) => {
    if (!email) return 'U'
    const name = email.split('@')[0]
    return name.charAt(0).toUpperCase()
  }

  const toggleColorMode = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-4">
      <div className="flex items-center gap-2">
        {onMenuClick && (
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onMenuClick}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Command palette trigger - Desktop */}
        <Button
          variant="ghost"
          size="sm"
          onClick={openCommandPalette}
          className="hidden md:flex items-center gap-2 px-3 text-muted-foreground font-normal"
        >
          <Search className="h-4 w-4" />
          <span className="text-sm">Search...</span>
          <div className="ml-2">
            <Kbd keys={['mod', 'K']} />
          </div>
        </Button>

        {/* Mobile search button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={openCommandPalette}
          className="md:hidden"
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </Button>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleColorMode}
          aria-label="Toggle color mode"
        >
          {theme === 'light' ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 w-9 rounded-lg p-0">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                  {getInitials(user?.email)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <div className="px-2 py-2">
              <p className="text-sm font-medium">
                {user?.email?.split('@')[0]}
              </p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => void handleSignOut()}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
