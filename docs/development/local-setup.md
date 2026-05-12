# Local Setup

## Toolchain

- Node.js `20.x`
- npm `9+`
- Docker with Compose
- Corepack enabled for the repo-managed `pnpm@9`

## Canonical local workflow

Run all commands from the repository root unless a document explicitly says otherwise.

### 1. Enable Corepack

```bash
corepack enable
```

### 2. Create local env files

```bash
cp mosaical-hololith-backend/.env.example mosaical-hololith-backend/.env
cp mosaical-hololith-backend/.env.test.example mosaical-hololith-backend/.env.test
```

Adjust secrets or database hosts only if your local setup differs from the defaults.

### 3. Install dependencies

```bash
npm run bootstrap
```

This install path also regenerates the backend Prisma client.

### 4. Verify the backend baseline

```bash
npm run verify
```

This runs:

- lint
- typecheck
- build
- unit tests

### 5. Run end-to-end tests

```bash
npm run test:e2e:local
```

### 6. Clean up the e2e database

```bash
npm run test:e2e:db:down
```

### 7. Start the API locally

```bash
npm run dev:api
```

## Frontend scaffold

Phase 1 now includes a frontend modulith scaffold in `apps/web/`.

To install its dependencies:

```bash
npm run bootstrap:web
```

This workspace install also regenerates the backend Prisma client so root verification remains valid after frontend dependency changes.

To run it locally after install:

```bash
npm run dev:web
```

To validate the production build:

```bash
npm run typecheck:web
npm run build:web
```

## Notes

- The root `package.json` is the canonical command surface for Phase 0.
- Backend-local commands still work, but root commands are the documented path.
- Production builds now emit to `mosaical-hololith-backend/build/`, not `dist/`.
- The checked-in backend path remains `mosaical-hololith-backend/` until Phase 1 decides the `apps/api/` migration cutover.
