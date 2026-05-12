# Deployment Checklist (Minimum Production-Ready)

This document describes a small, reliable path to deploy the NestJS + Fastify backend with Prisma migrations.

## 1) Required environment variables

These are validated by `src/shared/env.ts` (plus `MIGRATE_URL` used by Prisma CLI):

- `NODE_ENV` (recommended: `production`)
- `PORT` (example: `3000`)
- `DATABASE_URL` (runtime DB connection)
- `MIGRATE_URL` (Prisma migration connection; can be the same as `DATABASE_URL`)
- `JWT_ACCESS_SECRET` (min length 16)
- `JWT_ACCESS_EXPIRES_IN` (seconds; default `900`)
- `JWT_REFRESH_SECRET` (min length 15)
- `JWT_REFRESH_EXPIRES_IN` (seconds; default `2592000`)
- `CORS_ORIGIN` (comma-separated list; example: `https://app.example.com,https://hub.example.com`)

## 2) Install dependencies

Phase 0 standardizes the root command surface. From the repository root:

```bash
corepack enable
npm run bootstrap
```

If you are operating inside `mosaical-hololith-backend/` directly, install with `corepack pnpm install --frozen-lockfile`.

## 3) Run database migrations (deploy)

From the backend directory:

```bash
npm run db:migrate:status
npm run db:migrate:deploy
```

Notes:
- `db:migrate:deploy` is the safe, production-oriented command.
- `db:migrate:reset` is destructive and intended for development only.

## 4) Build and start

From the backend directory:

```bash
npm run build
npm run start:prod
```

## 5) Smoke checks

With the global prefix enabled, check:

- Liveness: `GET /api/v1/health/live`
- Readiness (DB): `GET /api/v1/health/ready`
- DB alias: `GET /api/v1/health/db`
- Swagger: `GET /docs`

Every response should include the `x-request-id` header.

## 6) Troubleshooting

### Migrations fail with missing env var

- Ensure `MIGRATE_URL` is set for the Prisma CLI.
- Ensure `DATABASE_URL` is set for runtime.

### App fails at boot with env validation errors

- The env schema is strict. Double-check secrets and lengths.
- Confirm all required vars are present in the runtime environment.

### Requests succeed but logs are hard to correlate

- Ensure your proxy/load balancer preserves or forwards `x-request-id`.
- The app will generate one if it is missing.

## 7) CI/CD expectations

This repo includes a GitHub Actions workflow at `.github/workflows/ci.yml` that:

- Installs backend dependencies through the root bootstrap command
- Runs lint, typecheck, build, and unit tests
- Boots the local e2e Postgres service from Docker Compose
- Runs test migrations and executes the e2e suite

To reproduce locally, use the dedicated e2e database config in `.env.test`:

```bash
npm run test:e2e:db:up
npm run db:migrate:test
npm run test:e2e
```

Or run the combined helper:

```bash
npm run test:e2e:local
```

The e2e bootstrap refuses to run against non-local or non-test database names so test cleanup cannot hit shared environments by accident.
