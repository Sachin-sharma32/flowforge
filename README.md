# FlowForge

A visual workflow automation platform for building event-driven pipelines with a drag-and-drop interface. Think Zapier/n8n — with real-time execution monitoring, multi-tenant workspaces, and role-based access control.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│   Next.js 14 (App Router) + React 18 + TypeScript            │
│   Tailwind CSS + shadcn/ui + React Flow (visual builder)     │
│   Redux Toolkit (auth) + Zustand (workflows, executions)     │
│   Socket.io Client (real-time execution updates)             │
└──────────────────┬──────────────────┬───────────────────────┘
                   │ REST API          │ WebSocket
┌──────────────────▼──────────────────▼───────────────────────┐
│                        Backend                               │
│   Express + TypeScript + Clean Architecture                  │
│                                                              │
│   ┌─────────┐  ┌──────────┐  ┌────────────┐  ┌──────────┐  │
│   │  Routes  │→│Controllers│→│  Services   │→│   Repos   │  │
│   └─────────┘  └──────────┘  └────────────┘  └──────────┘  │
│                                    │                         │
│   ┌────────────────────────────────▼───────────────────────┐ │
│   │              Execution Engine                          │ │
│   │   Trigger → Queue → WorkflowProcessor → StepFactory    │ │
│   │                                          ├─ HTTP       │ │
│   │              ┌──────────────┐            ├─ Condition  │ │
│   │              │   EventBus   │            ├─ Transform  │ │
│   │              │ (Redis PubSub)│           ├─ Email      │ │
│   │              └──────┬───────┘            ├─ Slack      │ │
│   │                     │                    └─ Delay      │ │
│   └─────────────────────┼──────────────────────────────────┘ │
│                         │ Socket.io broadcast                │
│   Middleware: JWT Auth │ RBAC │ Rate Limit │ Zod Validation  │
└───────┬─────────────────┼──────────────────┬────────────────┘
        │                 │                  │
   ┌────▼────┐    ┌──────▼──────┐    ┌──────▼──────┐
   │ MongoDB │    │    Redis    │    │   BullMQ    │
   │(schemas,│    │  (pub/sub,  │    │  (job queue) │
   │ indexes)│    │   cache)    │    │              │
   └─────────┘    └─────────────┘    └──────────────┘
```

## Tech Stack

| Layer            | Technology                                                             |
| ---------------- | ---------------------------------------------------------------------- |
| Frontend         | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, shadcn/ui |
| Visual Builder   | React Flow (@xyflow/react v12)                                         |
| State Management | Redux Toolkit (auth) + Zustand (workflows, executions)                 |
| Backend          | Express, TypeScript, Clean Architecture                                |
| Database         | MongoDB + Mongoose                                                     |
| Cache & Queue    | Redis, BullMQ                                                          |
| Real-time        | Socket.io                                                              |
| Validation       | Zod (shared between frontend and backend)                              |
| Testing          | Jest + mongodb-memory-server, Playwright                               |
| Logging          | Pino (structured JSON logging)                                         |
| CI/CD            | GitHub Actions                                                         |
| Infrastructure   | Docker multi-stage builds                                              |

## Key Features

- **Visual Workflow Builder** — Drag-and-drop canvas with custom nodes (triggers, actions, conditions) powered by React Flow
- **Event-Driven Execution Engine** — Factory pattern dispatches to typed step handlers; supports branching, error propagation, and step-level tracing
- **Real-time Monitoring** — Socket.io broadcasts step-by-step execution updates via Redis pub/sub
- **Multi-Tenant RBAC** — Organization → Workspace → Member hierarchy with Owner/Admin/Editor/Viewer roles
- **Webhook & Cron Triggers** — Inbound webhooks and scheduled triggers fire workflows automatically
- **Integration Adapters** — HTTP Request, Email (SendGrid), Slack — extensible adapter pattern
- **Security Hardened** — Helmet, CORS, rate limiting, Zod validation, JWT with refresh token rotation

## Project Structure

```
flowforge/
├── apps/
│   ├── api/                    # Express + TypeScript backend
│   │   └── src/
│   │       ├── config/         # Env validation, DB, Redis, Socket.io setup
│   │       ├── domain/         # Errors, events, interfaces (no framework deps)
│   │       ├── models/         # Mongoose schemas
│   │       ├── services/       # Business logic
│   │       ├── controllers/    # Thin HTTP handlers
│   │       ├── routes/         # Express routes
│   │       ├── middleware/     # Auth, RBAC, validation, rate limiting
│   │       ├── engine/         # ★ StepFactory, WorkflowProcessor, handlers
│   │       └── infrastructure/ # EventBus, logger, realtime service
│   └── web/                    # Next.js 14 frontend
│       └── src/
│           ├── app/            # App Router pages
│           ├── components/     # UI, layout, workflow builder, execution
│           ├── stores/         # Redux (auth) + Zustand (workflows, executions)
│           ├── hooks/          # useExecutionSocket, useDebounce
│           └── lib/            # API client, Socket.io client, utils
├── packages/
│   └── shared/                 # Shared types, constants, Zod schemas
├── docker-compose.yml          # MongoDB + Redis
└── .github/workflows/ci.yml   # Lint, test, build, Docker
```

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose (for MongoDB and Redis)

### Setup

```bash
# Clone the repository
git clone https://github.com/your-username/flowforge.git
cd flowforge

