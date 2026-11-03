# Sheet (Board Stock) Inward, Cut & Inventory Management UI – Implementation Report

**Project:** Rainbow Packaging Inventory Management System  
**Module:** Sheets (Board Stock) Domain  
**Branch:** `rainbow-packaging-testing`  
**Date:** November 3, 2026  
**Status:** Complete, Fully Integrated, Verified  

---

## 1. Executive Summary

This report documents the operational frontend implementation for the **Sheet (Board Stock) Inventory Module** in Rainbow Packaging. The module has been elevated from initial scaffolding into a complete, enterprise-grade workspace covering the full operational lifecycle of paperboard stock:

1. **Invert / Inward (`/sheets/inward`)**: Rapid entry of newly received sheet lots with live dimensional calculations and party/job/quality autocomplete.
2. **Cut / Outward (`/sheets/cut`)**: Step-by-step stock allocation for printing press runs, die-cutting, or sheeter operations with real-time balance calculations, preselection support, and confirmation dialogs.
3. **Inventory Management (`/sheets/inventory`)**: 6-tile live KPI metrics summary, interactive column sorting, search & filtering, Excel batch import trigger, and comprehensive row actions (Cut, View Details, History, Return, Adjust, Void).
4. **Stock Movement History (`/sheets/history`)**: Global immutable transaction audit ledger for all inward, cut, return, and adjustment events across all stock lots with date range and movement-type filtering.
5. **Sheet Details & Journey (`/sheets/details/:id`)**: Comprehensive stock lot inspection view showing exact dimensional metrics, consumption percentage bars, and full chronological lifecycle logs.
6. **Navigation & Workspace Shell (`SheetsAppShell.jsx`)**: Updated collapsible desktop sidebar and mobile navigation drawer with active route highlighting and quick-action shortcuts.

---

## 2. Architecture & Design Principles

The implementation rigorously follows the architectural rules established during system audit:

- **Modular Monolith**: All sheet frontend code resides within `frontend/src/modules/sheets/`, completely isolated from `reels` and shared core modules.
- **Independent Stock Lots**: Every inward transaction generates an independent stock lot with an auto-incremented serial number (`sr_no`). Specification similarities (same party, dimensions, or GSM) are never automatically merged into a single record.
- **Authoritative Backend Calculations with Client-Side Live Preview**:
  - The client provides instantaneous feedback as operators type dimensions and sheet counts.
  - The server remains the single source of truth for stock balance calculations, rounding, and anti-drift ledger records.
- **Formulas Implemented**:
  - **Surface Area per Sheet ($m^2$):** $\frac{\text{Deckle} \times \text{Cutting}}{10,000}$
  - **Weight per Single Sheet ($\text{kg}$):** $\frac{\text{Deckle} \times \text{Cutting} \times \text{GSM}}{10,000,000}$
  - **Total Lot / Issued Weight ($\text{kg}$):** $\frac{\text{Deckle} \times \text{Cutting} \times \text{GSM} \times \text{Quantity}}{10,000,000}$
  - **Anti-Drift Remaining Weight ($\text{kg}$):** $\text{round}\left(\frac{\text{Deckle} \times \text{Cutting} \times \text{GSM} \times \text{Remaining Qty}}{10,000,000}, 2\right)$

---

## 3. Implemented Screens & User Flows

### A. Sheet Invert / Inward Screen (`SheetInwardPage.jsx`)
- **Route:** `/sheets/inward` (with alias from `/sheets/create`)
- **Form Layout:**
  - **1. Party & Job Details:** Party Name (required, with datalist autocomplete from existing active lots) and Job Name (optional, allows blank for general stock).
  - **2. Board Specifications:** Quality (dropdown + custom input supporting standard qualities: `ULTRA`, `EXCEL`, `ANAND`, `DUPLEX`, `FBB`, `SBS`, `KRAFT`), Deckle (cm, supports decimals like `58.5`), Cutting (cm, supports decimals like `74.5`), GSM (e.g. `230`, `250`).
  - **3. Quantity & Logistics:** Number of sheets received, Supplier / Mill Name, Physical Lot / Batch #, Inward Date, Remarks.
- **Live Preview Panel:**
  - Embeds `SheetCalculationPreview` (`mode="inward"`).
  - Displays instantaneous surface area per sheet ($m^2$), weight per sheet (grams and kg), and authoritative total inward weight in both kilograms and metric tons.
- **Submission:**
  - Validates positive dimensions and quantities.
  - Submits to `POST /api/v1/sheets`.
  - Displays success banner showing generated Lot Sr #, sheet count, and weight in kg, followed by smooth redirection to `/sheets/inventory`.

### B. Sheet Cut / Outward Screen (`SheetCutPage.jsx`)
- **Route:** `/sheets/cut` (with alias from `/sheets/update`)
- **Supports Preselection via URL:** Supports `?lotId=<id>` or `?id=<id>` so operators clicking "Cut" on any inventory row land with the lot preselected.
- **Step 1 (`SheetStockSelector.jsx`):**
  - Searchable, filterable list of active lots with remaining balance ($>0$).
  - Displays lot number, party name, job name, dimensions, GSM, and current balance.
