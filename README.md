# Mosaical Hololith

A federated e-commerce / SaaS platform built with
**Node.js + TypeScript + PostgreSQL**.

## Current State

The repository currently contains a backend-first implementation centered on
`apps/api/`.

The target state is a hybrid decoupled monorepo with:

- a frontend modulith application
- a decoupled backend API
- Render-based deployment
- Docker-based deploy artifacts for app services

## Roadmap Docs

- [Full-Stack Delivery Roadmap](/home/vihkctormartim/The-Mosaical-Hololtih/docs/roadmap/00.full-stack-delivery-roadmap.md)
- [Phase 0: Repo Stabilization](/home/vihkctormartim/The-Mosaical-Hololtih/docs/roadmap/01.phase-0-repo-stabilization.md)
- [Phase 1: Target Architecture and Render Topology](/home/vihkctormartim/The-Mosaical-Hololtih/docs/roadmap/02.phase-1-target-architecture.md)
- [Phase 2: Backend Completion Backlog](/home/vihkctormartim/The-Mosaical-Hololtih/docs/roadmap/03.phase-2-backend-completion.md)

## Phase 1 Architecture

- [System Architecture](/home/vihkctormartim/The-Mosaical-Hololtih/docs/architecture/01.system-architecture.md)
- [ADR-001: Repo Boundaries and Backend Relocation](/home/vihkctormartim/The-Mosaical-Hololtih/docs/architecture/adr-001-phase-1-repo-boundaries.md)
- [Render Environment Matrix](/home/vihkctormartim/The-Mosaical-Hololtih/infra/render/env-matrix.md)
- [Render Deployment Guide](/home/vihkctormartim/The-Mosaical-Hololtih/docs/deployment/render.md)
- [Frontend Modulith Scaffold](/home/vihkctormartim/The-Mosaical-Hololtih/apps/web/README.md)

## Phase 0 Local Workflow

The canonical developer path now lives at:

- [Local Setup](/home/vihkctormartim/The-Mosaical-Hololtih/docs/development/local-setup.md)
- [Repository Conventions](/home/vihkctormartim/The-Mosaical-Hololtih/docs/development/repository-conventions.md)

Quick start:

```bash
corepack enable
cp apps/api/.env.example apps/api/.env
cp apps/api/.env.test.example apps/api/.env.test
npm run bootstrap
npm run verify
```

Docker API runtime:

```bash
npm run docker:api:up
```

The API will be available at `http://localhost:3000/api/v1`.

## Features

✔ User authentication (JWT)  
✔ Multi-tenant architecture  
✔ Product & store management  
✔ SEO-friendly discovery hub  
✔ Plan & quota enforcement

## Tech Stack

- Node.js + TypeScript  
- NestJS (backend)  
- PostgreSQL  
- Docker (local dev & deploy)  
- Swagger API docs
