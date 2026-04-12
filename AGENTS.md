# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Start infrastructure (MongoDB + Redis)
docker-compose up -d

# Install dependencies and build shared package first
npm install
npm run build --workspace=packages/shared

# Run all services concurrently (API :4000, Web :3000, Shared watch)
npm run dev

# Run individual workspaces
npm run dev -w @flowforge/api
npm run dev -w @flowforge/web

# Testing (backend only, uses mongodb-memory-server)
npm test --workspace=apps/api
npm test --workspace=apps/api -- --coverage
npm test --workspace=apps/api -- --testPathPattern=<pattern>

# Lint & Format
npm run lint
npm run format
npm run format:check
```

## Architecture

**Monorepo** with three workspaces:

- `packages/shared` — Zod validation schemas, TypeScript interfaces, constants (roles, step types, statuses). Consumed by both API and web.
- `apps/api` — Express.js backend (TypeScript, CommonJS)
- `apps/web` — Next.js 14 App Router frontend (TypeScript, Tailwind, shadcn/ui)

### Backend (apps/api)

Clean architecture: `domain/` → `services/` → `controllers/` → `routes/`

- **Execution engine** (`engine/`): `WorkflowProcessor` orchestrates execution; `StepFactory` maps step types to handlers (http_request, condition, transform, delay, send_email, slack_message). Add new step types by implementing `IStepHandler` and registering in the factory.
- **EventBus** (`infrastructure/event-bus.ts`): Singleton using Redis pub/sub + Socket.io for real-time execution updates. Broadcasts to workspace rooms: `workspace:{id}:executions`.
- **Auth**: JWT access tokens (15min) + refresh token rotation (7d). RBAC middleware checks org→workspace→member hierarchy with roles: Owner, Admin, Editor, Viewer.
- **Queue**: BullMQ on Redis for workflow execution jobs.
- **Database**: MongoDB via Mongoose. Models: User, Workflow, Execution, Workspace, Organization, AuditLog.
- **Config**: Zod-validated env vars in `config/index.ts` — process exits on invalid config.

### Frontend (apps/web)

- **State**: Redux Toolkit for auth, Zustand for workflows/executions/workspace.
- **Visual builder**: React Flow (`@xyflow/react`) in `components/workflow/workflow-builder/canvas.tsx`.
- **Real-time**: Socket.io client in `lib/socket-client.ts` for live execution updates.
- **API client**: Axios wrapper in `lib/api-client.ts`.

### API Convention

REST at `/api/v1`. All responses: `{ success: boolean, data?: T, error?: string }`. Workspace-scoped routes: `/workspaces/:wId/workflows`, `/workspaces/:wId/executions`. Webhook ingress: `/webhooks/:wId/:path`.

## Key Patterns

- Validation schemas in `packages/shared` are the source of truth — used on both client and server.
- Manual dependency injection (no DI framework).
- Middleware-based RBAC: routes declare required permissions.
- Step handlers follow adapter pattern with uniform `execute(context)` / `validate(config)` interface.
- Structured logging via Pino (pino-pretty in dev).

## Testing

Backend tests use Jest + ts-jest with in-memory MongoDB (`mongodb-memory-server`). No frontend tests configured. CI runs lint → test (with Redis service) → build.
