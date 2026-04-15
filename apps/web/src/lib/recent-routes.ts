const RECENT_ROUTES_KEY = 'flowforge.recent_routes';
const MAX_RECENT_ROUTES = 8;

interface RecentRoute {
  path: string;
  ts: number;
}

function getRecentRoutes(): RecentRoute[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(RECENT_ROUTES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as RecentRoute[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function pushRecentRoute(path: string) {
  if (typeof window === 'undefined') return;
  const current = getRecentRoutes().filter((entry) => entry.path !== path);
  const next = [{ path, ts: Date.now() }, ...current].slice(0, MAX_RECENT_ROUTES);
  window.localStorage.setItem(RECENT_ROUTES_KEY, JSON.stringify(next));
}

export { getRecentRoutes, pushRecentRoute, type RecentRoute };
