# Master Product Key & Classification System — Phase 1: Discovery Report

**Project:** Rainbow Packages Reel Inventory Management System  
**Date:** September 29, 2026  
**Document Version:** 1.0.0  

---

## 1. Executive Summary & Core Objective

The **Rainbow Packages Reel Inventory Management System** currently manages inventory at the individual physical reel level identified by `reel_no` (e.g., `R-1001`, `R-1002`). While this tracks individual physical reels, it lacks a logical product classification layer to aggregate inventory across reels of identical paper/board specifications.

This Discovery Report establishes the architectural foundation for introducing a **Master Product Key System** to decouple **Product Specification Identity** from **Physical Reel Identity**.

```text
               MASTER PRODUCT / REEL SPECIFICATION
                                │
          ┌─────────────────────┼─────────────────────┐
          ↓                     ↓                     ↓
     Parameter 1           Parameter 2           Parameter 3
      (Quality)               (GSM)                 (BF)
          │                     │                     │
          └─────────────────────┼─────────────────────┘
                                │
                                ↓
                        DETERMINISTIC KEY
                      (VK-G120-BF18-S32)
                                │
               ┌────────────────┼────────────────┐
               ↓                ↓                ↓
           Reel A           Reel B           Reel C
         (R-1001)         (R-1002)         (R-1003)
```

### Core Hierarchy Principles
1. **Master Key (`master_key`)**: Identifies **WHAT KIND OF REEL IT IS** (Product Specification Category).
2. **Reel Number (`reel_no`)**: Identifies **WHICH PHYSICAL REEL IT IS** (Unique Physical Inventory Item).
3. **Strict Separation**: Master Key and Reel Number remain distinct concepts across database schemas, APIs, business logic, and UI representations.

---

## 2. Audit of Existing Reel Data Model & Parameters

