# Claude Code Guide For FlowForge

## Start Here

- Use current source files as the authority.
- Work in the workspace that owns the behavior. Touch `packages/shared` only for shared contracts.
- Make the smallest valid change.
- Search before creating code; reuse or extend nearby components, hooks, utils, services, and abstractions first.
- Do not add dependencies, folders, or new patterns unless the task explicitly asks for them.
- Do not edit generated output such as `apps/web/.next`, `apps/web/test-results`, or `dist`.

## Repo Map

- `packages/shared`: shared Zod schemas, permissions, step types, and shared TypeScript types.
- `apps/api`: Express API with middleware, controllers, services, models, execution engine, and real-time wiring.
- `apps/web`: Next.js App Router frontend with Redux Toolkit, Axios, Tailwind, and Radix-based UI primitives.
- `docs/cookie-consent-readiness-checklist.md`: required if non-essential storage or tracking is introduced.

## How To Triage A Task

- Check the relevant workspace `package.json` first.
- If the task changes requests, responses, permissions, or workflow step types, inspect `packages/shared` first.
- Backend changes: read route -> middleware -> controller -> service -> model or engine -> nearby tests.
- Frontend changes: read app route -> Redux slice and selectors -> nearest feature components -> Playwright mocks if needed.
- Search these locations before creating new code:
  - `apps/web/src/components/ui`
  - `apps/web/src/components`
  - `apps/web/src/hooks`
  - `apps/web/src/lib`
  - `apps/web/src/stores`
  - `apps/api/src`
  - `packages/shared/src`

## Implementation Guardrails

- Backend routes should keep the existing authenticated flow: `authenticate` -> `validate` -> `requirePermission` -> controller.
- Workspace-scoped routes use `:workspaceId`.
- Reuse shared Zod schemas from `@flowforge/shared` through `apps/api/src/middleware/validate.middleware.ts`.
- Keep controllers static and thin. Keep business rules in services.
- Preserve API response envelopes: `success`, `data`, `error`, `context`, and `pagination` where applicable.
- API imports are relative except for `@flowforge/shared`.
- Workflow step changes must stay aligned across `packages/shared`, the API handler registration, and the web step catalog.
- Frontend work should stay inside the current App Router + Redux Toolkit + Axios pattern.
- Use `createAsyncThunk`, typed store hooks, selectors, `apps/web/src/lib/api-client.ts`, and `apps/web/src/lib/api-error.ts` instead of ad hoc state or fetch code.
- Reuse `apps/web/src/components/ui` primitives and existing helpers before creating new UI code.
- Keep styling inside `apps/web/src/app/globals.css` and `apps/web/tailwind.config.ts`. Reuse current tokens, spacing, border radii, and animation names.
- Preserve Radix accessibility behavior, existing redirect and dialog flows, and current `data-testid` values used by Playwright.
- The workflow editor is the custom builder in `apps/web/src/components/workflow/workflow-builder`, not a React Flow graph.
- Do not place new production code in `apps/web/src/v2` unless the task explicitly targets it.
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

- There is no standalone `typecheck` script; use `npm run build`.
- If `packages/shared` changed and you are validating an individual app, rebuild shared first.
- Run the smallest relevant checks for the area you changed.
- If the task touches browser storage, analytics, or marketing scripts, review `docs/cookie-consent-readiness-checklist.md` before implementation.
