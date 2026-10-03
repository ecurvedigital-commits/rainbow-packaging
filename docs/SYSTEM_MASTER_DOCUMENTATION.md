# RAINBOW PACKAGES — SYSTEM MASTER DOCUMENTATION

**Project**: Rainbow Packages Reel Inventory Management System  
**Document Type**: Authoritative Single Source of Truth  
**Version**: 2.0.0  
**Status**: APPROVED & ACTIVE  
**Last Updated**: October 3, 2026  

---

## 1. Document Purpose

This document serves as the **single authoritative source of truth** for the Rainbow Packages Reel Inventory Management System. It unites both non-technical business concepts and technical software architecture into one comprehensive reference guide.

Whether you are a company owner, plant manager, storekeeper, or software developer, this document explains how material classifications, technical specifications, physical paper rolls, and inventory transactions operate together.

---

## 2. Who Should Read It

- **Company Owner / Management**: Read Sections 3, 10, 11, and 18 for a high-level, plain-language business overview.
- **Plant Supervisors & Operators**: Read Sections 5, 8, 9, 13, and 18 for shopfloor workflow and inventory transaction guidance.
- **Software Developers & System Architects**: Read Sections 4, 6, 7, 12, 15, 16, 20, 21, 22, 23, and 26 for exact data schemas, APIs, formulas, and technical invariants.

---

## 3. Simple Business Overview

Rainbow Packages manufactures packaging products using large rolls of paper and corrugated board known as **Reels**.

To manage inventory accurately without blocking shopfloor operations, the system separates the tracking into **four distinct levels**:

1. **Business Master Code**: Easy business catalog item numbers (e.g., Code 1, Code 7, Code 19, Code 20) used by storekeepers and operators.
2. **Technical Master Key**: System-calculated material identity (e.g., `VK-G120-BF18-S100`) generated automatically from paper strength, density, grade, and width.
3. **Physical Reel Number**: Unique serial barcode attached to every individual paper roll in the warehouse (e.g., Reel `#R-2201`).
4. **Reel Event**: Immutable transaction ledger tracking every receiving, usage, return, and location transfer event.

---

## 4. System Terminology

| Term | Category | Definition |
| :--- | :--- | :--- |
| **Quality** | Specification | Paper grade type (e.g., `VK`, `SPECTRA`, `ULTRA`, `SK`, `IMPORTANT`, `SBS`, `FBB`, `DCB`). |
| **GSM** | Specification | Grams per Square Metre density (e.g., `120`, `150`). |
| **BF** | Specification | Bursting Factor paper strength rating (e.g., `18`, `20`, `24`). |
| **Size** | Specification | Reel width in centimetres or inches (e.g., `100`, `115`). |
| **Max Weight** | Inventory Metric | Initial gross weight of reel when purchased (immutable baseline). |
| **Previous Weight**| Inventory Metric | Running confirmed balance weight of the reel. |
| **Current Weight** | Inventory Metric | Freshly entered weight measured during usage. |
| **Record Status** | System State | `ACTIVE` (normal operational record) or `VOIDED` (archived record). |

---

## 5. Business Master Code

The **Business Master Code** is the business-facing classification/identity used repeatedly by the warehouse and factory storekeeping process.

- **Purpose**: Gives operators a simple, fast way to select catalog entries on the shopfloor.
- **Format**: Dynamic string/number (e.g., `1`, `2`, `7`, `19`, `20`, `21`).
- **Initial Dataset**: Initial business catalog values are codes **1 through 19**.
- **Future Growth**: The system database supports future Business Master Codes (**20, 21, 22...**) dynamically without schema changes.
- **Workflow**: The Operator **SELECTS** the Business Master Code during Reel creation. The Operator does **NOT** type or generate it manually.

---

## 6. Technical Master Key

The **Technical Master Key** is the system-generated technical identity derived from the material's exact physical specification:

$$\text{Technical Master Key} = \text{QualityCode} - \text{GsmCode} - \text{BfCode} - \text{SizeCode}$$

- **Purpose**: Aggregates inventory stock metrics (total weight, available weight, consumed weight) across reels of identical technical specifications.
- **Calculation**: Derived automatically from `Quality + GSM + BF + Size`.
- **User Control**: The Operator **NEVER** selects or types the Technical Master Key. It is purely read-only and system-derived.

