# Authentication Flow

This document describes the authentication flow implemented in FlowForge today, based on the current code in `apps/api`, `apps/web`, and `packages/shared`.

## Scope

The application currently supports:

- Email and password registration
- Email verification
- Email and password sign-in
- OTP sign-in by email code
- Google OAuth
- GitHub OAuth
- Google One Tap
- Refresh-token based session continuation
- Single-session logout and logout-all
- Profile bootstrap for protected frontend routes

The shared package also contains `forgotPasswordSchema` and `resetPasswordSchema`, but there are no backend routes or frontend screens wired for password reset at the moment.

## High-Level Design

FlowForge uses a split-token model:

- Access token: short-lived JWT, sent in the `Authorization: Bearer <token>` header
- Refresh token: opaque long-lived token, stored in an `HttpOnly` cookie
- CSRF token: readable cookie mirrored into the `X-CSRF-Token` header for refresh and logout requests

Key implementation choices:

- The frontend keeps the access token in memory only via `apps/web/src/lib/auth-token-store.ts`.
- The frontend does not persist the access token in `localStorage`, `sessionStorage`, or cookies.
- The backend stores refresh-session state in Redis through `apps/api/src/services/refresh-session.service.ts`.
- The backend rotates the refresh token on every successful `/auth/refresh`.
- Refresh-token replay triggers revocation of all sessions for that user.

Default auth-related cookie configuration comes from `apps/api/src/config/index.ts`:

- Refresh cookie name: `ff_refresh`
- CSRF cookie name: `ff_csrf`
- Refresh cookie path: `/api/v1/auth`
- CSRF cookie path: `/`
- Access token expiry: `15m`
- Refresh token expiry: `7d`
- Refresh session limit per user: `5`

## Shared Validation Contracts

Request validation is defined in `packages/shared/src/validation/auth.schema.ts` and enforced by `apps/api/src/middleware/validate.middleware.ts`.

Current auth request contracts:

| Flow                | Schema                     |
| ------------------- | -------------------------- |
| Register            | `registerSchema`           |
| Login               | `loginSchema`              |
| Verify email        | `verifyEmailSchema`        |
| Resend verification | `resendVerificationSchema` |
| Google One Tap      | `googleOneTapSchema`       |
| Request OTP         | `requestOtpSchema`         |
| Verify OTP          | `verifyOtpSchema`          |

Current shared auth response types live in `packages/shared/src/types/user.types.ts`.

## Backend Flow

### Route Map

Auth routes are registered in `apps/api/src/routes/auth.routes.ts`.

| Method | Route                                   | Middleware                                          | Purpose                                         |
| ------ | --------------------------------------- | --------------------------------------------------- | ----------------------------------------------- |
| `POST` | `/api/v1/auth/register`                 | `authLimiter`, `validate(registerSchema)`           | Create account                                  |
| `GET`  | `/api/v1/auth/verify-email`             | `authLimiter`                                       | Verify email from clicked link, then redirect   |
| `POST` | `/api/v1/auth/verify-email`             | `authLimiter`, `validate(verifyEmailSchema)`        | Verify email by API                             |
| `POST` | `/api/v1/auth/resend-verification`      | `authLimiter`, `validate(resendVerificationSchema)` | Resend verification email                       |
| `POST` | `/api/v1/auth/oauth/google/one-tap`     | `authLimiter`, `validate(googleOneTapSchema)`       | Google One Tap sign-in                          |
| `GET`  | `/api/v1/auth/oauth/:provider/start`    | `authLimiter`                                       | Start Google or GitHub OAuth                    |
| `GET`  | `/api/v1/auth/oauth/:provider/callback` | `authLimiter`                                       | Finish Google or GitHub OAuth                   |
| `POST` | `/api/v1/auth/login`                    | `authLimiter`, `validate(loginSchema)`              | Password login                                  |
| `POST` | `/api/v1/auth/otp/request`              | `authLimiter`, `validate(requestOtpSchema)`         | Send OTP email                                  |
| `POST` | `/api/v1/auth/otp/verify`               | `authLimiter`, `validate(verifyOtpSchema)`          | Verify OTP and sign in                          |
| `POST` | `/api/v1/auth/refresh`                  | `authLimiter`, `requireCsrfToken`                   | Rotate refresh token and issue new access token |
| `POST` | `/api/v1/auth/logout`                   | `requireCsrfToken`                                  | Revoke current refresh session                  |
| `POST` | `/api/v1/auth/logout-all`               | `authenticate`                                      | Revoke all refresh sessions for current user    |
| `GET`  | `/api/v1/auth/me`                       | `authenticate`                                      | Return current user profile                     |

All auth endpoints are also covered by `authLimiter`, which is currently `5` requests per minute per IP in `apps/api/src/middleware/rate-limit.middleware.ts`.

