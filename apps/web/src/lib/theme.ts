export const THEME_STORAGE_KEY = 'flowforge-theme';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface RootLike {
  classList: {
    toggle(token: string, force?: boolean): boolean | void;
  };
}

interface MediaQueryListLike {
  matches: boolean;
}

type MatchMediaLike = (query: string) => MediaQueryListLike;

function getStorage(storage?: StorageLike | null): StorageLike | null {
  if (storage) {
    return storage;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
}

function getRoot(root?: RootLike | null): RootLike | null {
  if (root) {
    return root;
  }

  if (typeof document === 'undefined') {
    return null;
  }

  return document.documentElement;
}

function getMatchMedia(matchMedia?: MatchMediaLike): MatchMediaLike | null {
  if (matchMedia) {
    return matchMedia;
  }

  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return null;
  }

  return window.matchMedia.bind(window);
}

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function getThemePreference(storage?: StorageLike | null): ThemePreference {
  const selectedStorage = getStorage(storage);

  if (!selectedStorage) {
    return 'system';
  }

  try {
    const storedTheme = selectedStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(storedTheme) ? storedTheme : 'system';
  } catch {
    return 'system';
  }
}

export function getSystemPrefersDark(matchMedia?: MatchMediaLike): boolean {
  const selectedMatchMedia = getMatchMedia(matchMedia);

  if (!selectedMatchMedia) {
    return false;
  }

  return selectedMatchMedia('(prefers-color-scheme: dark)').matches;
}

export function resolveTheme(theme: ThemePreference, prefersDark: boolean): ResolvedTheme {
  if (theme === 'system') {
    return prefersDark ? 'dark' : 'light';
  }

  return theme;
}

export function persistThemePreference(theme: ThemePreference, storage?: StorageLike | null): void {
  const selectedStorage = getStorage(storage);

  if (!selectedStorage) {
    return;
  }

  try {
    selectedStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage write failures (private mode, blocked storage, etc.).
  }
}

export function applyResolvedTheme(theme: ResolvedTheme, root?: RootLike | null): void {
  const selectedRoot = getRoot(root);
  if (!selectedRoot) {
    return;
  }

  selectedRoot.classList.toggle('dark', theme === 'dark');
}

export function applyThemePreference(
  theme: ThemePreference,
  options?: {
    storage?: StorageLike | null;
    root?: RootLike | null;
    matchMedia?: MatchMediaLike;
  },
): ResolvedTheme {
  const prefersDark = getSystemPrefersDark(options?.matchMedia);
  const resolvedTheme = resolveTheme(theme, prefersDark);
  applyResolvedTheme(resolvedTheme, options?.root);
  persistThemePreference(theme, options?.storage);
  return resolvedTheme;
}

export function getThemeInitScript(storageKey = THEME_STORAGE_KEY): string {
  return `(function(){try{var stored=localStorage.getItem('${storageKey}');var theme=(stored==='light'||stored==='dark'||stored==='system')?stored:'system';var isDark=theme==='dark'||(theme==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',isDark);}catch(_e){}})();`;
}

export const themeInitScript = getThemeInitScript();
