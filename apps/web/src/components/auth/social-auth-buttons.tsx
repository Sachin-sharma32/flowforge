'use client';

import { Button } from '@/components/ui/button';

interface SocialAuthButtonsProps {
  disabled?: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export function SocialAuthButtons({ disabled = false }: SocialAuthButtonsProps) {
  const startOAuthFlow = (provider: 'google' | 'github') => {
    window.location.href = `${API_URL}/auth/oauth/${provider}/start`;
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => startOAuthFlow('google')}
          disabled={disabled}
          className="w-full justify-start px-4"
        >
          <span className="mr-2 inline-flex h-5 w-5 shrink-0 items-center justify-center">
            <GoogleIcon />
          </span>
          Continue with Google
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => startOAuthFlow('github')}
          disabled={disabled}
          className="w-full justify-start px-4"
        >
          <span className="mr-2 inline-flex h-5 w-5 shrink-0 items-center justify-center text-foreground">
            <GitHubIcon />
          </span>
          Continue with GitHub
        </Button>
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border/70" />
        <span>or continue with email</span>
        <span className="h-px flex-1 bg-border/70" />
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-5 w-5"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M21.35 12.23c0-.76-.07-1.49-.2-2.2H12v4.16h5.23a4.47 4.47 0 0 1-1.94 2.94v2.44h3.14c1.84-1.7 2.92-4.2 2.92-7.34Z"
        fill="#4285F4"
      />
      <path
        d="M12 21.7c2.62 0 4.82-.87 6.42-2.36l-3.14-2.44c-.87.58-1.99.92-3.28.92-2.52 0-4.66-1.7-5.42-3.98H3.35v2.51A9.7 9.7 0 0 0 12 21.7Z"
        fill="#34A853"
      />
      <path
        d="M6.58 13.84a5.8 5.8 0 0 1 0-3.68V7.65H3.35a9.7 9.7 0 0 0 0 8.7l3.23-2.51Z"
        fill="#FBBC05"
      />
      <path
        d="M12 6.18c1.42 0 2.7.49 3.7 1.45l2.77-2.77A9.7 9.7 0 0 0 3.35 7.65l3.23 2.51C7.34 7.88 9.48 6.18 12 6.18Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-5 w-5"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 0C5.37 0 0 5.37 0 12a12 12 0 0 0 8.2 11.39c.6.11.82-.26.82-.58v-2.16c-3.34.73-4.04-1.61-4.04-1.61a3.2 3.2 0 0 0-1.34-1.78c-1.09-.74.08-.72.08-.72a2.53 2.53 0 0 1 1.85 1.24 2.57 2.57 0 0 0 3.5 1 2.57 2.57 0 0 1 .76-1.62c-2.66-.3-5.47-1.33-5.47-5.93a4.64 4.64 0 0 1 1.24-3.22 4.31 4.31 0 0 1 .12-3.18s1.01-.33 3.3 1.23a11.52 11.52 0 0 1 6 0c2.28-1.56 3.3-1.23 3.3-1.23.44 1.01.48 2.15.12 3.18a4.63 4.63 0 0 1 1.24 3.22c0 4.61-2.81 5.62-5.49 5.92a2.87 2.87 0 0 1 .82 2.23v3.3c0 .32.21.7.83.58A12 12 0 0 0 24 12c0-6.63-5.37-12-12-12Z" />
    </svg>
  );
}
