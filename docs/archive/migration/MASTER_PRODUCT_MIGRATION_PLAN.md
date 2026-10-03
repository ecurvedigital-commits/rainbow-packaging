# Master Product System — Phase 6: Migration Strategy & Execution Plan (Historical Archive)

**Project:** Rainbow Packages Reel Inventory Management System  
**Date:** September 29, 2026  
**Document Version:** 1.0.0 (Archived)  
**Authoritative Reference:** Please refer to [SYSTEM_MASTER_DOCUMENTATION.md](file:///k:/GitHub/ecurve/rainbow-packaging/docs/SYSTEM_MASTER_DOCUMENTATION.md) for active specifications.

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
