# ADR-001: Phase 1 Repo Boundaries and Backend Relocation

## Status

Accepted

## Context

The repository currently contains an active backend implementation in `apps/api/`.

Phase 1 needs to establish the target monorepo shape:

- `apps/web`
- `apps/api`
- `packages/*`
- `infra/*`

The backend originally lived outside `apps/`. The relocation was deferred until the frontend scaffold, Render blueprint, and root command surface were ready.

- Docker paths
- CI paths
- local documentation
- deployment definitions
- future frontend scaffolding work

## Decision

During Phase 1:

- `apps/api/` is the active backend location
- the backend remains a separately deployable NestJS API
- root scripts, CI, Render, and Docker paths target `apps/api/`
- historical docs may mention the deferred move, but new implementation work should use `apps/api/`

## Consequences

### Positive

- preserves the working backend baseline
- allows frontend and infra scaffolding to begin immediately
- keeps the final monorepo shape consistent with `apps/web`, `apps/api`, `packages/*`, and `infra/*`
- makes Docker and Render paths match the target architecture

### Negative

- the path move creates a large file rename in Git history
- old branch references may still point at the pre-cutover backend path

## Follow-up

- keep future backend work inside `apps/api/`
- remove remaining legacy path references when touched