An audit of the existing backend `Reel` schema ([reel.model.js](file:///k:/GitHub/ecurve/rainbow-packaging/backend/src/models/reel.model.js)), validation rules, and sample datasets reveals 14 existing reel fields. These fields are categorized into identity vs physical parameters:

### A. Product Classification Parameters (Master Key Candidates)
These describe the fundamental physical paper/board specification:

| Field | Data Type | Current Values / Constraints | Role in Master Key | Rationale |
|---|---|---|---|---|
| `quality` | String (Enum) | `VK`, `SPECTRA`, `ULTRA`, `SK`, `IMPORTANT`, `SBS`, `FBB`, `DCB` | **REQUIRED** | Primary paper grade category. |
| `gsm` | Number | Integer > 0 (e.g., `80`, `100`, `120`, `150`) | **REQUIRED** | Grams per Square Metre; standard paper density spec. |
| `bf` | Number | Integer > 0 (e.g., `16`, `18`, `20`, `24`) | **REQUIRED** | Bursting Factor; standard paper strength spec. |
| `size` | Number | Float/Integer > 0 (e.g., `28`, `32`, `45.5`) | **REQUIRED** | Reel width in inches/cm; physical dimension spec. |

### B. Individual Physical Reel Parameters (Non-Product Identity)
These describe a specific physical item or transaction event and **MUST NOT** be included in the Master Key:

| Field | Data Type | Purpose | Why Excluded from Master Key |
|---|---|---|---|
| `sr_no` | Number | Sequential internal serial number | Database sequence identifier. |
| `reel_no` | String | Unique physical reel barcode/tag | Unique physical item identifier. |
| `max_weight` | Number | Initial purchased weight (kg) | Varies per physical reel; procurement quantity. |
| `previous_weight` | Number | Current balance weight (kg) | Dynamic state changing upon consumption. |
| `purchase_date` | Date | Procurement date | Transaction metadata. |
| `status` | String | Derived balance state (`REEL`, `CUT`, `NILL`) | Dynamic inventory status. |
| `stations_used` | Array[String] | Factory usage location history | Historical operational log. |
| `pending_count` | Number | Pending approval count | Workflow state. |
| `record_status` | String | `ACTIVE` or `VOIDED` | Soft-deletion flag. |
| `last_activity_at`| Date | Last movement timestamp | Activity tracking timestamp. |
| `created_by` | ObjectId | Operator/Admin user ID | User audit tracking. |

### C. Borderline & Ambiguous Fields (Requires Review)

1. **`supplier_name`**:
   - *Current State*: Mandatory string (e.g., `ITC Limited`, `JK Paper`).
   - *Analysis*: If Supplier is included in the Master Key, reels of identical specification (VK, 120 GSM, 18 BF, 32 Size) from different suppliers will produce *different* Master Keys (`VK-G120-BF18-S32-ITC` vs `VK-G120-BF18-S32-JK`).
   - *Recommendation*: **Exclude Supplier from Master Key identity**. Treat Supplier as procurement metadata attached to individual reels, allowing true aggregate product stock calculations across suppliers.
2. **`custom_fields`**:
   - *Current State*: Dynamic JSON object driven by `FieldDefinition`.
   - *Analysis*: Future custom fields (e.g. `shade`, `coating`) could define product specs.
   - *Recommendation*: By default, exclude custom fields from key generation unless a field definition explicitly sets `is_product_defining: true`.

---

## 3. Master Key Parameter Code System & Normalization Rules

### A. Parameter Code Mapping
To ensure compact, readable, and deterministic keys, each parameter value will map to a standardized code:

1. **Quality Codes**:
   - `VK` → `VK`
   - `SPECTRA` → `SPC`
   - `ULTRA` → `ULT`
   - `SK` → `SK`
   - `IMPORTANT` → `IMP`
   - `SBS` → `SBS`
   - `FBB` → `FBB`
   - `DCB` → `DCB`

2. **GSM Codes**:
   - Formula: Prefix `G` + zero-padded 3-digit integer (or exact integer string).
   - Examples: `80` → `G080`, `100` → `G100`, `120` → `G120`, `150` → `G150`.

3. **BF Codes**:
   - Formula: Prefix `BF` + integer value.
   - Examples: `16` → `BF16`, `18` → `BF18`, `20` → `BF20`.

4. **Size Codes**:
   - Formula: Prefix `S` + normalized number (trim trailing zeros for decimals).
   - Examples: `32` → `S32`, `45.5` → `S45.5`.

### B. Canonical Ordering & Deterministic Key Formula
The parameters will always be joined in a fixed, immutable order using hyphen `-` delimiters:

```text
MASTER_KEY = [QUALITY_CODE]-[GSM_CODE]-[BF_CODE]-[SIZE_CODE]
```

**Example:**
- Quality: `VK`
- GSM: `120`
- BF: `18`
- Size: `32`
- **Resulting Master Key:** `VK-G120-BF18-S32`

### C. Normalization Rules
Before code conversion, inputs must be strictly normalized:
1. **String trimming**: Uppercase and trim all quality text.
2. **Numeric coercion**: Coerce strings (`"120"`, `120.0`) to canonical numeric representations.
3. **Decimal handling**: `Size` values must round to 1 decimal place if non-integer (`45.5`), stripping unnecessary trailing `.0` (`45.0` → `45`).

---

## 4. Proposed Data Model Architecture

### A. New Entity: `MasterProduct`
A dedicated collection `masterproducts` will store unique product classifications:

```javascript
const masterProductSchema = new mongoose.Schema(
  {
    master_key: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    quality: { type: String, required: true, enum: QUALITIES },
    gsm: { type: Number, required: true },
    bf: { type: Number, required: true },
    size: { type: Number, required: true },
    parameter_codes: {
      quality: String,
      gsm: String,
      bf: String,
      size: String,
    },
    is_active: { type: Boolean, default: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  }
);

// Indexes
masterProductSchema.index({ master_key: 1 }, { unique: true });
masterProductSchema.index({ quality: 1, gsm: 1, bf: 1, size: 1 }, { unique: true });
masterProductSchema.index({ is_active: 1, master_key: 1 });
```

### B. Extension to `Reel` Model
The `Reel` schema will be extended with normalized references:

```javascript
// Addition to reelSchema:
master_product_id: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'MasterProduct',
  required: true,
},
master_key: {
  type: String,
  required: true,
  trim: true,
  index: true,
}

// Index addition:
reelSchema.index({ record_status: 1, master_key: 1 });
reelSchema.index({ record_status: 1, master_product_id: 1 });
```

---

## 5. API Architecture & Endpoint Design

### A. New Endpoints (`/api/v1/master-products`)
1. `GET /api/v1/master-products`: Paginated list of Master Products with reel counts and total/available weight aggregations.
2. `GET /api/v1/master-products/:id`: Master Product detail with parameter breakdown.
3. `GET /api/v1/master-products/:id/reels`: Paginated list of physical reels belonging to a specific Master Product.
4. `POST /api/v1/master-products/preview-key`: Utility endpoint for frontend live key preview during reel creation.

### B. Updates to Existing Endpoints
1. `POST /api/v1/reels` (Reel Creation):
   - Computes canonical `master_key`.
   - Atomically finds existing `MasterProduct` or creates one if it doesn't exist.
   - Saves `master_product_id` and `master_key` on the created `Reel`.
2. `GET /api/v1/reels` & `GET /api/v1/reels/search`:
   - Add support for `master_key` filter parameter.
   - Include `master_key` in returning reel JSON objects.
3. `GET /api/v1/dashboard/summary` & `status-board`:
   - Add aggregated metrics: `total_master_products`, `stock_by_master_key`.

---

## 6. Frontend UI/UX Impact

1. **New Page `/master-products` (Master Product Inventory)**:
   - Metric summary cards: Total Master Products, Active Specifications, Products with Stock.
   - Master Product table displaying: Master Key badge, Specification summary (Quality, GSM, BF, Size), Physical Reel Count, Total Stock Weight, Available Stock Weight.
2. **Master Product Detail View**:
   - Deep-dive drawer/page showing specification parameter cards and associated physical reels.
3. **Create Reel Modal Update**:
   - Real-time Master Key preview box (`VK-G120-BF18-S32`) updating dynamically as Quality, GSM, BF, Size are typed.
4. **Reel List & Journey UI**:
   - Prominent display of `Master Key` badge alongside `Reel No`.

---

## 7. Historical Data Migration Strategy & Risk Analysis

### A. Dry-Run Migration Plan
Existing reels in the database do not have `master_product_id` or `master_key`. A dedicated migration script (`scripts/migrateMasterProducts.js`) will execute:
1. Scan all active and voided reels.
2. Extract `quality`, `gsm`, `bf`, `size`.
3. Normalize values and generate `master_key`.
4. Upsert `MasterProduct` document for each unique specification.
5. Populate `master_product_id` and `master_key` on each reel.
6. Generate a detailed execution report:
   - Total Reels processed.
   - Master Products created.
   - Reels successfully linked.
   - Flagged records with invalid/missing spec data.

---

## 8. Unresolved Business Questions & Decisions for Review

Before proceeding to implementation, the following decisions are submitted for review:

> [!IMPORTANT]
> **Decision 1: Supplier Name Treatment**
> Should Supplier Name participate in the Master Key identity (e.g. `VK-G120-BF18-S32-ITC`) or remain procurement metadata attached to individual reels?  
> **Proposed Recommendation:** Exclude Supplier from the Master Key. This allows grouping reels of identical physical paper specs from different suppliers into a single Master Product category.

> [!IMPORTANT]
> **Decision 2: Canonical Master Key Format**
> Is the proposed format `[QUALITY_CODE]-[GSM_CODE]-[BF_CODE]-[SIZE_CODE]` (e.g. `VK-G120-BF18-S32`) approved as the standard product key structure?  
> **Proposed Recommendation:** Yes, this 4-parameter structure reflects the standard paper industry specification identity.

> [!IMPORTANT]
> **Decision 3: Master Product Lifecycle**
> Should Master Products be created **automatically** on-the-fly when a new reel specification is entered, or require explicit Admin pre-approval?  
> **Proposed Recommendation:** Automatic lookup-or-create during Reel creation, with Admin ability to view, manage metadata, and toggle active status.

---

### Summary of Next Steps
Upon completion of Phase 1 Discovery, Phase 2 (Business Rules Specification) and Phase 3 (Data Model & Master Key Engine Implementation) will begin.
