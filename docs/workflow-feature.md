# Workflow Feature

This document describes the workflow feature as currently implemented across `packages/shared`, `apps/api`, and `apps/web`.

## Scope

This document covers:

- workflow creation
- template-based creation
- folder assignment and folder-based access control
- workflow editing in the custom builder
- activation and pause lifecycle
- manual execution
- webhook-triggered execution
- execution monitoring and analytics
- real-time execution updates
- supported step types and their current capabilities

This document also calls out important limits in the current implementation:

- `cron` is modeled in shared types and UI labels, but no scheduler-backed cron execution path is currently wired in `apps/api`
- this document reflects current code, not roadmap intent

## High-Level Lifecycle

1. A user creates a workflow from `/workflows/new` or creates a draft from a workspace template on `/templates`.
2. The frontend persists workflow metadata and the initial trigger with `POST /workspaces/:workspaceId/workflows`.
3. The user opens `/workflows/:id/edit`, where the custom builder loads the workflow and renders a static, sequential step editor.
4. Builder edits are auto-saved through `PATCH /workspaces/:workspaceId/workflows/:id`.
5. The user activates or pauses the workflow from `/workflows/:id`.
6. The workflow executes either manually through `POST /workspaces/:workspaceId/workflows/:id/execute` or automatically through `/webhooks/:workspaceId/:path`.
7. `WorkflowProcessor` loads the execution, resolves entry steps, runs registered step handlers, and records step-level state.
8. The user observes execution detail, step timeline, aggregate stats, and real-time updates in the executions UI.

## Shared Contracts

Shared workflow contracts live in `packages/shared/src/types/workflow.types.ts`, `packages/shared/src/validation/workflow.schema.ts`, `packages/shared/src/validation/request.schema.ts`, and `packages/shared/src/constants`.

### Core workflow types

- `IWorkflow` describes the full stored workflow shape, including `trigger`, `steps`, `variables`, `status`, `version`, and audit timestamps.
- `IWorkflowListItem` describes list responses used by the workflow index and related UI.
- `IWorkflowStep` describes each persisted step with:
  - `id`
  - `type`
  - `name`
  - `config`
  - `position`
  - `connections`
- `IWorkflowTrigger` describes the workflow trigger as `type` plus free-form `config`.

### Workflow statuses

Current workflow statuses are:

- `draft`
- `active`
- `paused`
- `archived`

### Execution statuses relevant to workflow monitoring

Current execution statuses are:

- `pending`
- `running`
- `completed`
- `failed`
- `cancelled`

Current execution step statuses are:

- `pending`
- `running`
- `completed`
- `failed`
- `skipped`

### Trigger types

Current trigger types are:

- `webhook`
- `cron`
- `manual`

`cron` is valid at the schema level and appears in the UI, but there is no scheduler path in the API that creates cron-triggered executions today.

### Supported step types

Current step types are:

- `http_request`
- `condition`
- `transform`
- `delay`
- `send_email`
- `slack_message`
- `google_drive`
- `google_calendar`
- `gmail`
- `notion`

### Validation model

`createWorkflowSchema` and `updateWorkflowSchema` validate the request envelope, trigger shape, step array shape, and variables array with Zod.

Workflow graph correctness is not enforced by Zod alone. `WorkflowService.validateSteps` performs service-layer validation for:

- registered step type existence
- step handler config validation
- duplicate step IDs
- invalid condition branch labels
- missing connection targets
- self-loops
- missing entry steps
- circular graphs

## Permissions

Workflow permissions are defined in `packages/shared/src/constants/roles.ts`.

Relevant permissions are:

- `view_workflows`
- `create_workflow`
- `edit_workflow`
- `delete_workflow`
- `execute_workflow`
- `view_executions`
- `cancel_execution`

Folder-scoped workflows may still be filtered or blocked after workspace permission checks based on folder access requirements.

## Backend Route Map

Workflow routes are registered in `apps/api/src/routes/workflow.routes.ts`. Execution monitoring routes are in `apps/api/src/routes/execution.routes.ts`. Webhook ingress routes are in `apps/api/src/routes/webhook.routes.ts`.

### Workflow and webhook routes

