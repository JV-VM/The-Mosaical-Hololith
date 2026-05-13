# The Mosaical Hololith – Backend README

This repository contains the **backend API** for **The Mosical Hololith**, a multi-tenant SaaS platform that allows producers to create storefront websites and be discovered through a centralized hub.

The backend is designed with **clean domain boundaries**, **plan-based enforcement**, and **future scalability** in mind, while keeping the MVP simple and fast to iterate.

---

## 1. Backend purpose

The backend is responsible for:

* Authentication and authorization
* Multi-tenancy (organizations / producers)
* Storefront management (stores, pages, domains)
* Product & service catalog
* Tagging and taxonomy rules
* Discovery (hub search and filtering)
* Plan, quota, and feature enforcement
* Media management
* Basic analytics and events

The backend **does not render UI**. It exposes a REST API consumed by:

* The public hub frontend
* The producer dashboard frontend
* (Later) integrations and third-party services

## Local e2e database

End-to-end tests are wired to `.env.test`, not the default `.env`.

The canonical Phase 0 workflow runs from the repository root:

```bash
corepack enable
cp apps/api/.env.example apps/api/.env
cp apps/api/.env.test.example apps/api/.env.test
npm run bootstrap
npm run verify
npm run test:e2e:local
```

Backend-local equivalents still work if you are already inside `apps/api/`.

Use the local Postgres service in [docker-compose.e2e.yml](/home/vihkctormartim/The-Mosaical-Hololtih/apps/api/docker-compose.e2e.yml):

```bash
npm run test:e2e:db:up
npm run db:migrate:test
npm run test:e2e
```

Or run the combined flow:

```bash
npm run test:e2e:local
```

The e2e bootstrap refuses to run against non-local or non-test database names to avoid destructive cleanup against shared environments.

## Local Docker API runtime

From the repository root:

```bash
npm run docker:api:up
```

This starts:

* `postgres` on `localhost:5432`
* `api` on `localhost:3000`

Useful local endpoints:

* `GET http://localhost:3000/api/v1/health/live`
* `GET http://localhost:3000/api/v1/health/ready`
* `GET http://localhost:3000/docs`

Stop and remove local Docker volumes with:

```bash
npm run docker:api:down
```

---

## 2. Architectural principles

### 2.1 Modular Monolith (MVP)

For the MVP, the backend follows a **modular monolith** architecture:

* One deployable service
* Clear internal module boundaries
* Shared database
* Strong domain isolation in code

This allows:

* Faster development
* Easier refactoring
* Safe evolution into microservices later

### 2.2 Domain-driven structure

Each major business concept lives in its own **domain module** with:

* Controllers (API layer)
* Application services (use cases)
* Domain models (entities, value objects)
* Persistence layer (repositories)

Cross-domain communication happens through:

* Explicit service calls
* Domain events (in-process for MVP)

---

## 3. High-level module overview

```
src/
├── auth/
├── users/
├── tenants/
├── stores/
├── pages/
├── catalog/
├── tags/
├── discovery/
├── plans/
├── media/
├── analytics/
├── notifications/
├── admin/
├── shared/
└── main.ts
```

---

## 4. Core domain modules

### 4.1 Auth & Identity (`auth`, `users`)

**Responsibilities**

* User registration and login
* Password management
* Token issuing (JWT/session)
* Identity verification

**Key concepts**

* User
* Credentials
* Session / Token

**Notes**

* Auth is global (not tenant-scoped)
* Tenant access is resolved after authentication

---

### 4.2 Tenancy (`tenants`)

**Responsibilities**

* Organizations (tenants)
* Memberships and roles
* Tenant isolation

**Key concepts**

* Tenant
* Membership
* Roles (Producer, Admin)

**Rules**

* Every store belongs to exactly one tenant
* Users may belong to multiple tenants
* All write operations are tenant-scoped

---

### 4.3 Stores (`stores`)

**Responsibilities**

* Store lifecycle (create, update, publish)
* Store settings and metadata
* Domain and subdomain management

