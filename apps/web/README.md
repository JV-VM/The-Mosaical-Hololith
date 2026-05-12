# apps/web

Frontend modulith scaffold for The Mosaical Hololith.

## Scope

This app will eventually serve:

- public hub routes
- producer dashboard routes
- platform admin routes
- auth and account flows

## Route groups

- `app/(public)/`
- `app/(dashboard)/`
- `app/(admin)/`
- `app/(auth)/`

## Internal module boundaries

- `src/modules/public-hub`
- `src/modules/discovery`
- `src/modules/stores`
- `src/modules/catalog`
- `src/modules/pages`
- `src/modules/auth`
- `src/modules/dashboard`
- `src/modules/analytics`
- `src/modules/billing`
- `src/modules/admin`
- `src/modules/shared-ui`
- `src/modules/shared-data`

## Current status

This is a Phase 1 scaffold only.

- routing structure exists
- app shell exists
- centralized env and API client entry points exist
- shared workspace packages exist for `@tmh/api-client` and `@tmh/types`
- feature modules are represented as boundaries
- local typecheck and production build pass

Feature implementation starts in later phases.