### Registration

Entry point:

- Route: `POST /api/v1/auth/register`
- Controller: `AuthController.register`
- Service: `AuthService.register`

Flow:

1. Input is normalized, especially email lowercasing and trimming.
2. The backend checks whether a user with that email already exists.
3. If the existing user is already verified, registration fails with `409 Conflict` and code `EMAIL_ALREADY_REGISTERED`.
4. If the existing user exists but is still unverified, the backend rotates the email verification token and returns a response with `verificationState: 'resent'`.
5. If the user is new:
   - A new user is created.
   - `passwordHash` is assigned from the submitted password.
   - The `User` mongoose model hashes the password in a `pre('save')` hook with bcrypt.
   - A default organization and default workspace are created.
6. In production, the backend sends a verification email.
7. In non-production environments, the user is marked verified immediately because `isVerified` is set to `true` on creation.

Important behavior:

- Register does not create a login session.
- The response returns verification metadata, not auth tokens.
- In non-production, the response includes `verificationToken` for easier local testing.

### Email Verification

There are two verification entry points:

- `POST /api/v1/auth/verify-email`
- `GET /api/v1/auth/verify-email?token=...`

Flow:

1. The backend hashes the incoming verification token with SHA-256.
2. It looks up a user whose stored token hash matches and whose verification expiry is still in the future.
3. If found, the user is marked verified and the verification token fields are cleared.

Important behavior:

- Verification does not create a session.
- The `GET` endpoint is redirect-oriented for email links.
- `AuthController.verifyEmailFromLink` redirects to:
  - `/login?verification=success` on success
  - `/login?verification=invalid` on failure
- The redirect response does not set auth cookies.

### Password Login

Entry point:

- Route: `POST /api/v1/auth/login`
- Service: `AuthService.login`

Flow:

1. User is looked up by normalized email.
2. If the user has no `passwordHash`, login is rejected with a message instructing the user to continue with Google or GitHub.
3. Password is checked with `user.comparePassword`.
4. If the account is unverified:
   - In production: login fails with `403 Forbidden` and code `EMAIL_UNVERIFIED`.
   - In non-production: the account is auto-verified during login and verification fields are cleared.
5. `issueAuthResult` creates:
   - A new refresh session in Redis
   - A signed JWT access token
6. The controller sets auth cookies and returns:
   - `user`
   - `tokens.accessToken`

### OTP Login

OTP login is split into request and verify steps.

#### Request OTP

Entry point:

- Route: `POST /api/v1/auth/otp/request`
- Service: `AuthService.requestOtp`

Flow:

1. User is looked up by normalized email.
2. If no user exists, the endpoint still returns success to avoid account enumeration.
3. If the user exists but is not verified, the endpoint also returns success without sending a code.
4. For a verified user:
   - A 6-digit OTP is generated.
   - The OTP is hashed with SHA-256.
   - The hash and a 5-minute expiry are stored on the user record.
   - The plain OTP is sent by email.

#### Verify OTP

Entry point:

- Route: `POST /api/v1/auth/otp/verify`
- Service: `AuthService.verifyOtp`

Flow:

1. User is looked up by normalized email.
2. The backend checks that an OTP hash and expiry exist.
3. Expired OTPs are cleared and rejected.
4. Submitted OTP is hashed and compared to the stored hash.
5. On success, OTP fields are cleared.
6. The same session issuance path as password login runs:
   - Refresh session created
   - Access token generated
   - Cookies set
   - `user` and `tokens.accessToken` returned

### OAuth Login

OAuth supports `google` and `github`.

#### Start

Entry point:

- Route: `GET /api/v1/auth/oauth/:provider/start`

Flow:

1. Provider is validated.
2. A random OAuth `state` value is generated.
3. The backend builds the provider authorization URL.
4. The backend stores the state in an `HttpOnly` cookie named `ff_oauth_state`.
5. The browser is redirected to the provider.

#### Callback

Entry point:

- Route: `GET /api/v1/auth/oauth/:provider/callback`

Flow:

1. The backend reads:
   - `state` from the callback query
   - `code` from the callback query
   - `ff_oauth_state` from cookies
2. The state cookie is cleared.
3. If state validation fails or the code is missing:
   - Auth cookies are cleared
   - The user is redirected to `/login?oauth=error`
4. If state validation succeeds:
   - Google flow exchanges the code with Google and reads profile data from `userinfo`
   - GitHub flow exchanges the code, loads the GitHub user, and resolves a verified email
5. The backend either:
   - Finds an existing user linked to that provider
   - Falls back to an existing user with the same email
   - Or creates a new verified user and default workspace
6. The backend updates provider linkage on the user record where needed.
7. A refresh session is created, auth cookies are set, and the browser is redirected to `/dashboard`.

Important behavior:

