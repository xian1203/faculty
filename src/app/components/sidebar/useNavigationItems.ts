import { useMemo } from 'react';
import { useCurrentUser } from '@/contexts/UserContext';
import { filterNavigationByRole, navigationGroups } from './config';
import type { NavigationGroup } from './types';

export function useNavigationItems(): { groups: NavigationGroup[] } {
  const { currentUser } = useCurrentUser();
  const role = currentUser?.role;

  const groups = useMemo(
    () => filterNavigationByRole(navigationGroups, role),
    [role]
  );

  return { groups };
}
