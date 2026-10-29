/**
 * Reels Inventory Module
 * 
 * Domain: Paper and Board Rolls (Reels)
 * Primary Units: Weight (kg), Barcode / Serial (reel_no)
 * Specifications: Quality, GSM, BF, Size
 */

// Routes
export { reelRoutes } from './routes/reel.routes.js';
export { default as masterCodeRoutes } from './routes/masterCode.routes.js';
export { default as masterProductRoutes } from './routes/masterProduct.routes.js';

// Models
export { Reel } from './models/reel.model.js';
export { ReelEvent } from './models/reelEvent.model.js';
export { MasterCode } from './models/masterCode.model.js';
export { MasterProduct } from './models/masterProduct.model.js';

// Services
export * as reelService from './services/reel.service.js';
export * as usageService from './services/usage.service.js';
export * as masterCodeService from './services/masterCode.service.js';
export * as masterProductService from './services/masterProduct.service.js';

// Controllers
export * as reelController from './controllers/reel.controller.js';
export * as masterCodeController from './controllers/masterCode.controller.js';
export * as masterProductController from './controllers/masterProduct.controller.js';

// Validators
export * from './validators/reel.validator.js';
export * from './validators/masterProduct.validator.js';

// Constants
export { REEL_STATUS, RECORD_STATUS } from './constants/reelStatus.js';
export { QUALITIES } from './constants/qualities.js';
export { STATIONS } from './constants/stations.js';

// Utilities
export { deriveReelStatus } from './utils/reelStatus.js';
export { generateMasterKey, normalizeQuality, normalizeGsm, normalizeBf, normalizeSize } from './utils/masterKeyGenerator.js';
export { buildReelFilter } from './utils/buildReelFilter.js';