- The OAuth callback does not return the access token to JavaScript.
- It relies on the cookie-backed refresh flow to rebuild an in-memory access token after redirect.

### Google One Tap

Entry point:

- Route: `POST /api/v1/auth/oauth/google/one-tap`

Flow:

1. The frontend submits the Google ID token as `credential`.
2. The backend validates it against Google token info:
   - audience must match `GOOGLE_CLIENT_ID`
   - issuer must be Google
   - token must not be expired
   - email must be verified
3. The backend reuses the same OAuth-profile login path used by standard Google OAuth.
4. The controller sets auth cookies and returns:
   - `user`
   - `tokens.accessToken`

### Refresh Token and Session Rotation

Entry point:

- Route: `POST /api/v1/auth/refresh`

Flow:

1. `requireCsrfToken` compares the `ff_csrf` cookie to the `X-CSRF-Token` request header.
2. The controller reads the refresh token from the `ff_refresh` cookie.
3. `RefreshSessionService.rotateSession`:
   - hashes the current refresh token
   - validates the lookup in Redis
   - rotates to a new refresh token
   - updates session metadata
   - marks the old token as used
4. The backend returns a new access token and sets a new refresh cookie.

Replay protection:

- If a used refresh token is replayed, the service returns `replay`.
- `AuthService.refresh` then revokes all sessions for that user and forces re-login.

### Logout

#### Single-session logout

Entry point:

- Route: `POST /api/v1/auth/logout`

Flow:

1. CSRF token is required.
2. If a refresh cookie exists, the backend revokes that session in Redis.
3. The backend clears the refresh and CSRF cookies.

#### Logout all sessions

Entry point:

- Route: `POST /api/v1/auth/logout-all`

Flow:

1. Access token authentication is required.
2. All refresh sessions for the current user are revoked in Redis.
3. Auth cookies are cleared.

At the moment, the backend supports logout-all, but the web app does not appear to call it from the current auth UI.

### Protected API Authentication

Protected routes use `authenticate` from `apps/api/src/middleware/auth.middleware.ts`.

Flow:

1. The middleware expects `Authorization: Bearer <accessToken>`.
2. The JWT is verified with `JWT_SECRET`.
3. On success, `req.user = { userId }`.
4. On failure, the backend returns `401 Unauthorized`.

Current auth-specific protected endpoint:

- `GET /api/v1/auth/me`

Other protected route groups in the app also reuse the same Bearer token middleware.

### Error Shape

Operational auth errors follow the standard API envelope from `apps/api/src/middleware/error-handler.middleware.ts`:

```json
{
  "success": false,
  "error": "Please verify your email before signing in.",
  "context": {
    "code": "EMAIL_UNVERIFIED"
  }
}
```

Validation failures use:

```json
{
  "success": false,
  "error": "Validation failed",
  "context": {
    "errors": ["email: Invalid email address"]
  }
}
```

## Frontend Flow

### Client Infrastructure

Core files:

- `apps/web/src/lib/api-client.ts`
- `apps/web/src/lib/auth-token-store.ts`
- `apps/web/src/lib/csrf-token.ts`
- `apps/web/src/stores/auth-store.ts`

Important behavior:

- Axios is created with `withCredentials: true`, so cookies participate in auth requests.
- The access token is stored only in the module-local variable in `auth-token-store.ts`.
- Request interceptor adds the Bearer token when present.
- Request interceptor also adds `X-CSRF-Token` for refresh and logout requests.
- Response interceptor catches `401` responses, performs `/auth/refresh`, stores the new access token, and retries the original request.
- If refresh fails, the access token is cleared and the browser is redirected to `/login`.

This means browser refreshes behave like this:

1. In-memory access token is lost.
2. Protected API call returns `401`.
3. Axios automatically calls `/auth/refresh` using cookies.
4. New access token is stored in memory.
5. Original request is retried.

### Redux Auth State

The auth slice lives in `apps/web/src/stores/auth-store.ts`.

It tracks:

- `user`
- `isAuthenticated`
- `isLoading`
- `error` and `errorCode`
- `notice`
- registration verification state
- OTP request state

Key thunks:

| Thunk                     | API call                         | Result                                            |
| ------------------------- | -------------------------------- | ------------------------------------------------- |
| `login`                   | `POST /auth/login`               | Stores access token and user                      |
| `register`                | `POST /auth/register`            | Stores pending verification info, not a session   |
| `resendVerificationEmail` | `POST /auth/resend-verification` | Updates notice                                    |
| `fetchProfile`            | `GET /auth/me`                   | Marks user authenticated                          |
| `logoutUser`              | `POST /auth/logout`              | Clears local auth state even if server call fails |
| `requestOtp`              | `POST /auth/otp/request`         | Stores `otpSentTo`                                |
| `verifyOtp`               | `POST /auth/otp/verify`          | Stores access token and user                      |

