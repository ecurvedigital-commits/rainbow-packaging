# Master Product Key & Classification System — Phase 1: Discovery Report (Historical Archive)

**Project:** Rainbow Packages Reel Inventory Management System  
**Date:** September 29, 2026  
**Document Version:** 1.0.0 (Archived)  
**Authoritative Reference:** Please refer to [SYSTEM_MASTER_DOCUMENTATION.md](file:///k:/GitHub/ecurve/rainbow-packaging/docs/SYSTEM_MASTER_DOCUMENTATION.md) for active system specifications.

---

## Business Master Code vs Technical Master Key

```text
Business Master Code  = Business classification identity (e.g., Code 1, Code 19, Code 20...)
Technical Master Key  = Deterministic technical material specification (e.g., VK-G120-BF18-S32)
Physical Reel Number  = Physical inventory unit identity (e.g., Reel #R-2201)
Reel Event            = Immutable inventory movement transaction log
```

- **Business Master Code**: Assigned by Admin/Supervisor for storekeeping and business inventory cataloging.
- **Technical Master Key**: System-calculated from `Quality + GSM + BF + Size` for technical material stock aggregation.

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
