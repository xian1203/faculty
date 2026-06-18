import { cn } from './ui/utils';
import { NavLink, Outlet, useLocation } from 'react-router';

const settingsNav = [
  { id: 'dashboard', icon: 'dashboard', label: 'Dashboard', group: null },
  { id: 'profile', icon: 'person', label: 'Admin Profile', group: 'Store Control' },
  { id: 'users', icon: 'group_add', label: 'User Roles', group: null },
  { id: 'honesty', icon: 'account_balance_wallet', label: 'Honesty System', group: null, filled: true },
  { id: 'rfid', icon: 'contactless', label: 'RFID Settings', group: null },
  { id: 'inventory', icon: 'inventory_2', label: 'Inventory Config', group: null },
  { id: 'pos', icon: 'point_of_sale', label: 'POS Settings', group: null },
  { id: 'notifications', icon: 'notifications', label: 'Notifications', group: 'System Maintenance' },
  { id: 'preferences', icon: 'settings', label: 'Preferences', group: null },
  { id: 'security', icon: 'security', label: 'Security & Audit', group: null },
  { id: 'backup', icon: 'backup', label: 'Data Backup', group: null },
];

export function SettingsPage() {
  const location = useLocation();

  return (
    <div className="flex flex-1 overflow-hidden h-[calc(100vh-64px)]">
      {/* Settings Sidebar */}
      <aside className="w-[260px] shrink-0 bg-muted/30 border-r border-border flex flex-col py-6 overflow-y-auto custom-scrollbar">
        <nav className="flex-1 px-2 space-y-1">
          {settingsNav.map((item) => {
            const isActive = location.pathname.includes(`/settings/${item.id}`) || (item.id === 'dashboard' && location.pathname === '/settings');
            
            return (
              <div key={item.id}>
                {item.group && (
                  <p className="pt-4 pb-2 px-4 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                    {item.group}
                  </p>
                )}
                <NavLink
                  to={`/settings/${item.id}`}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 w-full text-left text-sm font-medium group',
                    isActive
                      ? 'bg-primary/10 border-r-4 border-primary text-primary font-bold'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground hover:translate-x-0.5'
                  )}
                >
                  <span
                    className="material-symbols-outlined"
                    style={isActive && item.filled
                      ? { fontVariationSettings: "'FILL' 1" }
                      : undefined}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </NavLink>
              </div>
            );
          })}
        </nav>

        <div className="mt-auto px-4 pt-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
              AD
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate">Admin User</p>
              <p className="text-[10px] text-muted-foreground truncate">Master Administrator</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto p-8 bg-background custom-scrollbar">
        <div className="max-w-5xl mx-auto pb-20">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
