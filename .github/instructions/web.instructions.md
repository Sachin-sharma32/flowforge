---
description: 'Use when editing Next.js App Router pages, Redux slices, selectors, hooks, or components in apps/web/src. Covers Redux Toolkit and Axios usage, shared UI reuse, Tailwind token usage, Playwright-sensitive test ids, and mock API updates.'
name: 'FlowForge Web Instructions'
applyTo: 'apps/web/src/**'
---

# FlowForge Web Instructions

- Stay inside the current Next.js App Router + client-side Redux Toolkit + Axios pattern.
- Use `createAsyncThunk`, the typed hooks in `apps/web/src/stores/hooks.ts`, and selectors in `apps/web/src/stores/selectors` instead of ad hoc state logic.
- Use `apps/web/src/lib/api-client.ts` and `apps/web/src/lib/api-error.ts` for API work.
- Do not introduce Zustand, React Query, SWR, server actions, or a second API client unless explicitly requested.
- Reuse `apps/web/src/components/ui` primitives, dialogs, charts, toasts, and `cn` from `apps/web/src/lib/utils.ts` before creating new UI code.
- Use `@/` imports in the web app.
- Keep styling inside `apps/web/src/app/globals.css` and `apps/web/tailwind.config.ts`. Reuse existing tokens, spacing, border radii, font variables, and animation names.
- Preserve Radix accessibility behavior, current redirect and dialog flows, and existing `data-testid` values used by Playwright.
- The workflow editor is the custom builder in `apps/web/src/components/workflow/workflow-builder`, not a React Flow graph.
- If UI behavior depends on API response shape, update `apps/web/e2e/support/mock-api.ts` with the UI change.