| Method   | Route                                                          | Middleware order                                                                            | Purpose                                                |
| -------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `GET`    | `/workspaces/:workspaceId/workflows/templates/list`            | `authenticate -> validate(params) -> requirePermission(view_workflows)`                     | List workspace template workflows                      |
| `POST`   | `/workspaces/:workspaceId/workflows/templates/:templateId/use` | `authenticate -> validate(params) -> requirePermission(create_workflow)`                    | Create a new draft workflow from a workspace template  |
| `GET`    | `/workspaces/:workspaceId/workflows`                           | `authenticate -> validate(params) -> validate(query) -> requirePermission(view_workflows)`  | List workflows with filtering and pagination           |
| `POST`   | `/workspaces/:workspaceId/workflows`                           | `authenticate -> validate(params) -> requirePermission(create_workflow) -> validate(body)`  | Create a workflow                                      |
| `GET`    | `/workspaces/:workspaceId/workflows/:id`                       | `authenticate -> validate(params) -> requirePermission(view_workflows)`                     | Get workflow detail                                    |
| `PATCH`  | `/workspaces/:workspaceId/workflows/:id`                       | `authenticate -> validate(params) -> requirePermission(edit_workflow) -> validate(body)`    | Update workflow metadata, trigger, steps, or variables |
| `DELETE` | `/workspaces/:workspaceId/workflows/:id`                       | `authenticate -> validate(params) -> requirePermission(delete_workflow)`                    | Archive a workflow                                     |
| `POST`   | `/workspaces/:workspaceId/workflows/:id/duplicate`             | `authenticate -> validate(params) -> requirePermission(create_workflow)`                    | Duplicate a workflow                                   |
| `POST`   | `/workspaces/:workspaceId/workflows/:id/activate`              | `authenticate -> validate(params) -> requirePermission(edit_workflow)`                      | Activate a draft or paused workflow                    |
| `POST`   | `/workspaces/:workspaceId/workflows/:id/pause`                 | `authenticate -> validate(params) -> requirePermission(edit_workflow)`                      | Pause an active workflow                               |
| `POST`   | `/workspaces/:workspaceId/workflows/:id/execute`               | `authenticate -> validate(params) -> validate(body) -> requirePermission(execute_workflow)` | Trigger a manual execution                             |
| `POST`   | `/webhooks/:workspaceId/:path`                                 | `validate(params)`                                                                          | Trigger a webhook workflow without auth                |
| `GET`    | `/webhooks/:workspaceId/:path`                                 | `validate(params)`                                                                          | Trigger a webhook workflow without auth                |

Authenticated workflow routes consistently use `authenticate -> validate -> requirePermission -> controller`, with body validation added where needed. Webhook routes are unauthenticated and rely on workspace-level webhook secrets or signatures instead.

### Execution routes used by workflow monitoring

| Method | Route                                                   | Middleware order                                                                            | Purpose                               |
| ------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------- |
| `GET`  | `/workspaces/:workspaceId/executions`                   | `authenticate -> validate(params) -> validate(query) -> requirePermission(view_executions)` | List executions                       |
| `GET`  | `/workspaces/:workspaceId/executions/stats`             | `authenticate -> validate(params) -> requirePermission(view_executions)`                    | Aggregate execution stats             |
| `GET`  | `/workspaces/:workspaceId/executions/stats/timeline`    | `authenticate -> validate(params) -> validate(query) -> requirePermission(view_executions)` | Daily execution timeline              |
| `GET`  | `/workspaces/:workspaceId/executions/stats/by-workflow` | `authenticate -> validate(params) -> requirePermission(view_executions)`                    | Top workflow execution stats          |
| `GET`  | `/workspaces/:workspaceId/executions/:id`               | `authenticate -> validate(params) -> requirePermission(view_executions)`                    | Execution detail                      |
| `POST` | `/workspaces/:workspaceId/executions/:id/cancel`        | `authenticate -> validate(params) -> requirePermission(cancel_execution)`                   | Cancel a pending or running execution |

## Workflow Service Behavior

Workflow business rules live in `apps/api/src/services/workflow.service.ts`.

### List and retrieval behavior

- list excludes workflows with `status: 'archived'`
- list excludes template workflows with `isTemplate: true`
- list supports:
  - `status`
  - `folderId`
  - `search`
  - `sortBy`
  - `sortOrder`
  - `dateFrom`
  - `dateTo`
  - pagination via `page` and `limit`
