import type { LucideIcon } from 'lucide-react';
import type { UserRole } from '@/firebase/types';

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Match only the exact path (e.g. dashboard at `/`) */
  exact?: boolean;
  /** Restrict visibility to specific roles. Omit to show for all authenticated users. */
  roles?: UserRole[];
  /** Optional badge text (e.g. "New") */
  badge?: string;
}

export interface NavigationGroup {
  id: string;
  label: string;
  items: NavigationItem[];
}

export interface SidebarItemProps {
  item: NavigationItem;
}

export interface SidebarBrandProps {
  title?: string;
  subtitle?: string;
  logoSrc?: string;
  logoAlt?: string;
}