---

## 7. Master Product

A **Master Product** represents a unique technical specification entity stored in the database (`MasterProduct` collection). It anchors a specific `master_key` and connects it to the associated `master_code_id`.

---

## 8. Physical Reel

A **Physical Reel** represents an individual paper roll in the godown identified by a unique `reel_no` (e.g., `R-2201`). Multiple physical reels with identical technical specs link to the exact same Master Product and Master Key.

---

## 9. Reel Events

Every inventory movement is recorded as an immutable **Reel Event** (`ReelEvent` collection). Transactions (**Receive**, **Usage**, **Return**, **Transfer**) alter weights and status logs, but do **NOT** create new Master Codes or Master Keys.

---

## 10. Do Not Confuse These Four Things

| Item | Meaning | Example | Who / What Controls It |
| :--- | :--- | :--- | :--- |
| **Business Master Code** | Business catalog / material identity | `7` | Admin/Supervisor creates; Operator selects |
| **Technical Master Key** | Technical specification identity | `VK-G120-BF18-S100` | System calculates automatically |
| **Reel Number** | Physical reel identity | `R-2201` | Physical barcode / factory tag |
| **Reel Event** | Inventory movement history log | `CREATED`, `USAGE_LOGGED` | System records transaction |

---

## 11. Simple Indian Manufacturing Business Example

Master Code ko business/material ka simple code samajhiye. Operator ke liye ye easy identification number hai, jaise **Master Code 7**.

Technical Master Key us material ki technical specification ki identity hai. Agar Master Code 7 ka material Quality `VK`, GSM `120`, BF `18` aur Size `100` hai, to system automatically Technical Master Key **`VK-G120-BF18-S100`** banata hai.

Isliye operator Master Code select karta hai, Master Key nahi.

Agar same technical specification ki 10 reels godown me rakhi hain:
- Un 10 reels ka **Business Master Code**: Same (`7`).
- Un 10 reels ka **Technical Master Key**: Same (`VK-G120-BF18-S100`).
- Lekin un 10 reels ka **Reel Number**: Alag-alag hoga (`R-1001`, `R-1002`, ..., `R-1010`).

---

## 12. Complete Relationship Hierarchy Diagram

```text
                    BUSINESS MASTER CODE
                         Code: 7
                           │
             ┌─────────────┴─────────────┐
             │                           │
             ↓                           ↓
      MASTER PRODUCT A            MASTER PRODUCT B
      Master Key A                Master Key B
      (VK-G120-BF18-S100)         (VK-G150-BF18-S100)
             │                           │
       ┌─────┴─────┐                ┌────┴────┐
       ↓           ↓                ↓         ↓
     Reel R-1001 Reel R-1002      Reel R-1003 Reel R-1004
       │           │
       ↓           ↓
    Events       Events
       ├─ Receive  ├─ Receive
       ├─ Usage    ├─ Usage
       └─ Transfer └─ Transfer
```

---

## 13. Reel Creation Workflow (Step-by-Step)

```text
[Step 1: Operator selects Master Code 7]
                 ↓
[Step 2: System populates Quality: VK, GSM: 120, BF: 18, Size: 100]
                 ↓
[Step 3: System calculates & displays Read-Only Master Key: VK-G120-BF18-S100]
                 ↓
[Step 4: Operator enters Reel No R-2201 & Max Weight 1000 kg]
                 ↓
[Step 5: Backend resolves MasterProduct & attaches references]
```

1. **Step 1**: Operator opens "Create Reel" and selects **Master Code** from dropdown (e.g., `Master Code 7`).
2. **Step 2**: The form pre-fills technical parameters: Quality (`VK`), GSM (`120`), BF (`18`), Size (`100 cm`).
3. **Step 3**: The modal immediately calculates and displays `Technical Master Key: VK-G120-BF18-S100` as a **READ-ONLY** badge. Operator cannot edit this value manually.
4. **Step 4**: Operator enters physical reel details (`reel_no`, `supplier_name`, `max_weight`, `purchase_date`).
5. **Step 5**: On submit, backend atomically resolves/creates `MasterProduct` and stores `master_code`, `master_code_id`, `master_product_id`, and `master_key` on the Reel document.

---

## 14. Inventory Lifecycle Behavior

