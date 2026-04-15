# FlowForge Copilot Instructions

## Repo Shape

- This repo is an npm workspace monorepo with three active workspaces: `packages/shared`, `apps/api`, and `apps/web`.
- `packages/shared` owns shared Zod schemas, permission constants, step types, and shared TypeScript types. Update it first when a contract crosses API and web.
- Ignore generated output such as `apps/web/.next`, `apps/web/test-results`, and `dist` unless the task explicitly targets generated artifacts.

## Default Change Behavior

- Make the smallest valid change.
- Preserve existing architecture, naming, file placement, imports, styling, and UX behavior.
- Search before creating a component, hook, util, service, helper, or abstraction; reuse or extend existing code first.
- Do not add dependencies, folders, state layers, data-fetching patterns, or new abstractions unless the task explicitly requires them.

## Backend

- Keep the existing flow: route -> middleware -> controller -> service -> model or engine.
- Workspace-scoped routes use `:workspaceId`.
- Validate params, query, and body with shared Zod schemas from `@flowforge/shared` through `apps/api/src/middleware/validate.middleware.ts`.
- Keep controllers thin and static; keep business rules in services.
- Preserve response envelopes: `{ success, data?, error?, context?, pagination? }`.
- API imports are relative except for `@flowforge/shared`.
- Workflow step changes must stay aligned across `packages/shared`, `apps/api/src/engine/register-step-handlers.ts`, and the web builder or step catalog.

## Frontend

- Follow the current Next.js App Router + client-side Redux Toolkit + Axios pattern.
- Use `createAsyncThunk`, the typed Redux hooks and selectors in `apps/web/src/stores`, `apps/web/src/lib/api-client.ts`, and `apps/web/src/lib/api-error.ts`.
- Do not introduce Zustand, React Query, SWR, server actions, or a second API client unless explicitly requested.
- Reuse `apps/web/src/components/ui` primitives and `cn` from `apps/web/src/lib/utils.ts` before creating new UI code.
- Stay inside the current Tailwind + CSS-variable system in `apps/web/src/app/globals.css` and `apps/web/tailwind.config.ts`. Reuse existing tokens, spacing, radius, and animation names.
- Preserve Radix accessibility behavior and existing `data-testid` values in auth, theme, and workflow creation flows.
- The workflow editor is the custom builder in `apps/web/src/components/workflow/workflow-builder`, not a React Flow graph.

## Commands

- Install: `npm install`
- Infrastructure: `docker-compose up -d`
- Dev: `npm run dev`
- Lint: `npm run lint`
- Build and type validation: `npm run build` (there is no standalone `typecheck` script)
- Backend tests: `npm test --workspace=apps/api`
- Frontend selector tests: `npm run test:selectors --workspace=apps/web`
- Frontend E2E: `npm run e2e --workspace=apps/web`
- If `packages/shared` changes and you run app-local commands, rebuild it first with `npm run build --workspace=packages/shared`.
- If a task adds analytics, marketing scripts, or non-essential browser storage, follow `docs/cookie-consent-readiness-checklist.md`.
