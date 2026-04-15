---
description: 'Use when editing Express routes, controllers, services, middleware, models, or workflow engine files in apps/api/src. Covers route middleware order, shared Zod validation, response envelopes, imports, step registration, and backend test placement.'
name: 'FlowForge API Instructions'
applyTo: 'apps/api/src/**'
---

# FlowForge API Instructions

- Keep the existing backend slice intact: route -> middleware -> controller -> service -> model or engine.
- For authenticated routes, keep middleware order consistent: `authenticate` -> `validate` -> `requirePermission` -> controller.
- Workspace-scoped params use `:workspaceId`.
- Reuse shared Zod schemas from `@flowforge/shared` through `apps/api/src/middleware/validate.middleware.ts`; do not duplicate request validation in controllers.
- Keep controllers thin and static. Keep business rules in services.
- Preserve API response envelopes: `success`, `data`, `error`, `context`, and `pagination` where applicable.
- API imports are relative except for `@flowforge/shared`.
- If you add or change a workflow step type, keep `packages/shared`, `apps/api/src/engine/register-step-handlers.ts`, and the frontend step catalog aligned.
- Put backend tests next to the changed code under `apps/api/src/**/__tests__`. Route tests boot the app and use `fetch`; service tests use Jest directly.
