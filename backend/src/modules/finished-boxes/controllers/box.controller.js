import * as boxService from '../services/box.service.js';

export async function handleListBoxes(req, res) {
  const result = await boxService.listBox();
  return res.status(200).json({
    success: true,
    data: result.items,
    meta: result.meta,
  });
}
