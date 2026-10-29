/**
 * Reels Inventory Module (Frontend)
 * 
 * Domain: Paper and Board Rolls (Reels)
 * Pages, Components, and API Services
 */

// Pages
export { default as ReelListPage } from './pages/ReelListPage';
export { default as CreateReelPage } from './pages/CreateReelPage';
export { default as CreateReelModal } from './pages/CreateReelModal';
export { default as ReelDetailPage } from './pages/ReelDetailPage';
export { default as RecordUsageModal } from './pages/RecordUsageModal';
export { default as UsageLogsPage } from './pages/UsageLogsPage';
export { default as VoidReelModal } from './pages/VoidReelModal';
export { default as BulkVoidReelModal } from './pages/BulkVoidReelModal';
export { default as EditReelEventModal } from './pages/EditReelEventModal';
export { default as MasterCorrectionModal } from './pages/MasterCorrectionModal';
export { default as RequestCorrectionModal } from './pages/RequestCorrectionModal';
export { default as MasterCodeListPage } from './pages/MasterCodeListPage';
export { default as MasterCodeDetailPage } from './pages/MasterCodeDetailPage';
export { default as MasterCodeDetailsModal } from './pages/MasterCodeDetailsModal';
export { default as MasterProductListPage } from './pages/MasterProductListPage';
export { default as MasterProductDetailPage } from './pages/MasterProductDetailPage';

// API Services
export { reelApi } from './api/reelApi';
export { masterCodeApi } from './api/masterCodeApi';
export { masterProductApi } from './api/masterProductApi';

