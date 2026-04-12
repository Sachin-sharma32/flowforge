const CSRF_COOKIE_NAME = process.env.NEXT_PUBLIC_AUTH_CSRF_COOKIE_NAME || 'ff_csrf';

export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookies = document.cookie.split(';').map((cookie) => cookie.trim());
  const targetCookie = cookies.find((cookie) => cookie.startsWith(`${CSRF_COOKIE_NAME}=`));

  if (!targetCookie) {
    return null;
  }

  const value = targetCookie.slice(CSRF_COOKIE_NAME.length + 1);
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function getCsrfHeaders(): Record<string, string> {
  const token = getCsrfToken();
  if (!token) {
    return {};
  }

  return { 'X-CSRF-Token': token };
}
