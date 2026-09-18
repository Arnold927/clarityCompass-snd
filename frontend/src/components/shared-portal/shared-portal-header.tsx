'use client';

import { useState, useEffect } from 'react';
import { Bell, MessageSquare, Search, User, LogOut, Building, Users, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useSharedPortalAuth } from "@/app/shared-portal/auth-context";
import { useNotifications } from "@/components/shared-portal/notification-provider";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SharedPortalNavigation } from './navigation';

interface SharedPortalHeaderProps {
  onNavigate: () => void;
}


export function SharedPortalHeader() {
  const { user, logout, isAuthenticated } = useSharedPortalAuth();
  const { notifications, unreadCount } = useNotifications();
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!isAuthenticated || !user) {
    return null;
  }

  const getUserOrganization = () => {
    switch(user.role) {
      case 'ngo_user':
        return user.ngo_name || user.ngoName || 'NGO User';
      case 'donor_reviewer':
        return user.organization_name || user.organizationName || 'Donor Reviewer';
      case 'oversight_body':
        return user.organization_name || user.organizationName || 'Oversight Body';
      case 'admin':
        return 'Administrator';
      default:
        return 'Organization';
    }
  };

  const getUserRole = () => {
    const role = user.role || '';
    return role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/shared-portal/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <header 
      className={cn(
        "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-200",
        isScrolled && "shadow-sm"
      )}
    >
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Left section: Logo & Mobile menu */}
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <SheetHeader className="p-6 border-b">
                <SheetTitle className="flex items-center gap-2">
                  <Users className="h-6 w-6 text-primary" />
                  <span className="text-xl font-bold">Shared Portal</span>
                </SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-8rem)]">
                <div className="p-4">
                  <SharedPortalNavigation onNavigate={() => setMobileMenuOpen(false)} />
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link href="/shared-portal/dashboard" className="flex items-center gap-2">
            <div className="flex items-center justify-center rounded-full shrink-0" style={{width:32,height:32,backgroundColor:"#E8631A"}}>
              <svg viewBox="0 0 24 24" style={{width:18,height:18}} fill="white">
                <path d="M12 3C8 3 5 7 6 11C4 11 3 12.5 3 14C3 15.5 4 17 6 17L18 17C20 17 21 15.5 21 14C21 12.5 20 11 18 11C19 7 16 3 12 3Z"/>
                <rect x="11" y="17" width="2" height="5"/>
              </svg>
            </div>
            <span className="font-bold hidden sm:inline" style={{color:"#3D1A08",fontFamily:"'Lora',serif",fontSize:"1rem"}}>SND Shared Portal</span>
            <span className="font-bold sm:hidden" style={{color:"#3D1A08",fontFamily:"'Lora',serif",fontSize:"1rem"}}>SND</span>
          </Link>
          
          {/* User badge - desktop only */}
          <div className="hidden md:flex items-center">
            <Badge variant="outline" className="ml-2 text-xs" style={{borderColor:"#C8793A",color:"#C8793A"}}>
              {user.role === 'ngo_user' ? 'NGO' : user.role === 'donor_reviewer' ? 'Donor' : 'Oversight'}
            </Badge>
          </div>
        </div>

        {/* Center section: Search (desktop only) */}
        <div className="hidden lg:flex flex-1 max-w-2xl mx-8">
          <form onSubmit={handleSearch} className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search proposals, reports, messages..."
              className="pl-9 pr-4 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </form>
        </div>

        {/* Right section: Actions & User menu */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Mobile search button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden"
            asChild
          >
            <Link href="/shared-portal/search">
              <Search className="h-5 w-5" />
            </Link>
          </Button>

          {/* Messages */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <MessageSquare className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Messages</span>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {unreadCount} new
                  </Badge>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <ScrollArea className="h-64">
                <div className="p-1">
                  {notifications.slice(0, 5).map((notification) => (
                    <DropdownMenuItem key={notification.id} asChild className="cursor-pointer">
                      <Link 
                        href={notification.link} 
                        className="w-full p-2 rounded hover:bg-accent"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="w-full space-y-1">
                          <div className="flex items-start justify-between">
                            <p className="font-medium text-sm truncate">{notification.title}</p>
                            {!notification.is_read && (
                              <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {notification.message}
                          </p>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </div>
              </ScrollArea>
              {notifications.length === 0 && (
                <div className="p-4 text-center text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No messages</p>
                </div>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/shared-portal/messages" className="w-full justify-center text-sm">
                  View All Messages
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative" asChild>
            <Link href="/shared-portal/notifications">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          </Button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2 sm:px-3">
                <div className="hidden sm:flex items-center gap-2">
                  {user.role === 'ngo_user' ? (
                    <Building className="h-5 w-5" />
                  ) : (
                    <Users className="h-5 w-5" />
                  )}
                  <div className="text-left hidden lg:block">
                    <p className="text-sm font-medium truncate max-w-[120px]">
                      {user.firstName || getUserOrganization()}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {getUserRole()}
                    </p>
                  </div>
                </div>
                <div className="sm:hidden">
                  <User className="h-5 w-5" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {getUserOrganization()}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground capitalize">
                    {getUserRole()}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/shared-portal/profile">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/shared-portal/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}