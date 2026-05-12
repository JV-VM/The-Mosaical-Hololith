# ADR-001: Phase 1 Repo Boundaries and Backend Relocation

## Status

Accepted

## Context

The repository currently contains an active backend implementation in `mosaical-hololith-backend/`.

Phase 1 needs to establish the target monorepo shape:

- `apps/web`
- `apps/api`
- `packages/*`
- `infra/*`

However, the backend already has passing root verification and end-to-end tests. A large immediate filesystem move would introduce avoidable churn across:

- Docker paths
- CI paths
- local documentation
- deployment definitions
- future frontend scaffolding work

## Decision

During the start of Phase 1:

- `apps/api/` is introduced as the target location, not the immediate code location
- the active backend remains in `mosaical-hololith-backend/`
- Phase 1 artifacts must reference both the current location and the target location explicitly
- the physical move to `apps/api/` should happen only as a dedicated cutover change after:
  - the frontend scaffold exists
  - the Render blueprint paths are updated in one pass
  - CI remains green before and after the move

## Consequences

### Positive

- preserves the working backend baseline
- allows frontend and infra scaffolding to begin immediately
- avoids mixing architectural decisions with a large path-move diff
- makes the later move deliberate and easier to review

### Negative

- the repo temporarily contains both the current backend path and the target backend path concept
- some docs must mention a transitional state

## Follow-up

When the cutover happens:

- move `mosaical-hololith-backend/` to `apps/api/`
- update `render.yaml`
- update root scripts and workspace config
- update Docker and CI paths
- remove transition language from the docs
