'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'dark', toggle: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

function getStorageKey(userId?: string) {
  return userId ? `theme_${userId}` : 'theme_guest';
}

function applyTheme(t: Theme) {
  const html = document.documentElement;
  html.classList.remove('dark', 'light');
  html.classList.add(t);
}

export function ThemeProvider({ children, userId }: { children: React.ReactNode; userId?: string }) {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const key = getStorageKey(userId);
    // Aplica localStorage imediatamente para evitar flash
    const cached = localStorage.getItem(key) as Theme | null;
    if (cached) { applyTheme(cached); setTheme(cached); }

    if (userId) {
      // Banco é a fonte de verdade — busca e sincroniza
      fetch('/api/config')
        .then(r => r.json())
        .then(data => {
          const dbTheme: Theme = data?.theme === 'light' ? 'light' : 'dark';
          applyTheme(dbTheme);
          setTheme(dbTheme);
          localStorage.setItem(key, dbTheme);
        })
        .catch(() => {
          // Se falhar, usa localStorage ou padrão do sistema
          const preferred = cached ?? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
          applyTheme(preferred);
          setTheme(preferred as Theme);
        });
    } else {
      const preferred = cached ?? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
      applyTheme(preferred as Theme);
      setTheme(preferred as Theme);
    }
  }, [userId]);

  // Quando sair do dashboard, restaura dark na landing page
  useEffect(() => {
    return () => {
      document.documentElement.classList.remove('dark', 'light');
      document.documentElement.classList.add('dark');
    };
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setTheme(next);
    localStorage.setItem(getStorageKey(userId), next);
    if (userId) {
      fetch('/api/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: next }),
      });
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
