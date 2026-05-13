# Repository Conventions

## Current state

- `apps/api/` contains the active NestJS backend codebase.
- `docs/` contains architecture, refactor, roadmap, and development documents.

## Reserved top-level directories

- `apps/`
  Purpose: deployable applications such as the frontend modulith and the `apps/api/` backend.
- `packages/`
  Purpose: shared libraries, typed clients, UI primitives, and config packages.
- `infra/`
  Purpose: Render infrastructure definitions, environment matrices, and deployment support files.
- `scripts/`
  Purpose: repo-owned automation that should not live inside one app only.

## App ownership rule

Use one of these locations instead:

- inside `apps/api/` if the change is backend-only
- inside `docs/` if the change is documentation-only
- inside the reserved directories above if the change is part of the target monorepo structure

## Tooling rule

- Root commands are defined in the root `package.json`.
- Backend dependency installation remains anchored to the backend lockfile.
- `pnpm@9` is the normalized package manager for the repo, invoked through Corepack.
