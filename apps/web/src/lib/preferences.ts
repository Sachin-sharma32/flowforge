type CommandShortcutModifier = 'meta' | 'ctrl' | 'alt';

interface CommandMenuPreference {
  enabled: boolean;
  modifier: CommandShortcutModifier;
  key: string;
}

const LEGACY_COMMAND_MENU_KEY = 'flowforge.command_menu.enabled';
const COMMAND_MENU_KEY = 'flowforge.command_menu.preference';

const PREFERENCES_EVENT = 'flowforge:preferences:updated';

function getDefaultModifier(): CommandShortcutModifier {
  if (typeof window === 'undefined') return 'meta';
  const platform = window.navigator.platform.toLowerCase();
  if (platform.includes('mac')) return 'meta';
  return 'alt';
}

function getDefaultPreference(): CommandMenuPreference {
  return {
    enabled: true,
    modifier: getDefaultModifier(),
    key: 'Space',
  };
}

function normalizeShortcutKey(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) return 'Space';
  if (trimmed.toLowerCase() === 'space' || trimmed === ' ') return 'Space';
  return trimmed.slice(0, 1).toUpperCase();
}

function readCommandMenuPreference(): CommandMenuPreference {
  const defaultPreference = getDefaultPreference();
  if (typeof window === 'undefined') return defaultPreference;

  const rawPreference = window.localStorage.getItem(COMMAND_MENU_KEY);
  if (rawPreference) {
    try {
      const parsed = JSON.parse(rawPreference) as Partial<CommandMenuPreference>;
      return {
        enabled: parsed.enabled ?? true,
        modifier:
          parsed.modifier === 'meta' || parsed.modifier === 'ctrl' || parsed.modifier === 'alt'
            ? parsed.modifier
            : defaultPreference.modifier,
        key: normalizeShortcutKey(parsed.key || defaultPreference.key),
      };
    } catch {
      return defaultPreference;
    }
  }

  const legacyValue = window.localStorage.getItem(LEGACY_COMMAND_MENU_KEY);
  if (legacyValue !== null) {
    return {
      ...defaultPreference,
      enabled: legacyValue === '1',
    };
  }

  return defaultPreference;
}

function writeCommandMenuPreference(value: CommandMenuPreference) {
  if (typeof window === 'undefined') return;
  const next = {
    enabled: value.enabled,
    modifier: value.modifier,
    key: normalizeShortcutKey(value.key),
  };
  window.localStorage.setItem(COMMAND_MENU_KEY, JSON.stringify(next));
  window.localStorage.setItem(LEGACY_COMMAND_MENU_KEY, next.enabled ? '1' : '0');
  window.dispatchEvent(new Event(PREFERENCES_EVENT));
}

function formatShortcutLabel(shortcut: { modifier: CommandShortcutModifier; key: string }): string {
  const modifierLabel =
    shortcut.modifier === 'meta' ? '⌘' : shortcut.modifier === 'ctrl' ? 'Ctrl' : 'Alt';
  return `${modifierLabel} ${normalizeShortcutKey(shortcut.key)}`;
}

function normalizeKeyboardEventKey(event: KeyboardEvent): string {
  if (event.code === 'Space') return 'Space';
  if (event.key.length === 1) return event.key.toUpperCase();
  return event.key;
}

function matchesShortcut(event: KeyboardEvent, shortcut: CommandMenuPreference): boolean {
  const hasModifier =
    shortcut.modifier === 'meta'
      ? event.metaKey && !event.ctrlKey && !event.altKey
      : shortcut.modifier === 'ctrl'
        ? event.ctrlKey && !event.metaKey && !event.altKey
        : event.altKey && !event.metaKey && !event.ctrlKey;

  if (!hasModifier) return false;
  return normalizeKeyboardEventKey(event) === normalizeShortcutKey(shortcut.key);
}

export {
  COMMAND_MENU_KEY,
  PREFERENCES_EVENT,
  type CommandShortcutModifier,
  type CommandMenuPreference,
  formatShortcutLabel,
  matchesShortcut,
  readCommandMenuPreference,
  writeCommandMenuPreference,
};
