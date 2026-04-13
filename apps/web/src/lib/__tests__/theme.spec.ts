import { describe, expect, it, vi } from 'vitest';
import {
  THEME_STORAGE_KEY,
  applyThemePreference,
  getThemePreference,
  resolveTheme,
  type ThemePreference,
} from '@/lib/theme';

interface MockStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

interface MockRoot {
  classList: {
    toggle: (token: string, force?: boolean) => void;
  };
}

function createMockStorage(initialValue?: ThemePreference): MockStorage {
  const values = new Map<string, string>();
  if (initialValue) {
    values.set(THEME_STORAGE_KEY, initialValue);
  }

  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
}

function createMockRoot(initialDark = false): { root: MockRoot; hasDarkClass: () => boolean } {
  const classes = new Set<string>(initialDark ? ['dark'] : []);

  return {
    root: {
      classList: {
        toggle(token: string, force?: boolean) {
          if (force === undefined) {
            if (classes.has(token)) {
              classes.delete(token);
              return;
            }
            classes.add(token);
            return;
          }

          if (force) {
            classes.add(token);
            return;
          }

          classes.delete(token);
        },
      },
    },
    hasDarkClass: () => classes.has('dark'),
  };
}

describe('theme utilities', () => {
  it('defaults to system and resolves from mocked system preference', () => {
    const storage = createMockStorage();
    const { root, hasDarkClass } = createMockRoot(false);
    const matchMedia = vi.fn().mockReturnValue({ matches: true });

    const initialTheme = getThemePreference(storage);
    const resolvedTheme = applyThemePreference(initialTheme, { storage, root, matchMedia });

    expect(initialTheme).toBe('system');
    expect(resolvedTheme).toBe('dark');
    expect(hasDarkClass()).toBe(true);
  });

  it('toggle-style explicit dark preference applies dark class and persists', () => {
    const storage = createMockStorage('light');
    const { root, hasDarkClass } = createMockRoot(false);
    const matchMedia = vi.fn().mockReturnValue({ matches: false });

    const resolvedTheme = applyThemePreference('dark', { storage, root, matchMedia });

    expect(resolvedTheme).toBe('dark');
    expect(hasDarkClass()).toBe(true);
    expect(storage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('reload reads persisted preference and reapplies it', () => {
    const storage = createMockStorage('dark');
    const { root, hasDarkClass } = createMockRoot(false);
    const matchMedia = vi.fn().mockReturnValue({ matches: false });

    const savedTheme = getThemePreference(storage);
    const resolvedTheme = applyThemePreference(savedTheme, { storage, root, matchMedia });

    expect(savedTheme).toBe('dark');
    expect(resolveTheme(savedTheme, false)).toBe('dark');
    expect(resolvedTheme).toBe('dark');
    expect(hasDarkClass()).toBe(true);
  });
});
