import * as poService from '../services/purchaseOrder.service.js';

export async function createPurchaseOrder(req, res) {
  const result = await poService.createPurchaseOrder({
    input: req.validated.body,
    actor: req.user,
  });
  return res.status(201).json({
    success: true,
    data: result,
  });
}

export async function listPurchaseOrders(req, res) {
  const result = await poService.listPurchaseOrders({
    query: req.validated?.query || req.query,
    actor: req.user,
  });
  return res.status(200).json({
    success: true,
    data: result.items,
    meta: result.meta,
    summary: result.summary,
  });
}

export async function getPurchaseOrderById(req, res) {
  const { id } = req.params;
  const result = await poService.getPurchaseOrderById(id);
  return res.status(200).json({
    success: true,
    data: result,
  });
}

export async function updatePurchaseOrder(req, res) {
  const { id } = req.params;
  const result = await poService.updatePurchaseOrder({
    id,
    input: req.validated.body,
    actor: req.user,
  });
  return res.status(200).json({
    success: true,
    data: result,
  });
}

export async function submitPurchaseOrderForApproval(req, res) {
  const { id } = req.params;
  const result = await poService.submitPurchaseOrderForApproval({
    id,
    actor: req.user,
  });
  return res.status(200).json({
    success: true,
    data: result,
  });
}

export async function approvePurchaseOrder(req, res) {
  const { id } = req.params;
  const result = await poService.approvePurchaseOrder({
    id,
    actor: req.user,
  });
  return res.status(200).json({
    success: true,
    data: result,
  });
}

export async function rejectPurchaseOrder(req, res) {
  const { id } = req.params;
  const { rejection_reason } = req.validated.body;
  const result = await poService.rejectPurchaseOrder({
    id,
    rejection_reason,
    actor: req.user,
  });
  return res.status(200).json({
    success: true,
    data: result,
  });
}

export async function cancelPurchaseOrder(req, res) {
  const { id } = req.params;
  const { cancellation_reason } = req.validated?.body || req.body || {};
  const result = await poService.cancelPurchaseOrder({
    id,
    cancellation_reason,
    actor: req.user,
  });
  return res.status(200).json({
    success: true,
    data: result,
  });
}

export async function getPurchaseOrderFilterOptions(_req, res) {
  const result = await poService.getPurchaseOrderFilterOptions();
  return res.status(200).json({
    success: true,
    data: result,
  });
}
