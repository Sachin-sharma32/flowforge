const COMMAND_MENU_KEY = 'flowforge.command_menu.enabled';

const PREFERENCES_EVENT = 'flowforge:preferences:updated';

function readCommandMenuPreference() {
  if (typeof window === 'undefined') return true;
  const value = window.localStorage.getItem(COMMAND_MENU_KEY);
  if (value === null) return true;
  return value === '1';
}

function writeCommandMenuPreference(value: boolean) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(COMMAND_MENU_KEY, value ? '1' : '0');
  window.dispatchEvent(new Event(PREFERENCES_EVENT));
}

export {
  COMMAND_MENU_KEY,
  PREFERENCES_EVENT,
  readCommandMenuPreference,
  writeCommandMenuPreference,
};