- **Step 2 & 3 (`SheetCutForm.jsx`):**
  - Inputs: Quantity to cut (sheets), Cutting date, Destination station (`Offset Printing`, `Die Cutting`, `Pasting`, `Corrugation Liner`, `Scrap/Trim`, `Others`), Job Card #, Production Remarks.
  - Real-time stock validation preventing cuts exceeding current available balance.
  - Live calculation cards displaying exact weight being issued and projected remaining store balance.
  - Confirmation dialog summarizing issuance parameters before execution.
- **Submission:**
  - Submits to `POST /api/v1/sheets/:id/usage` with optimistic concurrency check (`expected_current_quantity`).
  - Displays success banner showing issued weight, destination station, and updated store balance.
  - Quick action to "Issue from Another Lot", "View Stock History", or "Back to Inventory".

### C. Sheet Inventory Management Screen (`SheetsPage.jsx`)
- **Route:** `/sheets/inventory`
- **KPI Summary Strip (`SheetSummaryCards.jsx`):**
  - Total Stock Lots (Active & In-Use counts)
  - Total Available Sheets & Consumed Sheets
  - Total Available Weight (kg & Metric Tons)
  - Partially Consumed Lots count
  - Depleted Lots count
  - Pending Approvals count
- **Action Toolbar:**
  - Direct operational links: Inward (Invert), Cut / Outward, Stock History, and Excel Batch Import.
  - Search bar: Real-time search across Party, Job, Dimensions, GSM, and Serial #.
  - Dropdown filters: Party, Quality, and Status (`AVAILABLE`, `PARTIALLY_CONSUMED`, `DEPLETED`, `VOIDED`).
- **Interactive Inventory Table (`SheetTable.jsx`):**
  - Interactive column sorting on `Sr #`, `Party Name`, `Job Name`, `Balance Qty`, and `Weight (kg)`.
  - Clear color-coded status badges.
  - Complete row action suite:
    - ✂️ **Cut Stock:** Navigates directly to `/sheets/cut?lotId=:id`.
    - 👁️ **View Details:** Navigates to `/sheets/details/:id`.
    - 📜 **Stock History:** Navigates to `/sheets/history?sr_no=:sr_no`.
    - ↩️ **Return Stock:** Opens `SheetReturnModal`.
    - 🔄 **Audit Adjust:** Opens `SheetAdjustmentModal`.
    - 🗑️ **Void Lot:** Admin-only void action with confirmation prompt.