- list sorts by `updatedAt`, `createdAt`, `name`, or `lastExecutedAt`
- list filters non-owner users by folder access via `getAccessibleFolderIds`
- `getById` also enforces folder access checks when a workflow belongs to a folder

### Create and update behavior

- create validates steps when the incoming step array is non-empty
- create checks folder edit access when `folderId` is provided
- create persists `folderId` as `null` when omitted
- update loads the existing workflow first
- update validates steps if `steps` are supplied
- update recalculates folder access when `folderId` changes
- update increments `version` with `$inc: { version: 1 }`

### Delete, duplicate, activate, pause

- delete is archival, not hard deletion
- delete updates `status` to `archived`
- duplicate creates a new workflow named `<source name> (Copy)`
- activate only succeeds for workflows currently in `draft` or `paused`
- pause only succeeds for workflows currently in `active`

### Graph validation rules

`WorkflowService.validateSteps` applies these graph rules:

- no duplicate step IDs
- every step type must be registered in `StepFactory`
- every step config must pass the handler's `validate` method
- every connection target must exist
- steps cannot connect to themselves
- the workflow must include at least one entry step
- cycles are rejected
- condition step connections must use `true` or `false` labels
- condition steps cannot reuse the same branch label more than once

## Folder Access Behavior

Folder access logic lives in `apps/api/src/services/folder-access.service.ts`.

- workflows without a folder are visible outside folder-gated checks
- workflows inside folders are subject to per-action minimum role requirements
- folder actions are evaluated separately for:
  - `view`
  - `edit`
  - `execute`
- workflow list and execution list responses can omit folder-scoped data that the current workspace role cannot access
- workflow retrieval, update, execution, and cancellation can fail with folder access errors even when the user has the broader workspace permission

## Execution Model and Processing

Execution creation and monitoring logic lives in `apps/api/src/services/execution.service.ts`, `apps/api/src/models/execution.model.ts`, and `apps/api/src/engine/workflow-processor.ts`.

### Execution creation

`ExecutionService.create` performs the following:

1. Loads the workflow.
2. Checks folder execute access if the workflow belongs to a folder.
3. Rejects non-manual triggers unless the workflow status is `active`.
4. Loads the workspace and organization.
5. Reserves execution usage before creating the execution.
6. Creates an `Execution` document with:
   - `status: 'pending'`
   - `trigger.type`
   - `trigger.payload`
   - one pre-materialized step record per workflow step, all starting as `pending`
7. Updates `workflow.lastExecutedAt`.

### Manual vs automatic execution

- manual execution is allowed even when the workflow is not `active`
- non-manual execution is blocked unless the workflow is `active`

In practice, this means:

- `POST /workspaces/:workspaceId/workflows/:id/execute` can run draft or paused workflows
- webhook-triggered execution requires the workflow to be active

### Execution state progression

Execution status progresses through:

- `pending`
- `running`
- terminal state of `completed`, `failed`, or `cancelled`

Step status progresses independently for each step record:

- `pending`
- `running`
- `completed`
- `failed`
- `skipped`

### WorkflowProcessor behavior

`WorkflowProcessor.process`:

- acquires a Redis-backed lock per execution ID to avoid duplicate processing
- loads the execution and workflow
- marks the execution as `running`
- publishes `execution.started`
- resolves workflow variables into a simple key-value map
- computes entry steps as steps that are not targeted by any connection
- falls back to the first step if no entry step is found at runtime
- executes each entry path recursively through `executeStep`
- marks the execution `completed` or `failed`
- stores `durationMs`
- publishes terminal execution events

### Step execution behavior

For each step, `executeStep`:

- detects circular runtime traversal as a safety check
- marks the step record as `running`
- stores step input and timestamps
- creates the handler through `StepFactory`
- passes `config`, `input`, and `variables` through `StepContext`
- updates the step record with `output`, `error`, `completedAt`, and `durationMs`

Condition branching is selected from `result.output.branch`, which is expected to be either `true` or `false` as string labels. For condition steps, only the matching labeled connection is followed.

If any step fails:

- the step record is marked `failed`
- the execution is marked `failed`
- execution failure is published through the event bus
- downstream steps on that path do not continue

If a workflow has no steps:

- the processor marks the execution `completed`
- `startedAt`, `completedAt`, and `durationMs = 0` are set

## Webhook Behavior

Webhook ingress is implemented in `apps/api/src/routes/webhook.routes.ts` and `apps/api/src/controllers/webhook.controller.ts`.

