# Rainbow Packages — Modular Inventory & Management System (Project Context)

**Active Branch:** `rainbow-packaging-testing`  
**Architecture:** Modular Monolith (Domain Modules + Platform Modules + Shared Core)  
**Database:** MongoDB Atlas (`reel_inventory_dev` / `reel_inventory_prod`) with Mongoose ODM  
**Automated Tests:** 37/37 Backend Tests Passing | Production Vite Frontend Bundling Clean  

---

## 1. Project Overview & Multi-Category Evolution

A full-stack enterprise web application built for **Rainbow Packages** to manage packaging inventory, track real-time raw material consumption across machine stations, resolve master product codes, process multi-role approvals, and generate inventory stock valuation reports.

The application has been modularized from a single-product system into a domain-driven modular monolith supporting three core inventory domains:
1. **Reels Module (`modules/reels`)** — Production baseline managing paper & board reels (inwarding, quality metrics, GSM, BF, size, running weight balance, machine station consumption, master codes, and roll journey event logs).
2. **Sheets Module (`modules/sheets`)** — Scaffolded domain for sheet-fed paper and corrugated boards (dimensions Length × Width, caliper thickness, GSM, ream conversions, cutting yield, and trim waste).
3. **Finished Boxes Module (`modules/finished-boxes`)** — Scaffolded domain for finished packaging goods (3D dimensions Length × Width × Height, flute profiles A/B/C/E/3-ply/5-ply, customer purchase orders, pallet bundling, and vehicle dispatch).

- **Frontend Stack**: React 19 / Vite, Tailwind CSS, Lucide React icons, React Router v7.
- **Backend Stack**: Node.js (>=20), Express.js REST API with Zod validation.
- **Database**: MongoDB Atlas with 13 collections (`reels`, `reelevents`, `mastercodes`, `masterproducts`, `users`, `approvals`, `audit_logs`, `daily_digests`, `messages`, `notifications`, `counters`, `custom_field_definitions`, `system_settings`).

---

## 2. Directory & Modular Architecture

### Backend (`backend/src/`)
```
backend/src/
├── app.js                          # Express application factory & middleware pipeline
├── server.js                       # Server entry point, DB bootstrap, and shutdown hooks
│
├── core/                           # Shared Platform Infrastructure
│   ├── config/                     # cors.js, env.js, logger.js, mailer.js, swagger.js
│   ├── constants/                  # roles.js, errorCodes.js, approvalStatus.js, etc.
│   ├── database/                   # db.js (Mongoose connection & transactions), counter service
│   ├── errors/                     # ApiError.js (Standardized operational errors)
│   ├── middleware/                 # authenticate, authorizeRoles, errorHandler, rateLimiter, validate
│   ├── services/                   # eventLog.service.js, email.service.js, keepAlive.service.js
│   ├── utils/                      # apiResponse.js, pagination.js, password.js
│   ├── validators/                 # common.validator.js
│   └── index.js                    # Unified core barrel export
│
├── modules/                        # Domain & Feature Modules
│   ├── reels/                      # [Inventory Domain: Production Baseline]
│   │   ├── constants/              # qualities.js (paper grades), reelStatus.js, stations.js
│   │   ├── controllers/            # reel, masterCode, masterProduct controllers
│   │   ├── models/                 # Reel, ReelEvent, MasterCode, MasterProduct models
│   │   ├── routes/                 # reel, masterCode, masterProduct express routes
│   │   ├── services/               # reel, usage, masterCode, masterProduct services
│   │   ├── utils/                  # reelStatus, masterKeyGenerator, buildReelFilter
│   │   ├── validators/             # reel, masterProduct Zod validators
│   │   └── index.js                # Public module barrel export
│   ├── sheets/                     # [Inventory Domain: Future Scaffold]
│   ├── finished-boxes/             # [Inventory Domain: Future Scaffold]
│   ├── auth/                       # [Platform Module] Session, JWT refresh, password logic
│   ├── users/                      # [Platform Module] User management & RBAC
│   ├── approvals/                  # [Platform Module] Approval workflow & correction review
│   ├── audit/                      # [Platform Module] Central audit trail
│   ├── notifications/              # [Platform Module] In-app alerts & internal messaging
│   ├── settings/                   # [Platform Module] System settings & dynamic custom fields
│   ├── dashboard/                  # [Platform Module] KPI aggregations & summary tiles
│   └── digest/                     # [Platform Module] Daily email digest reporting
│
├── routes/                         # Central API Routing
│   ├── health.routes.js            # Infrastructure health probe (/api/v1/health)
│   └── index.js                    # Central API router mounting all modules
│
├── jobs/                           # Background Cron Schedulers (daily digest)
└── templates/                      # Email & Notification HTML Templates
```

### Frontend (`frontend/src/`)
```
frontend/src/
├── api/                            # Cross-cutting HTTP API clients (client.js with JWT interceptor)
├── auth/                           # Authentication context and route guards (AuthContext, RoleGuard, ProtectedRoute)
├── components/                     # Shared UI components (Common modals, tables, Pagination, AppShell, ReelMark)
├── modules/                        # Domain-Driven Inventory Modules
│   ├── reels/                      # Production baseline (16 pages & modals, reelApi, masterCodeApi, masterProductApi)
│   ├── sheets/                     # Future category scaffold (SheetsPage.jsx, sheetApi.js, index.js)
│   └── finished-boxes/             # Future category scaffold (FinishedBoxesPage.jsx, boxApi.js, index.js)
├── pages/                          # Shared Application Pages (Dashboard, Approvals, Users, Audit, Settings, Digest)
├── utils/                          # formatters.js (currency, weights, dates, badges)
├── App.jsx                         # Central Application Route Table
└── main.jsx                        # React root entry point
```

