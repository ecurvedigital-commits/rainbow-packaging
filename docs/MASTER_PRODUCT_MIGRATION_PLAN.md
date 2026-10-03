# Master Product System — Phase 6: Migration Strategy & Execution Plan

**Project:** Rainbow Packages Reel Inventory Management System  
**Date:** September 29, 2026  
**Document Version:** 1.0.0  

---

## 1. Objective

To safely update all existing physical reel records in MongoDB to reference their corresponding `MasterProduct` document without causing downtime, missing records, or duplicate Master Products.

---

## 2. Migration Strategy (Dry-Run & Commit)

The migration script `backend/scripts/migrateMasterProducts.js` operates in two modes:

1. **Dry-Run Mode (Default)**:
   - Scans all `Reel` documents in the database.
   - Evaluates product-defining fields (`quality`, `gsm`, `bf`, `size`).
   - Generates candidate Master Keys.
   - Checks for missing or unparseable fields.
   - Calculates total Master Products that will be created.
   - Outputs a migration dry-run report without modifying data.

2. **Execute Mode (`--commit`)**:
   - Performs atomic upserts for `MasterProduct` documents.
   - Bulk updates existing `Reel` documents with `master_product_id` and `master_key`.
   - Validates that 100% of eligible active reels are attached to a Master Product.
   - Saves final migration execution summary to `scratch/migration_report.json`.

---

## 3. Migration Pipeline Steps

```text
[Existing Reels] ──> [Normalize Specs] ──> [Generate Keys] ──> [Upsert Master Products] ──> [Attach Reel Refs] ──> [Verification Report]
```

1. **Scan Phase**: Query all `Reel` documents (`record_status: ACTIVE` and `record_status: VOIDED`).
2. **Key Calculation Phase**: Pass `quality`, `gsm`, `bf`, `size` into `generateMasterKey()`.
3. **Grouping Phase**: Group reels by generated `master_key`.
4. **Creation Phase**: Create unique `MasterProduct` for each distinct `master_key`.
5. **Linking Phase**: Update `Reel` documents setting `master_product_id = MasterProduct._id` and `master_key = MasterProduct.master_key`.
6. **Validation Phase**: Assert `Reel.countDocuments({ master_product_id: null }) === 0`.
