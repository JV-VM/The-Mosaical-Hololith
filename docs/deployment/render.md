# Render Deployment Guide

## Purpose

This guide documents the current Render deployment path defined in
[render.yaml](/home/vihkctormartim/The-Mosaical-Hololtih/render.yaml).

It covers:

- the deployable backend service that exists now
- the managed Postgres database it depends on
- the frontend modulith deployment path now defined in the Blueprint

## Current active Blueprint

The active Render Blueprint file is:

- [render.yaml](/home/vihkctormartim/The-Mosaical-Hololtih/render.yaml)

The supporting environment design lives at:

- [env-matrix.md](/home/vihkctormartim/The-Mosaical-Hololtih/infra/render/env-matrix.md)

## Current service topology

### Active now

- `tmh-api`
  Type: Render web service
  Runtime: Docker
  Source path: `mosaical-hololith-backend/`
- `tmh-web`
  Type: Render web service
  Runtime: Docker
  Source path: `apps/web/`
  Deployment intent: scaffolded and buildable, but not yet intended for production traffic
- `tmh-postgres`
  Type: Render managed PostgreSQL

### Planned later

- `tmh-worker`
  Type: Render background worker
- `tmh-cron`
  Type: Render cron job
- optional `tmh-cache`
  Type: Render Key Value

## How the current Blueprint works

### `tmh-api`

The API service is defined to:

- build from `mosaical-hololith-backend/`
- use the backend Dockerfile at [Dockerfile](/home/vihkctormartim/The-Mosaical-Hololtih/mosaical-hololith-backend/Dockerfile)
- expose the liveness endpoint `/api/v1/health/live`
- receive secrets and database connection strings from Render-managed environment configuration

### `tmh-postgres`

The database resource is defined in the same Blueprint and provides:

- `DATABASE_URL`
- `MIGRATE_URL`

to the API service.

## Initial backend deployment on Render

### 1. Connect the repository

- Open Render and create a new Blueprint instance from the repository.
- Point it at the repository root so Render detects `render.yaml`.

### 2. Review the generated resources

You should see:

- a `tmh-api` web service
- a `tmh-web` web service
- a `tmh-postgres` managed PostgreSQL database

### 3. Set environment values that are intentionally manual

The current Blueprint leaves `CORS_ORIGIN` as manual because it depends on the final domains.

The current Blueprint leaves `NEXT_PUBLIC_API_BASE_URL` as manual because it depends on the final API domain.

Before the first real deploy, set:

- `CORS_ORIGIN`
- `NEXT_PUBLIC_API_BASE_URL`

For backend-only smoke deployment, a temporary value such as the eventual frontend domain is fine.

### 4. Deploy

Render will:

- provision the database
- build the backend Docker image
- inject database URLs and generated JWT secrets
- boot the API service

### 5. Smoke test

Validate:

- `GET /api/v1/health/live`
- `GET /api/v1/health/ready`
- `GET /docs`

## Database migration rule

The current Blueprint does not yet run a dedicated pre-deploy migration command.

That is intentional for this Phase 1 slice because:

- the active backend still lives in `mosaical-hololith-backend/`
- the deployment baseline is being established first
- migration automation should be added in one deliberate step after the final service path and deploy flow are fixed

Until that automation lands, run migrations as part of the deployment checklist using:

- [DEPLOYMENT.md](/home/vihkctormartim/The-Mosaical-Hololtih/mosaical-hololith-backend/docs/DEPLOYMENT.md)

## Frontend deployment state

The frontend modulith scaffold now exists at:

- [apps/web](/home/vihkctormartim/The-Mosaical-Hololtih/apps/web)

It is now defined in [render.yaml](/home/vihkctormartim/The-Mosaical-Hololtih/render.yaml) as `tmh-web`.

Current Phase 1 state:

- local install works
- local typecheck works
- local production build works
- the Render service entry exists
- the service is still considered pre-feature and should not be treated as production-ready UI

Render model:

- `tmh-web` is a Docker web service
- one deployable frontend app
- route-based separation for public, dashboard, and admin surfaces
- optional host-based domain separation pointing to the same service

## Domain plan

### Near term

- `api.<domain>`

### After frontend activation

- `<domain>` or `www.<domain>` for the public hub
- `app.<domain>` for the producer dashboard if host-based routing is desired
- `admin.<domain>` for the admin surface if host-based routing is desired

## What is intentionally deferred

Not active in the current Blueprint yet:

- background worker
- cron jobs
- key value store
- object storage integration
- payment, email, and DNS provider wiring
- automated migration hook in Blueprint deploy flow

## Next Blueprint changes expected in later phases

### After frontend foundation

- add frontend environment variables
 - decide whether `tmh-web` should remain dormant or become a staging-facing service

### After integration work

- add `tmh-worker`
- add `tmh-cron`
- add optional `tmh-cache`

### After backend relocation cutover

- update `tmh-api` paths from `mosaical-hololith-backend/` to `apps/api/`
- update any Docker and script references accordingly
