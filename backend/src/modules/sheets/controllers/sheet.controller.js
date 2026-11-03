import * as sheetService from '../services/sheet.service.js';
import * as sheetImportService from '../services/sheetImport.service.js';

export async function handleListSheets(req, res) {
  const result = await sheetService.listSheets({
    filters: req.query,
    actor: req.user,
  });

  return res.status(200).json({
    success: true,
    data: result.items,
    meta: result.meta,
  });
}

export async function handleGetSheetSummary(req, res) {
  const summary = await sheetService.getSheetSummary({ actor: req.user });
  return res.status(200).json({
    success: true,
    data: summary,
  });
}

export async function handleGetFilterOptions(req, res) {
  const options = await sheetService.getSheetFilterOptions();
  return res.status(200).json({
    success: true,
    data: options,
  });
}

export async function handleGetSheet(req, res) {
  const sheet = await sheetService.getSheet({
    id: req.params.id,
    actor: req.user,
  });

  return res.status(200).json({
    success: true,
    data: sheet,
  });
}

export async function handleGetSheetJourney(req, res) {
  const result = await sheetService.getSheetJourney({
    id: req.params.id,
    query: req.query,
    actor: req.user,
  });

  return res.status(200).json({
    success: true,
    data: result,
  });
}

export async function handleListSheetHistory(req, res) {
  const result = await sheetService.listSheetHistory({
    filters: req.query,
    actor: req.user,
  });

  return res.status(200).json({
    success: true,
    data: result.items,
    meta: result.meta,
  });
}

export async function handleCreateSheet(req, res) {
  const result = await sheetService.createSheet({
    input: req.body,
    actor: req.user,
  });

  return res.status(201).json({
    success: true,
    data: result.sheet,
    event: result.event,
    message: 'Sheet stock lot created successfully.',
  });
}

export async function handleUpdateSheet(req, res) {
  const result = await sheetService.updateSheet({
    id: req.params.id,
    input: req.body,
    actor: req.user,
  });

  return res.status(200).json({
    success: true,
    data: result.sheet,
    event: result.event,
    message: 'Sheet lot updated successfully.',
  });
}

export async function handleRecordSheetUsage(req, res) {
  const result = await sheetService.recordSheetUsage({
    id: req.params.id,
    input: req.body,
    actor: req.user,
  });

  return res.status(200).json({
    success: true,
    data: result.sheet,
    event: result.event,
    message: 'Sheet consumption recorded successfully.',
  });
}

export async function handleAdjustSheetStock(req, res) {
  const result = await sheetService.adjustSheetStock({
    id: req.params.id,
    input: req.body,
    actor: req.user,
  });

  return res.status(200).json({
    success: true,
    data: result.sheet,
    event: result.event,
    message: 'Sheet stock adjusted successfully.',
  });
}

export async function handleReturnSheetStock(req, res) {
  const result = await sheetService.returnSheetStock({
    id: req.params.id,
    input: req.body,
    actor: req.user,
  });

  return res.status(200).json({
    success: true,
    data: result.sheet,
    event: result.event,
    message: 'Sheet return recorded successfully.',
  });
}

export async function handleVoidSheet(req, res) {
  const result = await sheetService.voidSheet({
    id: req.params.id,
    input: req.body,
    actor: req.user,
  });

  return res.status(200).json({
    success: true,
    data: result.sheet,
    event: result.event,
    message: 'Sheet lot voided successfully.',
  });
}

export async function handleImportExcel(req, res) {
  const { records, force, effectiveDate, importSource } = req.body;
  const result = await sheetImportService.importSheetRecords({
    records,
    effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
    importSource: importSource || 'board-stock-sheet.xlsx',
    force: Boolean(force),
    actor: req.user,
  });

  const statusCode = result.success ? 200 : 409;
  return res.status(statusCode).json(result);
}

export async function handleListPendingApprovals(req, res) {
  const result = await sheetService.listPendingSheetApprovals({
    filters: req.query,
    actor: req.user,
  });

  return res.status(200).json({
    success: true,
    data: result.items,
    meta: result.meta,
  });
}

export async function handleConfirmApproval(req, res) {
  const result = await sheetService.confirmSheetEntry({
    eventId: req.params.id,
    actor: req.user,
  });

  return res.status(200).json({
    success: true,
    data: result,
    message: 'Entry confirmed successfully.',
  });
}

export async function handleDeclineApproval(req, res) {
  const result = await sheetService.declineSheetEntry({
    eventId: req.params.id,
    input: req.body,
    actor: req.user,
  });

  return res.status(200).json({
    success: true,
    data: result,
    message: 'Entry declined and reverted successfully.',
  });
}
