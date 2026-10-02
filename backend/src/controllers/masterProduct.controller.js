import {
  listMasterProducts,
  getMasterProduct,
  getMasterProductReels,
  previewMasterKey,
  updateMasterProductStatus,
} from '../services/masterProduct.service.js';

export async function handleListMasterProducts(req, res) {
  const result = await listMasterProducts({
    filters: req.query,
    actor: req.user,
  });
  res.status(200).json({
    success: true,
    data: result.items,
    meta: result.meta,
  });
}

export async function handleGetMasterProduct(req, res) {
  const data = await getMasterProduct({
    id: req.params.id,
    actor: req.user,
  });
  res.status(200).json({
    success: true,
    data,
  });
}

export async function handleGetMasterProductReels(req, res) {
  const result = await getMasterProductReels({
    id: req.params.id,
    query: req.query,
    actor: req.user,
  });
  res.status(200).json({
    success: true,
    data: result,
  });
}

export async function handlePreviewMasterKey(req, res) {
  const data = previewMasterKey(req.body);
  res.status(200).json({
    success: true,
    data,
  });
}

export async function handleUpdateMasterProductStatus(req, res) {
  const data = await updateMasterProductStatus({
    id: req.params.id,
    is_active: req.body.is_active,
    actor: req.user,
  });
  res.status(200).json({
    success: true,
    data,
  });
}