### D. Stock Movement History Screen (`SheetHistoryPage.jsx`)
- **Route:** `/sheets/history`
- **Audit Ledger:** Global chronological table showing every transaction across all lots.
- **Columns:**
  - Transaction ID (#)
  - Date & Time
  - Lot Sr # (with link to lot details)
  - Party Name & Job Name
  - Transaction Type badge (`INWARD`, `CUT / OUTWARD`, `RETURN`, `ADJUSTMENT`, `VOID`)
  - Qty In ($+$) & Qty Out ($-$)
  - Previous Balance & New Balance
  - Weight Impact (kg)
  - Performed By & User Role
  - Approval Status (`Approved`, `Pending`, `Declined`)
- **Filters:**
  - Free text search (`q`)
  - Transaction Type selector (`CREATED`, `CONSUMED`, `RETURNED`, `ADJUSTED`, `VOIDED`)
  - Party dropdown filter
  - Specific Lot Sr # filter (prefillable via `?sr_no=...`)
  - Date range picker (`startDate` to `endDate`)
  - Reset filters and refresh buttons

### E. Sheet Details & Journey Screen (`SheetDetailsPage.jsx`)
- **Route:** `/sheets/details/:id`
- **Overview Strip:**
  - Current Available Sheets and Weight (kg and metric tons).
  - Visual progress bar showing consumption percentage against initial stock.
  - Complete dimensional card: Quality, GSM, Deckle, Cutting, Area per sheet ($m^2$), Single sheet weight (grams).
  - Logistics card: Physical Lot #, Mill/Supplier, Inward Date, Last Activity Date.
- **Lifecycle Event Timeline:**
  - Chronological vertical timeline of every transaction recorded against this stock lot.
  - Details for each event: event type, approval status, station, job card #, quantity, cut weight, actor name, and approver name.
  - Quick action buttons to Cut, Return, or Adjust stock directly from the details page.

---

## 4. Navigation & AppShell Integration

File: `frontend/src/modules/sheets/components/SheetsAppShell.jsx`

- **Sidebar Navigation Items:**
  1. `Switch Module` (`/modules`)
  2. `Dashboard` (`/sheets/dashboard`)
  3. `Inventory` (`/sheets/inventory`)
  4. `Invert / Inward` (`/sheets/inward`)
  5. `Cut / Outward` (`/sheets/cut`)
  6. `Stock History` (`/sheets/history`)
  7. `Messages` (`/sheets/messages`)
- **Quick Actions Modal:**
  - Redesigned with a 4-card responsive grid:
    1. **Invert / Inward:** Add new board stock lot.
    2. **Cut / Outward:** Issue sheets for press run or die-cutting.
    3. **Sheet Inventory:** Inspect stock lots and balances.
    4. **Stock History:** View immutable transaction ledger.
- **Dynamic Window Titles:**
  - Added title mapping for `/sheets/inward`, `/sheets/cut`, `/sheets/history`, `/sheets/details/:id`.
- **Active Route Highlighting:**
  - Configured matching for exact nested routes.

---

## 5. Route Table Configuration

File: `frontend/src/App.jsx`

```jsx
{/* Authenticated Sheets Operational Workspace */}
<Route
  element={
    <ProtectedRoute>
      <SheetsAppShell />
    </ProtectedRoute>
  }
>
  <Route path="/sheets" element={<Navigate to="/sheets/dashboard" replace />} />
  <Route path="/sheets/dashboard" element={<SheetsDashboardPage />} />
  <Route path="/sheets/inventory" element={<SheetsPage />} />
  <Route path="/sheets/inward" element={<SheetInwardPage />} />
  <Route path="/sheets/cut" element={<SheetCutPage />} />
  <Route path="/sheets/history" element={<SheetHistoryPage />} />
  <Route path="/sheets/details/:id" element={<SheetDetailsPage />} />
  
  {/* Backwards compatibility aliases */}
  <Route path="/sheets/create" element={<Navigate to="/sheets/inward" replace />} />
  <Route path="/sheets/update" element={<Navigate to="/sheets/cut" replace />} />
  <Route path="/sheets/messages" element={<SheetsMessagesPage />} />
</Route>
```

---

## 6. Verification & Test Results

### A. Frontend Production Build
```bash
> npm --prefix frontend run build
✓ 1986 modules transformed.
dist/index.html                     0.81 kB │ gzip:   0.44 kB
dist/assets/index-DaP4_JyG.css    141.49 kB │ gzip:  19.05 kB
dist/assets/index-RW32fOxH.js   1,363.75 kB │ gzip: 361.63 kB
✓ built in 724ms
```
- **Status:** PASS (0 errors, 0 warnings).

### B. Backend Automated Test Suite
```bash
> npm --prefix backend test
ℹ tests 45
ℹ suites 8
ℹ pass 45
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ duration_ms 908.98
```
- **Approvals & Auth:** 100% Pass
- **Reel Module Business Logic:** 100% Pass (Untouched, zero regressions)
- **Sheet Calculation Engine:** 100% Pass (Area, single sheet weight, total weight, anti-drift rounding)
- **Excel Register Verification:** 100% Pass (`board-stock-sheet.xlsx` reconciliation of 40 rows, 238,945 sheets, ~30,985.33 kg)

---

## 7. Summary of Files Created & Updated

| File | Type | Purpose |
|---|---|---|
| `frontend/src/modules/sheets/pages/SheetInwardPage.jsx` | Created | Dedicated Invert / Inward screen with live calculation and autocomplete |
| `frontend/src/modules/sheets/pages/SheetCutPage.jsx` | Created | Dedicated Cut / Outward screen with stock selector, live weights, and balance deduction |
| `frontend/src/modules/sheets/pages/SheetHistoryPage.jsx` | Created | Global stock movement history screen with filter controls |
| `frontend/src/modules/sheets/pages/SheetDetailsPage.jsx` | Created | Dedicated lot inspection and journey timeline page |
| `frontend/src/modules/sheets/components/SheetCalculationPreview.jsx` | Component | Live weight and area calculation card (Inward & Cut modes) |
| `frontend/src/modules/sheets/components/SheetStockSelector.jsx` | Component | Searchable stock lot selection table for cutting workflows |
| `frontend/src/modules/sheets/components/SheetCutForm.jsx` | Component | Cutting input form with real-time balance validation & confirmation |
| `frontend/src/modules/sheets/components/SheetHistoryTable.jsx` | Component | Audit ledger table displaying transactions with badges and balance tracking |
| `frontend/src/modules/sheets/components/SheetSummaryCards.jsx` | Component | 6-card live KPI summary strip for store metrics |
| `frontend/src/modules/sheets/components/SheetTable.jsx` | Updated | Added interactive column sorting and complete row action links (Cut, Details, History, Return, Adjust, Void) |
| `frontend/src/modules/sheets/components/SheetsAppShell.jsx` | Updated | Navigation links (Inward, Cut, History), title branding, and 4 quick actions |
| `frontend/src/modules/sheets/pages/SheetsPage.jsx` | Updated | Integrated KPI summary cards, column sorting, top-level action buttons, and row links |
| `frontend/src/modules/sheets/pages/SheetsDashboardPage.jsx` | Updated | Updated quick action buttons and history links |
| `frontend/src/modules/sheets/index.js` | Updated | Barrel exports for all new pages and components |
| `frontend/src/App.jsx` | Updated | Registered operational routes with backward compatibility redirects |

---

## 8. Conclusion

The Sheet / Board Stock Inventory operational frontend is now completely functional, seamlessly integrated with the Rainbow Packaging backend, and ready for end-to-end production testing.

