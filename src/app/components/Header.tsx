import { Input } from './ui/input';
import { SidebarTrigger } from './ui/sidebar';
import { Badge } from './ui/badge';
import { useLocation, useNavigate } from 'react-router';
import { useCurrentUser } from '../../contexts/UserContext';
import { AuthService } from '../../firebase';
import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useCurrentUser();
  const path = location.pathname;
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationCount] = useState(3);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    try {
      await AuthService.signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getPlaceholder = () => {
    if (path.includes('user-accounts')) return 'Search accounts, RFID UIDs...';
    if (path.includes('products')) return 'Search product name, category, or RFID SKU...';
    if (path.includes('settings')) return 'Search settings...';
    return 'Search transactions, users, or SKUs...';
  };

  const isSettings = path.includes('settings');
  const showLiveReader = path.includes('user-accounts');

  // Close dropdowns on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowProfileMenu(false);
        setShowNotifications(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border px-6 py-3 flex justify-between items-center shadow-sm transition-shadow duration-300">
      <div className="flex items-center gap-4 flex-1">
        <SidebarTrigger className="-ml-1 transition-transform duration-200 hover:scale-105 active:scale-95" />
        {isSettings && (
          <div className="flex items-center gap-3 hidden lg:flex">
            <h2 className="text-lg font-semibold text-primary">Admin Console / Settings</h2>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 pulse-active" />
              <span className="text-xs text-muted-foreground">RFID Hub Active</span>
            </div>
          </div>
        )}
        <div className={`relative w-full focus-within:ring-2 focus-within:ring-primary/40 rounded-xl overflow-hidden transition-all duration-300 ${isSettings ? 'max-w-[260px]' : 'max-w-md'}`}>
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors" aria-hidden="true" />
          <Input
            className="w-full bg-muted/50 border-none pl-11 pr-4 py-2 focus:ring-0 transition-all duration-300 hover:bg-muted/70"
            placeholder={getPlaceholder()}
            type="text"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        {showLiveReader ? (
          <div className="flex items-center gap-2 mr-1 bg-amber-500/10 dark:bg-amber-500/20 px-3 py-1.5 rounded-full border border-amber-500/30 transition-all hover:bg-amber-500/15">
            <span className="w-2 h-2 rounded-full bg-amber-500 pulse-active"></span>
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Live Reader Active</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 mr-1 bg-muted px-3 py-1.5 rounded-full transition-all hover:bg-muted/80">
            <span className="w-2 h-2 rounded-full bg-green-500 pulse-active"></span>
            <span className="text-xs font-medium text-muted-foreground">RFID Live</span>
          </div>
        )}

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
            className="relative rounded-full p-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30 active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            {notificationCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 bg-destructive text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-card">
                {notificationCount}
              </span>
            )}
          </button>
          {showNotifications && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
              <div className="absolute right-0 top-12 z-50 w-72 bg-card border border-border rounded-xl shadow-xl overflow-hidden dark:shadow-xl dark:shadow-black/40 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">Notifications</p>
                    <p className="text-[11px] text-muted-foreground">You have {notificationCount} unread</p>
                  </div>
                  <button className="text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors">
                    Mark all read
                  </button>
                </div>
                <div className="max-h-[320px] overflow-y-auto">
                  <div className="flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors cursor-pointer border-b border-border/50">
                    <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-[16px]">inventory</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">Low stock alert</p>
                      <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">Coconut juice is running low (5 units left)</p>
                      <p className="text-[10px] text-muted-foreground mt-1">2 min ago</p>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                  </div>
                  <div className="flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors cursor-pointer border-b border-border/50">
                    <div className="p-1.5 rounded-lg bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400 shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">Pending payment</p>
                      <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">John Doe has pending payment of ₱45.00</p>
                      <p className="text-[10px] text-muted-foreground mt-1">15 min ago</p>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                  </div>
                  <div className="flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">New transaction</p>
                      <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">New order completed: ₱120.00</p>
                      <p className="text-[10px] text-muted-foreground mt-1">1 hour ago</p>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                  </div>
                </div>
                <div className="p-2 border-t border-border bg-muted/20">
                  <button
                    onClick={() => { setShowNotifications(false); navigate('/transactions'); }}
                    className="w-full py-2 text-xs font-semibold text-center text-primary hover:bg-primary/5 rounded-lg transition-colors"
                  >
                    View all notifications
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <button className="rounded-full p-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30 active:scale-95">
          <span className="material-symbols-outlined text-[20px]">help_outline</span>
        </button>

        {isSettings && (
          <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-sm hover:shadow-md">
            <span className="material-symbols-outlined text-sm">save</span>
            Save Changes
          </button>
        )}

        <div className="h-6 w-px bg-border mx-1"></div>

        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-muted/60 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30 active:scale-95"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden border border-border">
              <img
                alt={currentUser?.name || 'User'}
                className="w-full h-full object-cover"
                src={currentUser?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser?.name || 'User')}`}
              />
            </div>
            <div className="hidden md:block text-left">
              <p className="text-[11px] font-semibold leading-tight">{currentUser?.name || 'User'}</p>
              <p className="text-[10px] text-muted-foreground capitalize leading-tight">{currentUser?.role || 'admin'}</p>
            </div>
            <span className="material-symbols-outlined text-[16px] text-muted-foreground hidden md:block">expand_more</span>
          </button>
          {showProfileMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowProfileMenu(false)}
              />
              <div className="absolute right-0 top-12 z-50 w-56 bg-card border border-border rounded-xl shadow-xl overflow-hidden dark:shadow-xl dark:shadow-black/40 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-4 border-b border-border bg-muted/30 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden border border-border">
                    <img
                      alt={currentUser?.name || 'User'}
                      className="w-full h-full object-cover"
                      src={currentUser?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser?.name || 'User')}`}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{currentUser?.name || 'Loading...'}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{currentUser?.email || 'Loading...'}</p>
                  </div>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate('/settings/profile');
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted/50 flex items-center gap-3 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px] text-muted-foreground">person</span>
                    Profile Settings
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate('/settings/preferences');
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted/50 flex items-center gap-3 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px] text-muted-foreground">settings</span>
                    Preferences
                  </button>
                  <div className="h-px bg-border my-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-destructive/10 text-destructive flex items-center gap-3 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
