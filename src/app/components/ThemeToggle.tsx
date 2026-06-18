import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { cn } from './ui/utils';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
        <span className="material-symbols-outlined text-[20px]">contrast</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
      <button
        onClick={() => setTheme('light')}
        className={cn(
          'p-1.5 rounded-md transition-all',
          theme === 'light'
            ? 'bg-background shadow-sm text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        )}
        title="Light mode"
      >
        <span className="material-symbols-outlined text-[18px]">light_mode</span>
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={cn(
          'p-1.5 rounded-md transition-all',
          theme === 'dark'
            ? 'bg-background shadow-sm text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        )}
        title="Dark mode"
      >
        <span className="material-symbols-outlined text-[18px]">dark_mode</span>
      </button>
      <button
        onClick={() => setTheme('system')}
        className={cn(
          'p-1.5 rounded-md transition-all',
          theme === 'system'
            ? 'bg-background shadow-sm text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        )}
        title="System theme"
      >
        <span className="material-symbols-outlined text-[18px]">contrast</span>
      </button>
    </div>
  );
}
