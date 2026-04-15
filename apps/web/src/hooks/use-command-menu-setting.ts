'use client';

import { useEffect, useState } from 'react';
import {
  PREFERENCES_EVENT,
  type CommandMenuPreference,
  readCommandMenuPreference,
  writeCommandMenuPreference,
} from '@/lib/preferences';

export function useCommandMenuSetting() {
  const [preference, setPreference] = useState<CommandMenuPreference>(() =>
    readCommandMenuPreference(),
  );

  useEffect(() => {
    setPreference(readCommandMenuPreference());

    const handler = () => setPreference(readCommandMenuPreference());
    window.addEventListener('storage', handler);
    window.addEventListener(PREFERENCES_EVENT, handler);

    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener(PREFERENCES_EVENT, handler);
    };
  }, []);

  const update = (next: CommandMenuPreference) => {
    writeCommandMenuPreference(next);
    setPreference(next);
  };

  const setEnabled = (enabled: boolean) => update({ ...preference, enabled });
  const setShortcut = (modifier: CommandMenuPreference['modifier'], key: string) =>
    update({ ...preference, modifier, key });

  return {
    enabled: preference.enabled,
    shortcut: { modifier: preference.modifier, key: preference.key },
    setEnabled,
    setShortcut,
  };
}
