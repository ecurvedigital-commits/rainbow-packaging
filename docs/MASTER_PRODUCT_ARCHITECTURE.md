# Master Product System — Phase 3: System Architecture & Data Schema

**Project:** Rainbow Packages Reel Inventory Management System  
**Date:** September 29, 2026  
**Document Version:** 1.0.0  

---

## 1. Data Schemas

### A. `MasterProduct` Schema (`backend/src/models/masterProduct.model.js`)

```javascript
import mongoose from 'mongoose';
import { QUALITIES } from '../constants/qualities.js';

const masterProductSchema = new mongoose.Schema(
  {
    master_key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    quality: {
      type: String,
      required: true,
      enum: QUALITIES,
    },
    gsm: {
      type: Number,
      required: true,
    },
    bf: {
      type: Number,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    parameter_codes: {
      quality: { type: String, required: true },
      gsm: { type: String, required: true },
      bf: { type: String, required: true },
      size: { type: String, required: true },
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// MongoDB Compound & Unique Indexes
masterProductSchema.index({ master_key: 1 }, { unique: true });
masterProductSchema.index({ quality: 1, gsm: 1, bf: 1, size: 1 }, { unique: true });
masterProductSchema.index({ is_active: 1, master_key: 1 });

export const MasterProduct = mongoose.model('MasterProduct', masterProductSchema);
```

### B. Updated `Reel` Schema (`backend/src/models/reel.model.js`)

```javascript
// New fields added to reelSchema:
master_product_id: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'MasterProduct',
  required: true,
},
master_key: {
  type: String,
  required: true,
  trim: true,
},

// Indexes added:
reelSchema.index({ record_status: 1, master_key: 1 });
reelSchema.index({ record_status: 1, master_product_id: 1 });
reelSchema.index({ record_status: 1, master_key: 1, status: 1 });
```

---

## 2. API Contract & Routes (`/api/v1/master-products`)

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/master-products` | JWT | ALL | List master products with aggregated reel counts, total weight, available weight, filters, and pagination. |
| `GET` | `/api/v1/master-products/:id` | JWT | ALL | Get single master product by ID with full metrics breakdown. |
| `GET` | `/api/v1/master-products/:id/reels` | JWT | ALL | Get physical reels belonging to this master product (paginated). |
| `POST` | `/api/v1/master-products/preview-key` | JWT | ALL | Pure key generator utility endpoint to preview key during reel creation form filling. |
| `PATCH` | `/api/v1/master-products/:id/status` | JWT | ADMIN | Activate or deactivate a master product. |

---

## 3. Database Indexing & Performance Design

To ensure optimal execution for datasets exceeding 10,000 reels:
1. `masterproducts.master_key` is unique indexed (`unique: true`).
2. `reels.master_key` and `reels.master_product_id` are compound-indexed with `record_status` to satisfy `COLLSCAN`-free queries.
3. Pagination is performed using database-level `skip()` and `limit()` with `lean()` queries.