---

## 3. Roles & Permissions

| Role | Operational Rights |
|---|---|
| **OPERATOR** | Can inward new reels, record reel weight usage (with usage dates), request reel master corrections, and compose internal messages. All modifications create pending approvals. |
| **SUPERVISOR** | Confirms or declines pending operator entries (creations, usage logs, correction requests). View-only dashboard & inventory access. Master codes management. |
| **ADMIN** | Full system rights: approve/decline requests, direct reel edits, void reels, manage master codes/products, custom field definitions, daily digests, and PDF reporting. |

---

## 4. Data Architecture & Key Schemas

### A. Reel Model (`modules/reels/models/reel.model.js`)
- `reel_no` *(String, unique)*: Physical barcode / reel identifier (e.g. `1002`, `R-7801`). Critical search key.
- `master_code` *(String, indexed)*: Specification identifier (e.g., `VK-20-20`). Replaces legacy `master_key`.
- `quality` *(Enum)*: `VK`, `SPECTRA`, `ULTRA`, `SK`, `IMPORTANT`, `SBS`, `FBB`, `DCB`.
- `gsm` *(Number)*: Grams per Square Metre.
- `bf` *(String/Number)*: Bursting Factor (paper strength).
- `size` *(Number)*: Reel width in cm.
- `max_weight` *(Number)*: Immutable initial reel weight at purchase (kg).
- `previous_weight` *(Number)*: Running balance weight prior to the latest confirmed usage (kg).
- `current_weight` *(Number)*: Current balance weight (kg).
- `status` *(Enum, derived)*:
  - `REEL`: Full, unused reel (`current_weight == max_weight`).
  - `CUT`: Partially consumed (`0 < current_weight < max_weight`).
  - `NILL`: Fully depleted (`current_weight == 0`).
  - `VOIDED`: Cancelled/retired reel.
- `supplier_name` *(String)*: Supplier / Party name.
- `mill_name` *(String)*: Paper mill manufacturer.
- `rate_per_kg` *(Number)*: Unit price per kg for stock valuation (₹).
- `approval_status` *(Enum)*: `APPROVED`, `PENDING`, `DECLINED`.
- `pending_count` *(Number)*: Number of pending approval requests attached to this reel.

> **UI Visibility Constraint**: `supplier_name` and `mill_name` are displayed **ONLY** on:
> 1. Reel Creation (`CreateReelPage.jsx`, `CreateReelModal.jsx`)
> 2. Reel List / Inventory Page (`ReelListPage.jsx`)
> 3. PDF Stock Reports (`ReelStockPdfModal.jsx`)
> They are hidden/commented out across all other pages (modals, detail views, usage logs, notifications, digest).

### B. Master Product Model (`modules/reels/models/masterProduct.model.js`)
- `master_code` *(String, unique)*: Main spec identifier.
- `quality`, `gsm`, `bf`, `size`: Associated standard physical specifications.

### C. Usage & Event Logs (`modules/reels/models/reelEvent.model.js` / `core/services/eventLog.service.js`)
- Records immutable history of reel usage, station consumption, operator actions, and approval decisions.
- Machine Stations: `E-Flute`, `Narrow-Flute`, `Sheater`, `Sold to Revati`, `Return`, `Others`.
- Supports explicit usage dates (`usage_date`).

---

## 5. Running the Project From the Root Directory

**YES! You can now run the entire application directly from the root repository directory.**

The root `package.json` and backend configuration have been configured so that `backend/.env` is automatically resolved regardless of your current working directory.

### Available Root Commands

| Action | Root Command | What It Does |
|---|---|---|
| **Run Backend API** | `npm run dev:backend` *(or `npm run dev`)* | Starts Express server on `http://localhost:5000` via nodemon |
| **Run Frontend UI** | `npm run dev:frontend` | Starts Vite React server on `http://localhost:5173` |
| **Run Full Stack in Prod** | `npm start` | Runs Express server with embedded frontend static build |
| **Run All Tests** | `npm test` | Runs the full 37-test automated backend test suite |
| **Build Frontend** | `npm run build:frontend` | Compiles frontend assets into `frontend/dist/` |
| **Full Project Build** | `npm run build` | Installs dependencies, compiles frontend, and builds DB indexes |

### Running Both Frontend & Backend in Parallel
To run both simultaneously in development:
* **Terminal 1 (Root):**
  ```bash
  npm run dev:backend
  ```
* **Terminal 2 (Root):**
  ```bash
  npm run dev:frontend
  ```

---

## 6. Coding & Development Standards

- **Maintain Module Boundaries**: Inventory code belongs in `modules/<domain>/`. Shared infrastructure belongs in `core/`.
- **Zero Monolithic Leakage**: Never place category-specific constants or schemas in `core/`.
- **Automated Verification**: Before concluding work, always verify:
  1. `npm test` (All 37 backend tests must pass).
  2. `npm run build:frontend` (Vite build must bundle with 0 errors).
- **Code Rules**:
  - Maintain docstrings and file header comments.
  - Do NOT re-introduce `master_key` (use `master_code`).
  - Honor the `supplier_name` and `mill_name` UI visibility constraint strictly.
