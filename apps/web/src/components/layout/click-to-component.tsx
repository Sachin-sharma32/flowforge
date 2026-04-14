'use client';

/**
 * Dev inspector is handled by `code-inspector-plugin` in next.config.mjs.
 *
 * Usage: Hold Alt+Shift, then click any element to open its source in your editor.
 *
 * The plugin injects source-location data attributes at build time,
 * and the click-to-source overlay only activates when the hotkeys are held.
 * HMR/Fast Refresh works normally during regular editing.
 *
 * This component is a no-op placeholder kept for documentation purposes.
 */
export function DevClickToComponent() {
  return null;
}
