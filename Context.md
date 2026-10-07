# Rainbow Packages — Reel Inventory & Management System (Project Context)

## 1. Project Overview
A full-stack web application built for **Rainbow Packages** to manage paper & board reel inventory, track real-time reel usage across machine stations, resolve master product codes, process multi-role approvals, and generate inventory stock valuation reports.

- **Frontend Stack**: React 18 (Vite), Tailwind CSS, Lucide React icons, React Router v6.
- **Backend Stack**: Node.js, Express.js REST API.
- **Database**: MongoDB Atlas (`reel_inventory_prod`) with Mongoose ODM.
- **Production Data**: Populated with 409 active reels and 25 master codes (migrated from production Excel sheets).

---

## 2. Roles & Permissions

| Role | Operational Rights |
|---|---|
| **OPERATOR** | Can create new reels, record reel weight usage (with usage dates), request reel master corrections, and compose internal messages. All modifications create pending approvals. |
| **SUPERVISOR** | Confirms or declines pending operator entries (creations, usage logs, correction requests). View-only dashboard & inventory access. |
| **ADMIN** | Full system rights: approve/decline requests, direct reel edits, void reels, manage master codes/products, custom field definitions, daily digests, and PDF reporting. |

---

## 3. Data Architecture & Key Schemas

### A. Reel Model (`reel.model.js`)
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

### B. Master Product Model (`masterProduct.model.js`)
- `master_code` *(String, unique)*: Main spec identifier.
- `quality`, `gsm`, `bf`, `size`: Associated standard physical specifications.

### C. Usage & Event Logs (`eventLog.model.js` / `usage.service.js`)
- Records immutable history of reel usage, station consumption, operator actions, and approval decisions.
- Machine Stations: `E-Flute`, `Narrow-Flute`, `Sheater`, `Sold to Revati`, `Return`, `Others`.
- Supports explicit usage dates (`usage_date`).

---

## 4. Key Workflows & Features

### 1. Batch / Continuous Reel Usage (`RecordUsageModal.jsx`)
- Live debounced search input (300ms) with search results list showing matching reels, active balance, and status.
- Exact reel code entry auto-selects the reel for usage input.
- Submitting usage updates the database, emits parent data refreshes, and keeps the modal open in search view with a green success message so operators can update multiple reels in sequence.

### 2. Login Quick Actions Launcher (`LoginQuickActionsModal.jsx`)
- Displays a 3-option modal upon login:
  1. **Option 1: Create Reel** (Navigates to `/reels/create`).
  2. **Option 2: Update Weight** (Live search & record usage modal).
  3. **Option 3: Inventory Details** (Navigates to `/reels`).
- When returning or closing sub-modals, re-opens to the main menu options.

### 3. Reel Inventory & Chip Filters (`ReelListPage.jsx`)
- Filterable inventory table with status cards (`REEL`, `CUT`, `NILL`).
- Active filter chips (Quality, Status, Master Code, Station, GSM, Purchase Date).
- Stock Valuation summary (Total Weight kg, Total Stock Value ₹).
- Export capabilities: CSV export and Stock Summary PDF export.

### 4. Stock PDF Report Generation (`ReelStockPdfModal.jsx`)
- Generates formatted PDF inventory reports broken down by Master Code, Quality, Status, and Weight Balance with total stock valuation.

### 5. Multi-Role Approvals (`ApprovalsPage.jsx`, `OperatorApprovalsPage.jsx`)
- Pending creations, usage reports, and correction requests require confirmation by Supervisor or Admin.
- Declining a usage report automatically reverts the reel's balance weight to its previous confirmed state (`previous_weight`).

---

## 5. Development & Execution Conventions

- **Frontend Directory**: `frontend/` (Vite, `npm run dev` at `localhost:5173`, `npm run build`).
- **Backend Directory**: `backend/` (Express API at `localhost:5000`, `npm run dev`).
- **Build Verification**: Always run `npm run build` in `frontend/` to confirm zero compilation/lint errors before finishing tasks.
- **Code Rules**:
  - Maintain docstrings and file header comments.
  - Do NOT re-introduce `master_key` (use `master_code`).
  - Honor the `supplier_name` and `mill_name` UI visibility constraint strictly.
