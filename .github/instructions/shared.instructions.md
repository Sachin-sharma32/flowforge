---
description: 'Use when editing shared contracts in packages/shared/src. Covers framework-free shared types, strict Zod schemas, exported index wiring, and changes that must stay aligned across the API and web workspaces.'
name: 'FlowForge Shared Contract Instructions'
applyTo: 'packages/shared/src/**'
---

# FlowForge Shared Contract Instructions

- Treat `packages/shared` as the source of truth for contracts used by both the API and web app.
- Keep the package framework-agnostic. Shared files should expose constants, TypeScript types, and Zod schemas without app-specific imports.
- Follow the existing schema style: prefer named exports, derive input types with `z.infer`, and keep object schemas `.strict()` unless there is a source-backed reason not to.
- Keep constant objects and their derived union types aligned, such as `StepType` plus `StepTypeValue`.
- Export new shared schemas, constants, types, and helpers from `packages/shared/src/index.ts` so both apps can consume them consistently.
- If you change request schemas, permissions, step types, or shared workflow data structures, update the API and web consumers in the same task.
