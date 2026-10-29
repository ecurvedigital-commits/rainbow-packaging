import * as sheetService from '../services/sheet.service.js';

export async function handleListSheets(req, res) {
  const result = await sheetService.listSheets();
  return res.status(200).json({
    success: true,
    data: result.items,
    meta: result.meta,
  });
}
