# Rainbow Packages - Reel Inventory Management

## Progress Tracker

### 1. Frontend (React + Vite + Tailwind CSS)
- [x] **Project Scaffolding**: Vite + React + Tailwind CSS with dark/light UI tokens.
- [x] **Role-Based Views**:
  - [x] **Operator Screen**: Create Reel, Record Usage with quick search, Submitted Entries list, In-app decline notification popups, View-only dashboard.
  - [x] **Supervisor Screen**: Pending Approval Queue (with FIFO ordering and confirmation/decline actions), View-only dashboard.
  - [x] **Admin Screen**: Full Dashboard with metric summary tiles, 3-column Status Board (REEL / CUT / NILL), Filterable table with interactive chip filters, Reel Journey timeline drill-down, Weight breakdown charts by supplier/quality, Dead stock aging list, Parameter definition manager.
- [x] **Core UI/UX Polish**: Traffic-light visual cues (green/amber/red), large touch targets, accessible plain language.
- [x] **State Management**: In-memory React Context (`StoreContext.jsx`) for standalone prototype testing.
- [ ] **API Client Integration**: Connect frontend state to backend `/api/v1` endpoints (Pending Service Implementation).

---

### 2. Backend Infrastructure & Architecture (Node.js 20+ & Express 5)
- [x] **Project Structure**: Pure function-based architecture with ES modules (`type: module`), named exports, and strict layer separation.
- [x] **Environment & Configuration**:
  - [x] `src/config/env.js`: Strongly typed and Zod-validated environment config.
  - [x] `src/config/logger.js`: Pino structured logging.
  - [x] `src/config/cors.js`: Origin whitelist configuration.
- [x] **API Documentation (Swagger UI)**:
  - [x] Integrated `swagger-ui-express` with complete OpenAPI 3.0 specification.
  - [x] Interactive UI documentation accessible at `/docs`, `/api-docs`, and `/api/v1/docs`.
  - [x] Raw OpenAPI schema available at `/docs.json`.
- [x] **Shared Plumbing & Middleware**:
  - [x] `authenticate.js`: JWT Bearer validation with instant revocation on user deactivation.
  - [x] `authorizeRoles.js`: Role guards for `ADMIN`, `SUPERVISOR`, `OPERATOR`.
  - [x] `requirePasswordChange.js`: Forced password reset interceptor.
  - [x] `validate.js`: Zod validator for body/query/params, sanitizing `$` keys and supporting `cf.` query prefixes.
  - [x] `rateLimiter.js`: IP-based rate limiters for auth and API routes.
  - [x] `errorHandler.js`: Centralized error envelope with automatic Mongoose/Zod/Mongo 11000 duplicate key mapping.
  - [x] `token.service.js`: Access token signing/verification and SHA-256 token hashing.

---

### 3. Database & Models (MongoDB Atlas & Mongoose 9)
- [x] **Atlas Connectivity (`src/config/db.js`)**: Robust Mongoose connection with transaction runner (`withTransaction`) and DNS fallback resolvers.
- [x] **Data Schemas & Indexes (`src/models/`)**:
  - [x] `User`: Unique username, partial unique email, role indexing, bcrypt hash exclusion.
  - [x] `RefreshToken`: Hashed token store with TTL auto-expiration.
  - [x] `Reel`: Partial unique `reel_no` for active reels, sequential `sr_no`, weight rounding, status and activity indexes.
  - [x] `ReelEvent`: Append-only audit trail with FIFO journey indexes.
  - [x] `FieldDefinition`: Custom parameter definitions with unique keys.
  - [x] `Notification`: User notifications with read-status indexing.
  - [x] `Counter`: Atomic sequence generator for reel serial numbers.
  - [x] `DigestLog`: Daily digest attempt logs with unique date constraint.
  - [x] `Setting`: App settings document (`_id: "app"`).
- [x] **Database Scripts (`scripts/`)**:
  - [x] `scripts/createIndexes.js`: Synchronizes indexes across all 9 collections.
  - [x] `scripts/seedAdmin.js`: Idempotent initial Admin seeder.
  - [ ] `scripts/importReelsFromExcel.js`: Migration script for `REELS.xlsx` dataset (Pending).

---

### 4. API Endpoints & Routes (Mounted under `/api/v1`)
- [x] **43 Total Registered Endpoints**:
  - [x] **Health**: `GET /health`
  - [x] **Auth**: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/logout-all`, `GET /auth/me`, `POST /auth/change-password`
  - [x] **Users (Admin)**: `POST /users`, `GET /users`, `GET /users/:id`, `PATCH /users/:id`, `PATCH /users/:id/status`, `POST /users/:id/reset-password`, `POST /users/:id/unlock`
  - [x] **Reels**: `GET /reels`, `GET /reels/search`, `GET /reels/:id`, `GET /reels/:id/journey`, `POST /reels`, `POST /reels/:id/usage`, `PATCH /reels/:id`, `POST /reels/:id/void`
  - [x] **Approvals**: `GET /approvals/pending`, `GET /approvals/mine`, `POST /approvals/:eventId/confirm`, `POST /approvals/:eventId/decline`
  - [x] **Notifications**: `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/read-all`, `PATCH /notifications/:id/read`
  - [x] **Dashboard**: `GET /dashboard/summary`, `GET /dashboard/status-board`, `GET /dashboard/breakdown`, `GET /dashboard/aging`
  - [x] **Field Definitions**: `GET /field-definitions`, `POST /field-definitions`, `PATCH /field-definitions/:id`
  - [x] **Audit & Digest (Admin)**: `GET /audit/events`, `GET /digest/preview`, `POST /digest/send`, `GET /digest/logs`
  - [x] **Settings (Admin)**: `GET /settings`, `PATCH /settings`
- [x] **Controllers & Validators**: All controllers and Zod schemas mapped to spec with `req.validated` safety.
- [ ] **Service Layer Business Logic**: Transition service stubs to full implementations with MongoDB transactions (Next Step).

---

### 5. Automated Testing & Background Jobs
- [ ] **Background Scheduler (`src/jobs/`)**: `node-cron` daily digest email dispatcher.
- [ ] **Email Templates (`src/templates/`)**: HTML/Text daily summary email generator.
- [ ] **Test Suite (`tests/`)**: Jest + Supertest integration tests with `mongodb-memory-server`.

---

## Architectural Decisions & Standards

1. **Layered Isolation**: Controllers handle HTTP envelopes only; business logic and database writes remain strictly in the service layer.
2. **Immediate Effect with Reversible Auditing**:
   - Reel usage updates balances immediately upon submission.
   - Supervisor declines trigger atomic database transactions that restore balances, mark later chained entries as cascaded declines, and alert the operator.
3. **Derived Reel Status**: `status` (`REEL`, `CUT`, `NILL`) is calculated server-side based on `previous_weight` and `max_weight`.
4. **Soft Deletions & Snapshots**: Reels and users are never hard-deleted; event snapshots preserve historical operator names and roles permanently.
5. **Interactive Documentation**: Swagger UI is baked in for real-time endpoint testing and integration contracts.
