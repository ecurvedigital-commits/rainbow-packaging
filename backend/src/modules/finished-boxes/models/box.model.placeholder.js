/**
 * Placeholder Schema Reference for Finished Boxes Inventory
 * 
 * Domain: Finished Corrugated Cartons & Boxes
 * Planned attributes:
 * - sku / box_code (String, unique identifier)
 * - client_name (String, client who ordered)
 * - box_type (Universal, Die-cut, RSC)
 * - ply (3-Ply, 5-Ply, 7-Ply)
 * - length_inch (Number)
 * - width_inch (Number)
 * - height_inch (Number)
 * - quantity_in_stock (Number of boxes)
 * - pallet_count (Number of pallets)
 * - rate_per_box (Number, valuation)
 * - status (IN_STOCK, RESERVED, DISPATCHED)
 */

export const BOX_SCHEMA_SPEC = Object.freeze({
  category: 'FINISHED_BOX',
  unit: 'pieces',
  status: 'UNDER_DEVELOPMENT',
});
