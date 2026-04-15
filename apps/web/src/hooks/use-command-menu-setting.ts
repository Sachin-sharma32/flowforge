'use client';

import { useEffect, useState } from 'react';
import {
  PREFERENCES_EVENT,
  readCommandMenuPreference,
  writeCommandMenuPreference,
} from '@/lib/preferences';

export function useCommandMenuSetting() {
  const [enabled, setEnabled] = useState<boolean>(true);

  useEffect(() => {
    setEnabled(readCommandMenuPreference());

    const handler = () => setEnabled(readCommandMenuPreference());
    window.addEventListener('storage', handler);
    window.addEventListener(PREFERENCES_EVENT, handler);

    return () => {
      window.removeEventListener('storage', handler);
      window.removeEventListener(PREFERENCES_EVENT, handler);
    };
  }, []);

  const update = (next: boolean) => {
    writeCommandMenuPreference(next);
    setEnabled(next);
  };

  return { enabled, setEnabled: update };
}