# Start MongoDB and Redis
docker-compose up -d

# Install dependencies
npm install

# Build shared package
npm run build --workspace=packages/shared

# Create environment file
cp apps/api/.env.example apps/api/.env

# Start development servers
npm run dev
```

The API runs on `http://localhost:4000` and the frontend on `http://localhost:3000`.

### Running Tests

```bash
# Backend unit tests
npm test --workspace=apps/api

# With coverage
npm test --workspace=apps/api -- --coverage

# Frontend E2E (Playwright, mocked API)
npm run e2e --workspace=apps/web

# Optional E2E modes
npm run e2e:headed --workspace=apps/web
npm run e2e:ui --workspace=apps/web
```

### Docker Build

```bash
# Build API
docker build -t flowforge-api apps/api

# Build Web
docker build -t flowforge-web apps/web
```

## Design Patterns

| Pattern                | Where                                       | Why                                                       |
| ---------------------- | ------------------------------------------- | --------------------------------------------------------- |
| **Factory**            | `StepFactory` — maps step types to handlers | Extensible step execution without modifying the processor |
| **Adapter**            | Integration handlers (HTTP, Email, Slack)   | Uniform interface for diverse external services           |
| **Composition Root**   | `container.ts` — manual DI wiring           | Explicit dependency graph, no DI framework magic          |
| **Event-Driven**       | `EventBus` — Redis pub/sub → Socket.io      | Decoupled execution from real-time broadcasting           |
| **Clean Architecture** | Domain → Repo → Service → Controller        | Domain logic has zero framework dependencies              |
| **RBAC Middleware**    | Permission checks on workspace membership   | Declarative access control per route                      |

## API Endpoints

| Method | Endpoint                                        | Description                        |
| ------ | ----------------------------------------------- | ---------------------------------- |
| POST   | `/api/v1/auth/register`                         | Register + create org/workspace    |
| POST   | `/api/v1/auth/login`                            | Login, returns JWT + refresh token |
| GET    | `/api/v1/workspaces`                            | List user's workspaces             |
| POST   | `/api/v1/workspaces/:id/members`                | Invite member                      |
| GET    | `/api/v1/workspaces/:wId/workflows`             | List workflows                     |
| POST   | `/api/v1/workspaces/:wId/workflows`             | Create workflow                    |
| PATCH  | `/api/v1/workspaces/:wId/workflows/:id`         | Update workflow (steps, config)    |
| POST   | `/api/v1/workspaces/:wId/workflows/:id/execute` | Trigger manual execution           |
| GET    | `/api/v1/workspaces/:wId/executions`            | List executions                    |
| GET    | `/api/v1/workspaces/:wId/executions/:id`        | Execution detail with step trace   |
| GET    | `/api/v1/workspaces/:wId/executions/stats`      | Aggregated execution stats         |
| POST   | `/api/v1/webhooks/:wId/:path`                   | Inbound webhook trigger            |

## License

MIT