**Key concepts**

* Store
* StoreStatus (draft, published, suspended)
* DomainMapping

**Rules**

* Store creation is limited by plan quotas
* Only published stores appear in discovery
* Domain features are plan-gated

---

### 4.4 Pages (`pages`)

**Responsibilities**

* Store content pages
* Basic page composition

**Key concepts**

* Page
* PageContent (blocks / markdown)

**Notes**

* MVP uses simple structured content
* No advanced CMS logic in MVP

---

### 4.5 Catalog (`catalog`)

**Responsibilities**

* Products and services
* Pricing and availability
* Media association

**Key concepts**

* Product
* Service
* ProductStatus (draft, published)

**Rules**

* Product limits enforced per plan
* Only published products appear publicly

---

### 4.6 Tags & Taxonomy (`tags`)

**Responsibilities**

* Tag definitions
* Tag tiers and policies
* Store and product classification

**Key concepts**

* Tag
* TagTier (A, B, C)
* TagPolicy

**Rules**

* Tag availability depends on plan
* Some tags may require verification (future)
* Tags influence discovery visibility (later phase)

---

### 4.7 Discovery & Hub (`discovery`)

**Responsibilities**

* Central hub search
* Filtering by tags and type
* Public listings

**Key concepts**

* StoreIndex
* ProductIndex

**Notes**

* Read-optimized queries
* No complex ranking in MVP
* Simple sorting (new, featured flag)

---

### 4.8 Plans & Quotas (`plans`)

**Responsibilities**

* Subscription plans
* Feature flags
* Resource limits enforcement

**Key concepts**

* Plan
* Subscription
* Quota
* UsageMetric

**Rules**

* Enforcement happens at application service level
* All create/update actions validate quotas
* Billing provider integration may be stubbed in MVP

---

### 4.9 Media (`media`)

**Responsibilities**

* File uploads (images, assets)
* Storage limits
* Secure access

**Rules**

* File size and total storage enforced by plan
* Media always belongs to a store or product

---

### 4.10 Analytics (`analytics`)

**Responsibilities**

* Track basic usage events
* Aggregate metrics per store

**Tracked events (MVP)**

* Store views
* Product views
* Search usage
* Tag clicks

**Notes**

* Event ingestion is lightweight
* Aggregation is daily and store-scoped

---

## 5. Admin & moderation (`admin`)

**Responsibilities**

* Platform-wide oversight
* Tag and taxonomy management
* Store moderation (suspend/unpublish)

**Access**

* Restricted to platform administrators only

---

## 6. Shared kernel (`shared`)

Contains:

* Base entities
* IDs and value objects
* Money, dates, pagination
* Common guards and decorators
* Error and exception types

This layer must remain **small and stable**.

---

## 7. API design principles

* RESTful endpoints
* Clear resource ownership
* Explicit tenant scoping
* Consistent error formats
* Versioned API (e.g. `/api/v1`)

**Example**

```
GET /stores/:slug
POST /stores/:id/products
GET /explore?tags=handmade,local
```

---

## 8. Security model

* JWT or session-based authentication
* Role-based authorization
* Tenant isolation enforced in code
* Rate limiting on public endpoints
* Media access scoped to ownership

---

## 9. What is intentionally simple in MVP

* No distributed services
* No async message bus
* No advanced ranking algorithms
* No real-time features
* No heavy CMS editor

This keeps the backend **maintainable and evolvable**.

---

## 10. Evolution path

### Phase 2

* Orders & checkout
* Payments and webhooks
* Notifications and emails

### Phase 3

* Traffic quality scoring
* Ranking and boosts
* Anti-abuse signals

### Phase 4

* Integrations & plugins
* Public API keys
* Marketplace extensions

---

## 11. Philosophy

This backend is built to:

* Empower producers without fragmenting the ecosystem
* Centralize discovery while preserving ownership
* Enforce fairness through plans and policies
* Grow from MVP to platform without rewrites

If you understand this README, you understand **the soul of the backend**.

---
