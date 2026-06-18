import { LogOut, Plus } from 'lucide-react';
import { useNavigate } from 'react-router';
import { AuthService } from '@/firebase';
import { useCurrentUser } from '@/contexts/UserContext';
import { Button } from '../ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from '../ui/sidebar';
import { SIDEBAR_BRAND } from './config';
import { SidebarItem } from './SidebarItem';
import { useNavigationItems } from './useNavigationItems';

function SidebarBrand() {
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  return (
    <div className="flex items-center gap-3 px-1 py-1">
      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-sidebar-border bg-sidebar-accent/50 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-105">
        <img
          src={SIDEBAR_BRAND.logoSrc}
          alt={SIDEBAR_BRAND.logoAlt}
          className="size-8 object-contain"
        />
      </div>
      {!isCollapsed && (
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-sidebar-primary tracking-tight">
            {SIDEBAR_BRAND.title}
          </p>
          <p className="truncate text-[11px] text-sidebar-foreground/60 font-medium">
            {SIDEBAR_BRAND.subtitle}
          </p>
        </div>
      )}
    </div>
  );
}

function SidebarUserSummary() {
  const { currentUser } = useCurrentUser();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  if (isCollapsed || !currentUser) {
    return null;
  }

  return (
    <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/50 px-3 py-2.5 flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-full bg-sidebar-primary/15 flex items-center justify-center text-sidebar-primary font-bold text-[10px] shrink-0 border border-sidebar-primary/20">
        {currentUser.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-sidebar-foreground">
          {currentUser.name}
        </p>
        <p className="truncate text-[10px] capitalize text-sidebar-foreground/50 font-medium">
          {currentUser.role}
        </p>
      </div>
    </div>
  );
}

function SidebarFooterActions() {
  const navigate = useNavigate();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const handleLogout = async () => {
    try {
      await AuthService.signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const closeMobileSidebar = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <SidebarMenu className="gap-1">
      {isCollapsed ? (
        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip="New Transaction"
            onClick={() => {
              closeMobileSidebar();
              navigate('/transactions');
            }}
            className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <Plus aria-hidden="true" />
            <span>New Transaction</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ) : (
        <SidebarMenuItem className="px-0">
          <Button
            className="h-9 w-full justify-start gap-2 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-95"
            onClick={() => {
              closeMobileSidebar();
              navigate('/transactions');
            }}
          >
            <Plus className="size-4" aria-hidden="true" />
            New Transaction
          </Button>
        </SidebarMenuItem>
      )}

      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip="Sign out"
          onClick={handleLogout}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive transition-all duration-200 active:scale-95"
        >
          <LogOut aria-hidden="true" className="size-4" />
          <span>Sign out</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function AppSidebar() {
  const { groups } = useNavigationItems();
  const { isMobile, setOpenMobile } = useSidebar();

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="gap-3 border-b border-sidebar-border/80 pb-4">
        <SidebarBrand />
        <SidebarUserSummary />
      </SidebarHeader>

      <SidebarContent className="gap-0 py-2" onClick={handleNavClick}>
        {groups.map((group, index) => (
          <div key={group.id}>
            {index > 0 ? <SidebarSeparator className="my-1" /> : null}
            <SidebarGroup>
              <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarItem key={item.id} item={item} />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </div>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/80 pt-2">
        <SidebarFooterActions />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
