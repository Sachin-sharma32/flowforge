# FlowForge Agent Guide

## Operating Rules

- Trust the source tree over older prose.
- Work in the workspace that owns the behavior. Touch `packages/shared` only when a contract crosses API and web.
- Make the smallest valid change.
- Search before creating a component, hook, util, service, helper, or abstraction; reuse or extend nearby code first.
- Do not add dependencies, folders, abstractions, or new patterns unless the task explicitly asks for them.
- Do not edit generated output such as `apps/web/.next`, `apps/web/test-results`, or `dist`.

## Repo Landmarks

- `packages/shared`: shared Zod schemas, permission constants, step types, and shared TypeScript types.
- `apps/api`: Express API, middleware, controllers, services, models, execution engine, and real-time wiring.
- `apps/web`: Next.js App Router frontend, Redux Toolkit state, Axios client, Tailwind, and Radix-based UI.
- `docs/cookie-consent-readiness-checklist.md`: release gate for analytics, marketing scripts, and non-essential browser storage.

## How To Start

- Check the relevant workspace `package.json` first for scripts and dependencies.
- If the task changes requests, responses, permissions, or workflow step types, inspect `packages/shared` first.
- Backend slice: route -> middleware -> controller -> service -> model or engine -> nearby tests.
- Frontend slice: app route -> store slice and selectors -> feature components -> Playwright mocks if the UI depends on API shape.
- Search here before creating code:
  - `apps/web/src/components/ui`
  - `apps/web/src/components`
  - `apps/web/src/hooks`
  - `apps/web/src/lib`
  - `apps/web/src/stores`
  - `apps/api/src`
  - `packages/shared/src`

## Backend Rules

- For authenticated routes, keep middleware order consistent: `authenticate` -> `validate` -> `requirePermission` -> controller.
- Workspace-scoped params use `:workspaceId`.
- Validate requests with shared Zod schemas through `apps/api/src/middleware/validate.middleware.ts`; do not duplicate request validation in controllers.
- Keep controllers thin and static. Put business rules in services.
- Keep API response envelopes consistent: `success`, `data`, `error`, `context`, and `pagination` where applicable.
- API imports are relative except for `@flowforge/shared`.
- When adding or changing a workflow step type, update `packages/shared`, the API handler registration, and the web step catalog together.
- Put backend tests next to the code under `apps/api/src/**/__tests__`. Route tests boot the app and use `fetch`; service tests use Jest directly.

## Frontend Rules

- Keep page code in `apps/web/src/app` and feature UI in the nearest folder under `apps/web/src/components`.
- Follow the existing App Router + client-side Redux Toolkit pattern. Do not add a new state or data-fetching layer unless asked.
- Use `createAsyncThunk`, `apps/web/src/stores/hooks.ts`, and `apps/web/src/stores/selectors` instead of ad hoc state logic.
- Use `apps/web/src/lib/api-client.ts` and `apps/web/src/lib/api-error.ts` for API work.
- Reuse `apps/web/src/components/ui` primitives, dialogs, charts, and toasts before adding new components.
- Use `@/` imports in the web app.
- Keep styling inside `apps/web/src/app/globals.css` and `apps/web/tailwind.config.ts`. Reuse current tokens, spacing, border radii, and animation names.
- Preserve Radix accessibility behavior, existing redirect and dialog flows, and current `data-testid` values used by Playwright.
- The workflow editor is the custom builder in `apps/web/src/components/workflow/workflow-builder`, not a React Flow graph.
- Do not place new production features in `apps/web/src/v2` unless the task explicitly targets that subtree.
- Update `apps/web/e2e/support/mock-api.ts` when UI behavior depends on API response shapes.

## Validation

```bash
# Infrastructure
docker-compose up -d

# Install
npm install

# Development
npm run dev

# Shared package build
npm run build --workspace=packages/shared

# Full build / type validation
npm run build

# Lint
npm run lint

# Backend tests
npm test --workspace=apps/api
npm test --workspace=apps/api -- --coverage
npm test --workspace=apps/api -- --testPathPattern=<pattern>

# Frontend tests
npm run test:selectors --workspace=apps/web
npm run e2e --workspace=apps/web
npm run e2e:headed --workspace=apps/web
```

- There is no standalone `typecheck` script; use `npm run build` for type and build validation.
- If `packages/shared` changed and you are validating an individual app, rebuild shared first.
- Run the smallest relevant checks for the area you changed.
- If you change browser storage, analytics, or marketing scripts, review `docs/cookie-consent-readiness-checklist.md` before implementation.
