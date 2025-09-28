import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { useToast } from '@/app/hooks/use-toast';
import { Layers, LogOut, Settings, User2 } from 'lucide-react';

import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface HeaderProps {
  user?: User | null;
}

export default function Header({ user: userProp }: HeaderProps = {}) {
  const context = useAuth();
  const user = userProp ?? context.user;
  const pathname = usePathname();
  const { toast } = useToast();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast({
        title: 'Signed out successfully',
        description: 'You have been signed out of LayOut.',
      });
    } catch (error: unknown) {
      toast({
        title: 'Error signing out',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSigningOut(false);
    }
  };

  const isOnPlansPage = pathname?.startsWith('/plans');
  const isOnEditorPage = pathname?.includes('/editor');

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md supports-backdrop-blur:bg-background/80 shadow-sm">
      <div className="container flex h-16 items-center justify-between px-6">
        <div className="flex items-center space-x-6">
          <Link
            href="/"
            className="flex items-center space-x-3 text-2xl font-bold text-foreground hover:text-primary transition-colors group"
          >
            <div className="relative">
              <Layers className="h-8 w-8 text-primary group-hover:scale-110 transition-transform" />
              <div className="absolute -inset-1 bg-primary/10 rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
            <span className="tracking-tight">LayOut</span>
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium">{user.email}</p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer">
                  <User2 className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {isSigningOut ? 'Signing out...' : 'Sign out'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild>
              <Link href="/auth">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