### Request authentication

Webhook requests must provide one of these headers:

- `x-webhook-secret`
- `x-webhook-signature`

If `x-webhook-signature` is present, the controller computes an HMAC SHA-256 signature using the workspace webhook secret and `JSON.stringify(req.body)`. If the signature does not match, the request is rejected.

If `x-webhook-signature` is not present, the controller falls back to direct comparison against `x-webhook-secret`.

### Workflow matching

Webhook execution matches a workflow by:

- `workspaceId`
- `trigger.type = webhook`
- `trigger.config.path = :path`
- `status = active`

If no active workflow matches, the request fails with `No active workflow found for this webhook`.

### Stored webhook payload

Webhook-triggered executions store this trigger payload:

- `headers`
- `body`
- `query`
- `method`

The controller returns `200` with an execution ID and queued status after creating the execution and starting asynchronous processing.

## Frontend Workflow Experience

Workflow UI lives primarily in:

- `apps/web/src/app/(dashboard)/workflows`
- `apps/web/src/app/(dashboard)/templates`
- `apps/web/src/app/(dashboard)/executions`
- `apps/web/src/app/(dashboard)/folders`
- `apps/web/src/components/workflow/workflow-builder`
- `apps/web/src/stores/workflow-slice.ts`
- `apps/web/src/stores/execution-slice.ts`

### Current page structure

- `/workflows`
- `/workflows/new`
- `/workflows/[id]`
- `/workflows/[id]/edit`
- `/templates`
- `/folders`
- `/executions`
- `/executions/[id]`

### Workflow creation flow

`/workflows/new` currently:

- collects workflow name
- collects description
- optionally assigns a folder
- allows trigger selection between `manual`, `webhook`, and `cron`
- creates the workflow with an empty `steps` array
- redirects to `/workflows/:id/edit`

### Workflow detail flow

`/workflows/[id]` currently:

- fetches workflow detail
- fetches recent executions for the workflow
- allows duplicate
- allows activate or pause
- allows edit
- allows manual execution
- shows summary execution stats and the current step list

### Builder behavior

The current dashboard builder is not React Flow. It is a custom static, sequential builder implemented in `apps/web/src/components/workflow/workflow-builder/canvas.tsx`.

Current builder behavior:

- step ordering is linear
- steps can be reordered with drag-and-drop within the ordered list
- non-condition steps persist with an automatic `next` connection to the following step
- condition steps persist explicit `true` and `false` branch targets
- condition branch targets are limited in the UI to later steps to keep flow deterministic
- trigger is displayed in the editor but not edited there
- the builder shows flow checks before save
- auto-save uses a debounce of about 900 ms after edits
- page unload and unmount attempt to flush pending edits

### Variables in the frontend

Workflow variables exist in the shared contract and backend model, but there is no dedicated variable management UI in the current builder flow. The builder displays a tip about `{{variableName}}` usage, but users cannot manage the workflow-level variables array from the current editor screen.

### Templates UI behavior

The templates page mixes two kinds of template entry points:

- workspace templates loaded from the backend and created through `createFromTemplate`
- hardcoded recommendation cards that route to `/workflows/new` and do not instantiate a backend template record

## Supported Step Types

Step catalog definitions live in `apps/web/src/components/workflow/workflow-builder/step-catalog.ts`. Backend handlers are registered in `apps/api/src/engine/register-step-handlers.ts`.