- **RECEIVE**: Creates physical Reel document and `CREATED` event. Links to `MasterCode` and `MasterProduct`.
- **USAGE**: Operator logs current measured weight. System computes `used_this_time = previous_weight - current_weight`. Applies immediately as "Pending Confirmation".
- **RETURN / REVERT**: If a Supervisor declines a usage entry, the system automatically reverts `previous_weight` to the pre-entry state.
- **TRANSFER**: Location movement recorded in event ledger without altering Master Code or Master Key.

---

## 15. Master Key Canonical Formula & Normalization Rules

$$\text{MasterKey} = \text{QualityCode} - \text{GsmCode} - \text{BfCode} - \text{SizeCode}$$

### Normalization Rules
1. **Quality Code**: Trimmed, uppercase string. `VK` $\rightarrow$ `VK`, `SPECTRA` $\rightarrow$ `SPC`, `ULTRA` $\rightarrow$ `ULT`, `SK` $\rightarrow$ `SK`, `IMPORTANT` $\rightarrow$ `IMP`, `SBS` $\rightarrow$ `SBS`, `FBB` $\rightarrow$ `FBB`, `DCB` $\rightarrow$ `DCB`.
2. **GSM Code**: Prefix `G` + 3-digit zero-padded integer for values $< 100$ (e.g., `80` $\rightarrow$ `G080`, `120` $\rightarrow$ `G120`).
3. **BF Code**: Prefix `BF` + integer (e.g., `18` $\rightarrow$ `BF18`).
4. **Size Code**: Prefix `S` + number rounded to max 1 decimal place, stripping `.0` for whole numbers (e.g., `100` $\rightarrow$ `S100`, `45.5` $\rightarrow$ `S45.5`).

---

## 16. Master Key Uniqueness Rules

- **Not Unique Per Reel**: Multiple physical reels with identical technical specs share the **exact same** Technical Master Key.
- **Unique Per Spec**: Each distinct specification combination (`Quality + GSM + BF + Size`) has exactly **one** unique `MasterProduct` document in MongoDB.

---

## 17. Business Master Code Lifecycle

- **Initial Dataset**: Codes 1 to 19 exist in default seed data.
- **Growth**: Admins and Supervisors can create new Master Codes (`20`, `21`, `22`...) anytime via `/master-codes`.
- **Immutability**: Once reels are linked to a Master Code, deleting or altering the Master Code is restricted to protect audit history.

---

## 18. User Roles and Permissions (RBAC)

| Action | OPERATOR | SUPERVISOR | ADMIN |
| :--- | :---: | :---: | :---: |
| **Select Active Master Code during Reel Creation** | ✅ Yes | ✅ Yes | ✅ Yes |
| **View Technical Master Key & Inventory** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Record Reel Usage** | ✅ Yes | ❌ No | ✅ Yes |
| **Confirm / Decline Pending Approvals** | ❌ No | ✅ Yes | ✅ Yes |
| **Create / Edit / Deactivate Master Codes** | ❌ No | ✅ Yes | ✅ Yes |
| **Master Reel Weight Correction & Void Reel** | ❌ No | ❌ No | ✅ Yes |

---

## 19. Product Filtering & Stock Grouping

- **Master Code Filtering**: Search and filter reels by business catalog code (`master_code`).
- **Master Key Aggregation**: Aggregate total max weight, available weight, and consumed weight per `master_key` on `/master-products`.

---

## 20. Current Frontend Behavior

- `CreateReelModal.jsx`: Features Step 1 dropdown, Step 2 spec pre-fills, and Step 3 read-only Technical Master Key preview badge.
- `MasterCodeListPage.jsx`: Dedicated page (`/master-codes`) for Supervisors & Admins to view, search, create, and edit Master Codes.
- `AppShell.jsx`: Includes collapsible desktop sidebar with persistent `localStorage` preference and navigation link to `Master Codes`.

---

## 21. Current Backend Behavior

- `resolveMasterProduct`: Atomically finds existing `MasterProduct` by `master_key` or creates a new one inside Mongoose transaction.
- `createReel`: Saves `master_code`, `master_code_id`, `master_product_id`, and `master_key` on Reel document.
- `buildReelFilter`: Supports multi-select `$in` query filtering for `master_code` and `master_key`.

