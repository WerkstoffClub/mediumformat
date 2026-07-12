import { useEffect, useState } from 'react';

type Theme = 'dark' | 'light';
const STORAGE_KEY = 'mf-theme';

export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark';
    const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
    return stored ?? 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    // Also toggle Tailwind's dark class for @apply utilities keyed on it.
    root.classList.remove('dark', 'light');
    root.classList.add(theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return { theme, toggle };
}