| Type key          | UI label        | Category      | Default config shape                                   | Key validation rules                                                      | Handler file                                              | Notable operations / behavior                                                                                   |
| ----------------- | --------------- | ------------- | ------------------------------------------------------ | ------------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------- | ------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `http_request`    | HTTP Request    | core          | `url`, `method`                                        | URL required, method must be `GET                                         | POST                                                      | PUT                                                                                                             | PATCH    | DELETE` | `apps/api/src/engine/handlers/http-request.handler.ts` | Executes outbound HTTP calls, interpolates variables in the URL, returns status, headers, and parsed body |
| `condition`       | Condition       | core          | `field`, `operator`, `value`                           | field and operator required                                               | `apps/api/src/engine/handlers/condition.handler.ts`       | Evaluates input data and returns `branch: 'true'                                                                | 'false'` |
| `transform`       | Transform       | core          | `mappings` or `template`                               | at least one of `mappings` or `template` required                         | `apps/api/src/engine/handlers/transform.handler.ts`       | Supports field mapping plus transforms like `uppercase`, `trim`, `number`, `boolean`, `json_parse`, `stringify` |
| `delay`           | Delay           | core          | `durationMs`                                           | `durationMs` must be a non-negative number                                | `apps/api/src/engine/handlers/delay.handler.ts`           | Sleeps up to a capped maximum of 5 minutes                                                                      |
| `send_email`      | Send Email      | communication | `to`, `subject`, `body`                                | recipient, subject, and body required                                     | `apps/api/src/engine/handlers/send-email.handler.ts`      | Simulates email sending by logging; interpolates subject/body variables                                         |
| `slack_message`   | Slack Message   | communication | `webhookUrl`, `message`                                | webhook URL and message required                                          | `apps/api/src/engine/handlers/slack-message.handler.ts`   | Sends Slack webhook message; interpolates message variables                                                     |
| `google_drive`    | Google Drive    | integrations  | `operation`, `accessToken`, optional IDs and content   | access token required; operation-specific name required for create/upload | `apps/api/src/engine/handlers/google-drive.handler.ts`    | Supports `list_files`, `create_folder`, `upload_text_file`; interpolates several string fields                  |
| `google_calendar` | Google Calendar | integrations  | `operation`, `accessToken`, calendar fields            | access token required; create-event needs summary/start/end               | `apps/api/src/engine/handlers/google-calendar.handler.ts` | Supports `create_event`, `list_events`; interpolates IDs, summaries, descriptions, and date fields              |
| `gmail`           | Gmail           | integrations  | `operation`, `accessToken`, email fields               | access token required; send/draft require `to`, `subject`, `body`         | `apps/api/src/engine/handlers/gmail.handler.ts`           | Supports `send_email`, `create_draft`, `list_messages`; interpolates query and message fields                   |
| `notion`          | Notion          | integrations  | `operation`, `accessToken`, Notion IDs and text fields | access token required; operation-specific IDs required                    | `apps/api/src/engine/handlers/notion.handler.ts`          | Supports `create_page`, `append_block`, `query_database`; interpolates IDs and text fields                      |

### Variable interpolation support

Variable interpolation is currently implemented in these handlers:

- `http_request`
- `send_email`
- `slack_message`
- `google_drive`
- `google_calendar`
- `gmail`
- `notion`

`transform` resolves template placeholders against step input rather than the workflow variable map.

## Monitoring and Real-Time Updates

Monitoring behavior is spread across `apps/web/src/stores/execution-slice.ts`, `apps/web/src/hooks/use-execution-socket.ts`, `apps/web/src/components/execution/execution-timeline.tsx`, `apps/api/src/infrastructure/event-bus.ts`, and `apps/api/src/config/socket.ts`.

### Data flow

- workflow detail fetches the workflow and recent executions
- execution detail fetches the execution document and renders a step timeline
- execution stats endpoints feed dashboard and execution analytics views
- execution detail can render the original trigger payload

### Socket behavior

The frontend joins the Socket.io room:

- `workspace:${workspaceId}:executions`

The frontend listens for:

- `step.started`
- `step.completed`
- `step.failed`
- `execution.started`
- `execution.completed`
- `execution.failed`

The backend publishes those events through `EventBus`, which broadcasts them to the workspace execution room.

### Poll fallback

`/executions/[id]` falls back to polling only when:

- the execution is still running
- the socket is disconnected

## Testing and Evidence

The main evidence sources for the current workflow implementation are:

- `apps/web/e2e/guard-and-workflow.spec.ts`
- `apps/api/src/routes/__tests__/validation.routes.test.ts`
- `apps/api/src/engine/handlers/__tests__/step-factory.test.ts`

These files already verify:

- workflow creation flow from `/workflows/new`
- workflow request validation
- invalid step config rejection
- invalid graph rejection
- handler registration coverage through the factory tests

## Known Gaps and Caveats

- `cron` trigger is modeled in the schema and UI, but it is not currently scheduled or executed by a background scheduler
- older README workflow builder language was stale and should not be treated as the source of truth
- workflow deletion is archival, not permanent deletion
- webhook ingress accepts both `GET` and `POST`
- folder access can hide or block workflows and executions depending on whether the action is view, edit, or execute