### Register Screen

Frontend files:

- `apps/web/src/app/(auth)/register/page.tsx`
- `apps/web/src/components/auth/social-auth-buttons.tsx`

Flow:

1. User submits name, email, and password.
2. The page dispatches `register`.
3. On success:
   - The UI stays unauthenticated.
   - The slice stores `pendingVerificationEmail` and `pendingVerificationState`.
   - The page switches to a confirmation panel instead of redirecting.
4. The user can:
   - resend the verification email
   - go to login after verifying
   - reset the form and use a different email

### Login Screen

Frontend file:

- `apps/web/src/app/(auth)/login/page.tsx`

Flow:

1. The page supports two tabs:
   - Password
   - Email Code
2. Password login dispatches `login`.
3. On success:
   - access token is stored in memory
   - user is stored in Redux
   - router navigates to `/dashboard`
4. The page reads query params on load:
   - `verification=success` shows a success notice
   - `verification=invalid` shows an error
   - `oauth=error` shows a social sign-in error
5. If the backend returned `EMAIL_UNVERIFIED` and the user typed an email, the page exposes a "Resend verification email" action.

### OTP Screen Behavior

Frontend file:

- `apps/web/src/components/auth/otp-login-form.tsx`

Flow:

1. User enters email and requests a code.
2. The slice stores `otpSentTo`.
3. The UI switches from email entry to 6-digit OTP entry.
4. On successful verification:
   - access token is stored in memory
   - user is stored in Redux
   - router navigates to `/dashboard`

### Social Login Buttons

Frontend file:

- `apps/web/src/components/auth/social-auth-buttons.tsx`

Flow:

1. Clicking Google or GitHub sets `window.location.href` to:
   - `${NEXT_PUBLIC_API_URL}/auth/oauth/google/start`
   - `${NEXT_PUBLIC_API_URL}/auth/oauth/github/start`
2. From there, the backend owns the OAuth redirect flow.

### Google One Tap on the Landing Page

Frontend file:

- `apps/web/src/components/marketing/landing-page.tsx`

Flow:

1. The landing page loads the Google Identity Services script when `googleClientId` is available.
2. On a Google credential callback, it posts `credential` to `/auth/oauth/google/one-tap`.
3. On success:
   - access token is stored in memory
   - refresh and CSRF cookies are already set by the backend response
   - the browser navigates to `/dashboard`

### Dashboard Bootstrap and Route Protection

Frontend file:

- `apps/web/src/app/(dashboard)/dashboard-shell.tsx`

Flow:

1. Protected dashboard pages mount `DashboardLayout`.
2. If there is no user in Redux, the layout dispatches `fetchProfile()`.
3. If `fetchProfile()` ultimately fails, the user is redirected to `/login`.
4. If it succeeds, the app then loads workspaces.

This is the main frontend gate for authenticated pages.

### Real-Time Socket Auth

Frontend file:

- `apps/web/src/lib/socket-client.ts`

The socket client reuses the same in-memory access token by sending it in `socket.auth.token`. That means socket authentication depends on the same access-token lifecycle as the REST client.

## End-to-End Sequence Summaries

### Password Login

1. User submits login form.
2. Frontend calls `POST /auth/login`.
3. Backend validates credentials and verification state.
4. Backend creates refresh session, sets cookies, returns access token.
5. Frontend stores access token in memory and navigates to `/dashboard`.
6. Dashboard uses `/auth/me` with Bearer auth when needed.

### OAuth Login

1. User clicks Google or GitHub.
2. Browser navigates to backend OAuth start route.
3. Backend stores state cookie and redirects to provider.
4. Provider redirects back to backend callback.
5. Backend validates state, links or creates user, sets auth cookies, redirects to `/dashboard`.
6. Frontend lands on dashboard without an in-memory access token.
7. First protected API call hits `401`, Axios refreshes using cookies, stores new access token, retries, and the app continues.

### Browser Refresh on an Authenticated Page

1. Page reload clears the in-memory access token.
2. A protected API request is sent without a Bearer token.
3. Backend returns `401`.
4. Axios interceptor calls `POST /auth/refresh` with cookies plus CSRF header.
5. Backend rotates the refresh token and returns a fresh access token.
6. Frontend stores the access token and retries the original request.

## Current Gaps and Notes

- Password reset is not implemented even though shared schemas exist.
- Logout-all is implemented on the backend but not surfaced in the current web auth flow.
- In production, email verification is mandatory for password login.
- In non-production, registration effectively creates already-verified accounts.
- OAuth callback flow depends on refresh-based rehydration because the frontend does not receive the access token directly in the redirect response.
- CSRF protection is applied to refresh and logout, but not to login or register.
- The frontend intentionally avoids persistent access-token storage, which reduces exposure to token theft through browser storage.
