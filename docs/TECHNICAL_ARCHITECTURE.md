# RAINBOW PACKAGES — TECHNICAL ARCHITECTURE GUIDE

**System**: Rainbow Packages Reel Inventory Management System  
**Audience**: Software Engineers, Backend/Frontend Developers & System Architects  
**Reference Document**: [SYSTEM_MASTER_DOCUMENTATION.md](file:///k:/GitHub/ecurve/rainbow-packaging/docs/SYSTEM_MASTER_DOCUMENTATION.md)  
**Status**: APPROVED & ACTIVE  

---

## 1. System Overview & Tech Stack

- **Backend**: Node.js ESM, Express.js (v5 compatible wildcard routing).
- **Database**: MongoDB Atlas via Mongoose ORM.
- **Frontend**: React 19, Vite, Tailwind CSS, Lucide Icons, React Router v7.
- **Authentication**: JWT HTTP Bearer tokens with session refresh queue (`/auth/refresh`).

---

## 2. Database Models & Schema Specifications

### A. `MasterCode` (`backend/src/models/masterCode.model.js`)
Stores business-facing catalog definitions.
```javascript
import mongoose from 'mongoose';
import { QUALITIES } from '../constants/qualities.js';

const masterCodeSchema = new mongoose.Schema({
  master_code: { type: String, required: true, unique: true, trim: true },
  master_code_name: { type: String, required: true, trim: true },
  quality: { type: String, required: true, enum: QUALITIES },
  gsm: { type: Number, required: true },
  bf: { type: Number, required: true },
  size: { type: Number, required: true },
  description: { type: String, default: '', trim: true },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

masterCodeSchema.index({ status: 1, master_code: 1 });
export const MasterCode = mongoose.model('MasterCode', masterCodeSchema);
```

### B. `MasterProduct` (`backend/src/models/masterProduct.model.js`)
Stores unique technical specification entities anchored to canonical `master_key`.
```javascript
const masterProductSchema = new mongoose.Schema({
  master_key: { type: String, required: true, unique: true, trim: true },
  master_code_id: { type: mongoose.Schema.Types.ObjectId, ref: 'MasterCode', default: null },
  master_code: { type: String, trim: true, default: null },
  name: { type: String, required: true, trim: true },
  quality: { type: String, required: true, enum: QUALITIES },
  gsm: { type: Number, required: true },
  bf: { type: Number, required: true },
  size: { type: Number, required: true },
  parameter_codes: {
    quality: { type: String, required: true },
    gsm: { type: String, required: true },
    bf: { type: String, required: true },
    size: { type: String, required: true },
  },
  is_active: { type: Boolean, default: true },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

masterProductSchema.index({ quality: 1, gsm: 1, bf: 1, size: 1 }, { unique: true });
masterProductSchema.index({ is_active: 1, master_key: 1 });
masterProductSchema.index({ master_code_id: 1 });
export const MasterProduct = mongoose.model('MasterProduct', masterProductSchema);
```

### C. `Reel` (`backend/src/models/reel.model.js`)
Stores individual physical inventory rolls linked to `MasterProduct` and `MasterCode`.
```javascript
const reelSchema = new mongoose.Schema({
  sr_no: { type: Number, required: true, unique: true },
  reel_no: { type: String, required: true, trim: true },
  master_product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'MasterProduct', default: null },
  master_key: { type: String, trim: true, default: null },
  master_code_id: { type: mongoose.Schema.Types.ObjectId, ref: 'MasterCode', default: null },
  master_code: { type: String, trim: true, default: null },
  quality: { type: String, required: true },
  gsm: { type: Number, required: true },
  bf: { type: Number, required: true },
  size: { type: Number, required: true },
  max_weight: { type: Number, required: true },
  previous_weight: { type: Number, required: true },
  status: { type: String, required: true },
  record_status: { type: String, required: true, default: 'ACTIVE' },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

reelSchema.index({ record_status: 1, master_key: 1 });
reelSchema.index({ record_status: 1, master_product_id: 1 });
reelSchema.index({ record_status: 1, master_code_id: 1 });
export const Reel = mongoose.model('Reel', reelSchema);
```

---

## 3. Master Key Normalization & Key Generator Logic

Located in `backend/src/utils/masterKeyGenerator.js`:

```javascript
export function generateMasterKey({ quality, gsm, bf, size }) {
  const normQuality = normalizeQuality(quality);
  const normGsm = normalizeGsm(gsm);
  const normBf = normalizeBf(bf);
  const normSize = normalizeSize(size);

  const master_key = `${normQuality.code}-${normGsm.code}-${normBf.code}-${normSize.code}`;
  return {
    master_key,
    name: `${normQuality.value} ${normGsm.value}GSM ${normBf.value}BF ${normSize.value}`,
    quality: normQuality.value,
    gsm: normGsm.value,
    bf: normBf.value,
    size: normSize.value,
    parameter_codes: {
      quality: normQuality.code,
      gsm: normGsm.code,
      bf: normBf.code,
      size: normSize.code,
    },
  };
}
```

---

## 4. Service Methods & Transaction Behavior

### `resolveMasterProduct({ quality, gsm, bf, size, master_code, master_code_id, actor, session })`
1. Resolves `MasterCode` document if `master_code_id` or `master_code` string is provided.
2. Computes canonical `master_key`.
3. Performs atomic query for existing `MasterProduct`.
4. If missing, creates a new `MasterProduct` document with `master_code_id` and `master_code` populated.
5. If found, updates missing `master_code_id` reference safely.

---

## 5. API Contracts

- `GET /api/v1/master-codes` $\rightarrow$ Query params: `status`, `q`. Returns array of master codes.
- `POST /api/v1/master-codes` $\rightarrow$ Body: `{ master_code, master_code_name, quality, gsm, bf, size, description, status }`. Protected: `SUPERVISOR`, `ADMIN`.
- `POST /api/v1/reels` $\rightarrow$ Body includes `reel_no`, `master_code`, `master_code_id`, `quality`, `gsm`, `bf`, `size`, `supplier_name`, `max_weight`, `purchase_date`.

---

## 6. Testing Strategy

- `npm test` runs Node test runner over `tests/**/*.test.js`.
- `tests/masterCode.test.js` tests:
  - Spec resolution to canonical key.
  - Multi-reel specification reuse (Case 1).
  - Specification distinction separation (Case 2).
  - Dynamic spec parameter change re-evaluation (Cases 3 & 4).
  - Padded GSM handling (Case 5).
