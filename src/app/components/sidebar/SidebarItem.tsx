import { NavLink, useLocation } from 'react-router';
import {
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from '../ui/sidebar';
import type { SidebarItemProps } from './types';

function isItemActive(
  pathname: string,
  href: string,
  exact?: boolean
): boolean {
  if (exact || href === '/') {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarItem({ item }: SidebarItemProps) {
  const { pathname } = useLocation();
  const Icon = item.icon;
  const isActive = isItemActive(pathname, item.href, item.exact);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
        <NavLink
          to={item.href}
          end={item.exact ?? item.href === '/'}
          aria-current={isActive ? 'page' : undefined}
          className="transition-all duration-200 hover:translate-x-0.5"
        >
          <Icon aria-hidden="true" className="transition-transform duration-200 group-hover:scale-110" />
          <span>{item.label}</span>
        </NavLink>
      </SidebarMenuButton>
      {item.badge ? (
        <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
      ) : null}
    </SidebarMenuItem>
  );
}
