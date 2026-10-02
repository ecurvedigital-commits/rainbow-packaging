# Master Product System — Phase 2: Business Rules & Specification

**Project:** Rainbow Packages Reel Inventory Management System  
**Date:** September 29, 2026  
**Document Version:** 1.0.0  

---

## 1. Product-Defining Parameters (Master Key Inputs)

A **Master Product** represents a unique paper/board material specification category. The identity of a Master Product is strictly determined by four product-defining parameters:

```text
1. Quality        (Paper grade name)
2. GSM            (Grams per Square Metre density)
3. BF             (Bursting Factor paper strength)
4. Size           (Reel width in inches / cm)
```

### Parameter Specification Rules

| Parameter | Type | Required | Validation Rule | Code Prefix | Code Output Example |
|---|---|---|---|---|---|
| **Quality** | String (Enum) | Yes | Must be one of `QUALITIES` (`VK`, `SPECTRA`, `ULTRA`, `SK`, `IMPORTANT`, `SBS`, `FBB`, `DCB`) | Exact / Abbrev | `VK`, `SPC`, `ULT`, `SK`, `IMP`, `SBS`, `FBB`, `DCB` |
| **GSM** | Number | Yes | Positive integer (`gsm > 0`) | `G` | `G080`, `G100`, `G120`, `G150` |
| **BF** | Number | Yes | Positive integer (`bf > 0`) | `BF` | `BF16`, `BF18`, `BF20`, `BF24` |
| **Size** | Number | Yes | Positive float (`size > 0`), formatted to max 1 decimal | `S` | `S32`, `S45.5`, `S100` |

---

## 2. Non-Product-Defining Parameters (Physical Reel Fields)

The following fields belong strictly to individual physical reels and **DO NOT** affect or alter the Master Product identity:

- `reel_no`: Physical reel barcode / tag ID (e.g. `R-1001`).
- `sr_no`: Database auto-incrementing serial sequence.
- `supplier_name`: Procurement supplier name (e.g. `ITC Limited`, `JK Paper`).
- `max_weight`: Initial purchased gross weight in kg.
- `previous_weight`: Remaining balance weight in kg.
- `purchase_date`: Procurement timestamp.
- `status`: Derived physical stock status (`REEL`, `CUT`, `NILL`).
- `stations_used`: Array of factory usage station identifiers.
- `pending_count`: Pending supervisor approval count.
- `record_status`: Active or Voided status.

---

## 3. Normalization Rules

Before generating a Master Key, input values must pass through normalization functions:

1. **Quality Normalization**:
   - Trim whitespace.
   - Convert to uppercase.
   - Ensure membership in `QUALITIES`.

2. **GSM Normalization**:
   - Parse string/numeric input to integer.
   - Format numeric string with prefix `G` and zero-padded 3 digits if `< 100` (e.g., `80` → `G080`, `120` → `G120`).

3. **BF Normalization**:
   - Parse string/numeric input to integer.
   - Format with prefix `BF` (e.g., `18` → `BF18`).

4. **Size Normalization**:
   - Parse string/numeric input to float.
   - Round to 1 decimal place.
   - Remove trailing `.0` if integer (e.g., `32.0` → `32`, `45.5` → `45.5`).
   - Format with prefix `S` (e.g., `32` → `S32`).

---

## 4. Canonical Key Ordering & Formula

The Master Key is generated deterministically by joining normalized parameter codes in exact fixed order:

$$\text{MasterKey} = \text{QualityCode} + \text{"-"} + \text{GsmCode} + \text{"-"} + \text{BfCode} + \text{"-"} + \text{SizeCode}$$

### Example Transformations

| Input Specification | Quality Code | GSM Code | BF Code | Size Code | Canonical Master Key |
|---|---|---|---|---|---|
| Quality: VK, GSM: 120, BF: 18, Size: 32 | `VK` | `G120` | `BF18` | `S32` | **`VK-G120-BF18-S32`** |
| Quality: SPECTRA, GSM: 100, BF: 16, Size: 45.5 | `SPC` | `G100` | `BF16` | `S45.5` | **`SPC-G100-BF16-S45.5`** |
| Quality: ULTRA, GSM: 80, BF: 20, Size: 28 | `ULT` | `G080` | `BF20` | `S28` | **`ULT-G080-BF20-S28`** |

---

## 5. Uniqueness & Concurrency Business Rules

1. **Unique Identity Constraint**:
   - The `master_key` field in the database is strictly unique across all active master products.
   - Database unique index enforces `master_key` uniqueness.

2. **Atomic Create-or-Lookup (Concurrency Safe)**:
   - When creating a physical reel, the system calculates `master_key`.
   - The system executes an atomic `findOneAndUpdate` with `upsert: true` or transaction find-or-create logic.
   - Multiple concurrent reel creation requests for the same specification will securely resolve to the exact same single `MasterProduct` document.

3. **Immutable Identity Parameters**:
   - Once a `MasterProduct` document exists, its identity parameters (`quality`, `gsm`, `bf`, `size`, `master_key`) cannot be mutated directly if physical reels are attached.
   - Admin can update metadata (such as `name`, `description`, `is_active`).
   - If an existing physical reel's specification is modified by Admin, the reel's reference (`master_product_id` and `master_key`) is recalculated and reassigned to the matching target `MasterProduct`.
