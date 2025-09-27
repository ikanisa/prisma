import { Bell, Search, Settings, User, LogOut, Command, Menu } from "lucide-react";
import { Button } from "@/components/enhanced-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OrganizationSwitcher } from "@/components/organization-switcher";
import { useAuth } from "@/hooks/use-auth";
import { useOrganizations } from "@/hooks/use-organizations";
import { useNavigate } from "react-router-dom";

interface HeaderProps {
  onOpenCommandPalette?: () => void;
  onToggleSidebar?: () => void;
}

export function Header({ onOpenCommandPalette, onToggleSidebar }: HeaderProps) {
  const { user, signOut } = useAuth();
  const { isSystemAdmin } = useOrganizations();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/auth/sign-in');
  };

  const handleSystemAdmin = () => {
    navigate('/admin/system');
  };

  return (
    <header className="h-16 bg-card/50 backdrop-blur-sm border-b border-border/50 flex items-center px-6 gap-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleSidebar}
        className="h-7 w-7"
      >
        <Menu className="h-4 w-4" />
        <span className="sr-only">Toggle sidebar</span>
      </Button>
      
      {/* Organization Switcher */}
      <OrganizationSwitcher />
      
      {/* Search / Command Palette */}
      <div className="flex-1 max-w-md mx-4">
        <Button
          variant="ghost"
          onClick={onOpenCommandPalette}
          className="w-full justify-start bg-muted/50 hover:bg-muted border border-border"
        >
          <Search className="w-4 h-4 mr-2 text-muted-foreground" />
          <span className="text-muted-foreground">Search clients, engagements, tasks...</span>
          <div className="ml-auto flex items-center gap-1">
            <kbd className="pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 hidden sm:inline-flex">
              <Command className="h-3 w-3" />K
            </kbd>
          </div>
        </Button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon">
          <Bell className="w-4 h-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback>
                  {user?.user_metadata?.name 
                    ? user.user_metadata.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
                    : user?.email?.substring(0, 2).toUpperCase()
                  }
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="p-2">
              <p className="font-medium">{user?.user_metadata?.name || 'User'}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/aurora/settings')}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/aurora/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            {isSystemAdmin() && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSystemAdmin}>
                  <Settings className="mr-2 h-4 w-4" />
                  System Admin
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