---

## 22. Important Database Schemas

### `MasterCode` Schema (`backend/src/models/masterCode.model.js`)
```javascript
{
  master_code: { type: String, required: true, unique: true },
  master_code_name: { type: String, required: true },
  quality: { type: String, required: true, enum: QUALITIES },
  gsm: { type: Number, required: true },
  bf: { type: Number, required: true },
  size: { type: Number, required: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  created_by: { type: Schema.Types.ObjectId, ref: 'User' },
  updated_by: { type: Schema.Types.ObjectId, ref: 'User' }
}
```

### `MasterProduct` Schema (`backend/src/models/masterProduct.model.js`)
```javascript
{
  master_key: { type: String, required: true, unique: true },
  master_code_id: { type: Schema.Types.ObjectId, ref: 'MasterCode' },
  master_code: { type: String },
  name: { type: String, required: true },
  quality: { type: String, required: true },
  gsm: { type: Number, required: true },
  bf: { type: Number, required: true },
  size: { type: Number, required: true },
  parameter_codes: { quality: String, gsm: String, bf: String, size: String },
  is_active: { type: Boolean, default: true }
}
```

### `Reel` Schema (`backend/src/models/reel.model.js`)
```javascript
{
  sr_no: { type: Number, required: true, unique: true },
  reel_no: { type: String, required: true },
  master_product_id: { type: Schema.Types.ObjectId, ref: 'MasterProduct' },
  master_key: { type: String },
  master_code_id: { type: Schema.Types.ObjectId, ref: 'MasterCode' },
  master_code: { type: String },
  quality: { type: String, required: true },
  gsm: { type: Number, required: true },
  bf: { type: Number, required: true },
  size: { type: Number, required: true },
  max_weight: { type: Number, required: true },
  previous_weight: { type: Number, required: true },
  status: { type: String, required: true },
  record_status: { type: String, default: 'ACTIVE' }
}
```

---

## 23. API Technical Reference

| Endpoint | Method | Roles | Purpose |
| :--- | :--- | :--- | :--- |
| `/api/v1/master-codes` | `GET` | ALL | List active Master Codes for dropdown selection. |
| `/api/v1/master-codes` | `POST` | ADMIN, SUPERVISOR | Create new Master Code (e.g. Code 20+). |
| `/api/v1/master-codes/:id` | `PUT` | ADMIN, SUPERVISOR | Update Master Code details or status. |
| `/api/v1/master-products` | `GET` | ALL | List Master Products with aggregated stock metrics. |
| `/api/v1/reels` | `POST` | ADMIN, OPERATOR | Create Reel and link to Master Code & Master Key. |

---

## 24. Migration & History Summary

- Initial system operated on physical `reel_no` only.
- Phase 1 & 2 introduced the `MasterProduct` and `master_key` aggregation layer.
- Phase 3 introduced the `MasterCode` business catalog layer, establishing a 4-level hierarchy without breaking technical `master_key` functionality.

---

## 25. Common Misunderstandings

1. **"Is Master Code calculated from Master Key?"** $\rightarrow$ **NO.** Master Code is a business catalog entry assigned by management.
2. **"Does every Reel get its own unique Master Key?"** $\rightarrow$ **NO.** Reels with identical specs share the exact same Technical Master Key.
3. **"Can operators edit the Technical Master Key?"** $\rightarrow$ **NO.** The Technical Master Key is strictly read-only and system-derived.

---

## 26. Developer Rules & System Invariants

1. **NEVER** replace `master_key` with `master_code` or rename `master_key`.
2. **NEVER** hard-code 19 as the maximum limit for Master Codes.
3. **NEVER** allow Operators to manually input or override `master_key`.
4. **ALWAYS** run `npm test` and `npm run build` after modifying inventory or master-data logic.

---

## 27. Documentation Status and Version

- **Current Version**: 2.0.0
- **Status**: Officially Verified & Authoritative

---

## 28. Change History

- **v1.0.0 (Sept 2026)**: Initial Master Product Key system architecture.
- **v1.5.0 (Sept 2026)**: Added database-level pagination, keep-alive service, and single Render deployment blueprint.
- **v2.0.0 (Oct 2026)**: Introduced Business Master Code layer, updated Reel Creation flow, and consolidated authoritative master documentation.
