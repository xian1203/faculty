import { Input } from './ui/input';
import { SidebarTrigger } from './ui/sidebar';
import { useLocation, useNavigate } from 'react-router';
import { useCurrentUser } from '../../contexts/UserContext';
import { AuthService } from '../../firebase';
import { useState } from 'react';
import { Search } from 'lucide-react';

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useCurrentUser();
  const path = location.pathname;
  const [showProfileMenu, setShowProfileMenu] = useState(false);

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

  return (
    <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border px-6 py-3 flex justify-between items-center shadow-sm">
      <div className="flex items-center gap-4 flex-1">
        <SidebarTrigger className="-ml-1" />
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
        <div className={`relative w-full focus-within:ring-2 focus-within:ring-primary/40 rounded-xl overflow-hidden transition-all ${isSettings ? 'max-w-[260px]' : 'max-w-md'}`}>
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            className="w-full bg-muted/50 border-none pl-11 pr-4 py-2 focus:ring-0"
            placeholder={getPlaceholder()}
            type="text"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        {showLiveReader ? (
          <div className="flex items-center gap-2 mr-4 bg-amber-500/10 dark:bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/30">
            <span className="w-2 h-2 rounded-full bg-amber-500 pulse-active"></span>
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Live Reader Active</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 mr-4 bg-muted px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-green-500 pulse-active"></span>
            <span className="text-xs font-medium text-muted-foreground">RFID Live</span>
          </div>
        )}
        <button className="hover:bg-muted/50 rounded-full p-2 text-muted-foreground transition-all focus-within:ring-2 focus-within:ring-primary/40 relative">
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full"></span>
        </button>
        <button className="hover:bg-muted/50 rounded-full p-2 text-muted-foreground transition-all focus-within:ring-2 focus-within:ring-primary/40">
          <span className="material-symbols-outlined">help_outline</span>
        </button>
        {isSettings && (
          <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-sm">
            <span className="material-symbols-outlined text-sm">save</span>
            Save Changes
          </button>
        )}
        <div className="h-6 w-px bg-border mx-1"></div>
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden border border-border ml-2 hover:ring-2 hover:ring-primary/30 transition-all"
          >
            <img
              alt={currentUser?.name || 'User'}
              className="w-full h-full object-cover"
              src={currentUser?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser?.name || 'User')}`}
            />
          </button>
          {showProfileMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowProfileMenu(false)}
              />
              <div className="absolute right-0 top-12 z-50 w-56 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                <div className="p-3 border-b border-border bg-muted/50">
                  <p className="font-semibold text-sm">{currentUser?.name || 'Loading...'}</p>
                  <p className="text-xs text-muted-foreground">{currentUser?.email || 'Loading...'}</p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate('/settings/profile');
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-muted/50 flex items-center gap-3 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">person</span>
                    Profile Settings
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate('/settings/preferences');
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-muted/50 flex items-center gap-3 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">settings</span>
                    Preferences
                  </button>
                  <div className="h-px bg-border my-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-destructive/10 text-destructive flex items-center gap-3 transition-colors"
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
