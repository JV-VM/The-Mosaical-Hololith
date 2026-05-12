# Render Environment Matrix

## Purpose

This document defines the intended Render service topology and environment-variable ownership model for the platform.

## Services

### Current deployable baseline

| Service | Render type | Runtime | Source path | Status |
| --- | --- | --- | --- | --- |
| `tmh-api` | `web` | `docker` | `mosaical-hololith-backend/` | deployable now |
| `tmh-postgres` | `database` | managed | Render-managed | deployable now |

### Planned services

| Service | Render type | Runtime | Target path | Status |
| --- | --- | --- | --- | --- |
| `tmh-web` | `web` | `docker` | `apps/web/` | defined in Blueprint, not yet intended for production traffic |
| `tmh-worker` | `worker` | `docker` | `apps/api/` or dedicated worker image | phase 7+ |
| `tmh-cron` | `cron` | `docker` | `apps/api/` or dedicated job image | phase 7+ |
| `tmh-cache` | `keyvalue` | managed | Render-managed | optional |
| `tmh-docs` | `web` or static site | static or docker | future docs app | optional |

## Environment classes

### Shared runtime values

These are not secrets, but they still belong in Render-managed environment configuration:

- `NODE_ENV`
- `PORT`
- `JWT_ACCESS_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`

### Backend private values

- `DATABASE_URL`
- `MIGRATE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`

### Backend environment-specific values

- `CORS_ORIGIN`
- future storage, payment, email, and DNS variables

### Frontend public values

The first frontend public values now exist for `tmh-web`:

- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_API_BASE_URL`

## Environment targets

### Development

- local Docker and root scripts
- local Postgres for app development
- dedicated local e2e Postgres for tests

### Staging

- isolated Render web service and Postgres instance
- staging domains
- real deploy flow
- non-production secrets

### Production

- Render web service and Postgres instance
- production domains
- production secrets
- tighter change control and rollback discipline

## Region choice

Default recommendation:

- `virginia`

Reason:

- Render currently exposes a limited region set
- `virginia` is a reasonable Americas default for a web app serving North America and Latin America

This should be revisited before production if user geography or latency data suggests a better choice.

This recommendation is an inference from current Render region availability, not a platform requirement.

## Domain plan

### Near term

- `api.<domain>` for backend API

### Planned after frontend launch

- `<domain>` or `www.<domain>` for the public hub
- `app.<domain>` for the dashboard entry point if host-based separation is preferred
- `admin.<domain>` for the admin surface if host-based separation is preferred

The frontend modulith can support either:

- one domain with route-based separation
- multiple domains pointing to the same web service

## Deployment rule

The active Render Blueprint should live at the repository root as `render.yaml`.

Supporting deployment notes and matrices remain in `infra/render/`.
