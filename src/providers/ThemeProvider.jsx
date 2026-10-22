import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import { runThemeTransition, setQueuedToggleHandler } from '../lib/themeTransition';

export const ThemeContext = createContext();

const applyBodyClass = (theme) => {
  document.body.classList.toggle('light-theme', theme === 'light');
};

export default function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || localStorage.getItem('default_theme') || 'light';
  });
  const themeRef = useRef(theme);
  themeRef.current = theme;

  useEffect(() => {
    applyBodyClass(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Accepts the click event (or an explicit origin) so the transition grows from the toggle.
  const toggleTheme = useCallback((event, from) => {
    runThemeTransition({
      event,
      from,
      // Resolved when the transition actually applies it, so queued toggles stay correct.
      get to() {
        return themeRef.current === 'dark' ? 'light' : 'dark';
      },
      apply: () => {
        const next = themeRef.current === 'dark' ? 'light' : 'dark';
        themeRef.current = next;
        flushSync(() => setTheme(next));
        applyBodyClass(next);
      },
    });
  }, []);

  useEffect(() => {
    setQueuedToggleHandler((origin) => toggleTheme(undefined, origin));
    return () => setQueuedToggleHandler(null);
  }, [toggleTheme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
