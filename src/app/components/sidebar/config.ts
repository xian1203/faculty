import {
  BarChart3,
  Contact,
  CreditCard,
  FileText,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
} from 'lucide-react';
import type { UserRole } from '@/firebase/types';
import type { NavigationGroup, NavigationItem } from './types';

const NDKC_LOGO =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAs3D30YkWV02CV2vEbvjH3BYeh264_XgDw9oOjRI3m1339sUDpWGdVH4Z6vXZNlQGAvCQ9GujY1YBzjgsqVHcyplH8xriY5EJEVUrebGw_EtTPEClTsdQT_XJykfyDcX0LGlbgRGqmN3GizG50AO0qXCp1hbzpsYfO2sW4MlbW1Ou4WevWNnex2ANlpMhnGzJCB_-1wRuhf8I6Jhf_AT2oijHbrc62-HJaJloDg3y8flDfUEAY1CBdxAQzlgzoXuYvVTkhYd65iuU3';

export const SIDEBAR_BRAND = {
  title: 'admin',
  subtitle: 'Management Console',
  logoSrc: NDKC_LOGO,
  logoAlt: 'NDKC Logo',
} as const;

export const navigationGroups: NavigationGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        href: '/',
        icon: LayoutDashboard,
        exact: true,
      },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    items: [
      {
        id: 'products',
        label: 'Products',
        href: '/products',
        icon: Package,
      },
      {
        id: 'transactions',
        label: 'Transactions',
        href: '/transactions',
        icon: Receipt,
      },
      {
        id: 'user-accounts',
        label: 'User Accounts',
        href: '/user-accounts',
        icon: Contact,
      },
      {
        id: 'debt',
        label: 'Debt Management',
        href: '/debt',
        icon: FileText,
      },
      {
        id: 'payments',
        label: 'Payments',
        href: '/payments',
        icon: CreditCard,
      },
    ],
  },
  {
    id: 'insights',
    label: 'Insights',
    items: [
      {
        id: 'analytics',
        label: 'Analytics',
        href: '/analytics',
        icon: BarChart3,
      },
    ],
  },
  {
    id: 'system',
    label: 'System',
    items: [
      {
        id: 'settings',
        label: 'Settings',
        href: '/settings',
        icon: Settings,
      },
    ],
  },
];

/**
 * Returns navigation groups filtered by the user's role.
 * Items without a `roles` array remain visible to all authenticated users.
 */
export function filterNavigationByRole(
  groups: NavigationGroup[],
  role: UserRole | undefined
): NavigationGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.roles || (role !== undefined && item.roles.includes(role))
      ),
    }))
    .filter((group) => group.items.length > 0);
}

/** Flat list of all navigation items (useful for breadcrumbs, search, etc.) */
export function getFlatNavigationItems(
  groups: NavigationGroup[] = navigationGroups
): NavigationItem[] {
  return groups.flatMap((group) => group.items);
}
