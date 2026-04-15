Audit the repository and check whether .github/copilot-instructions.md, AGENTS.md, CLAUDE.md, and any path-specific instruction files are stale.

Specifically verify:

- install/dev/build/lint/typecheck/test commands
- folder structure
- shared component locations
- API/data-fetching patterns
- state management patterns
- styling conventions
- testing conventions

Update only the outdated parts.
Do not rewrite correct sections unnecessarily.
Also list any instructions that are now stale, vague, or contradicted by the current codebase.
