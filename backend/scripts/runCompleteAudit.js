import { connectDb, disconnectDb } from '../src/config/db.js';
import { User } from '../src/models/user.model.js';
import { Reel } from '../src/models/reel.model.js';
import { ReelEvent } from '../src/models/reelEvent.model.js';
import { Notification } from '../src/models/notification.model.js';
import { Setting } from '../src/models/setting.model.js';
import { FieldDefinition } from '../src/models/fieldDefinition.model.js';
import { DigestLog } from '../src/models/digestLog.model.js';
import { ROLES } from '../src/constants/roles.js';
import { hashPassword } from '../src/utils/password.js';

import { getRegisteredRoutes } from './extractRoutes.js';

const BASE_URL = 'http://localhost:5000/api/v1';

// Helper for making HTTP requests
async function req(path, { method = 'GET', body = null, token = null, headers = {} } = {}) {
  const reqHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  };
  if (token) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
  }

  const start = performance.now();
  const options = {
    method,
    headers: reqHeaders,
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(`${BASE_URL}${path}`, options);
    const timeMs = Math.round((performance.now() - start) * 100) / 100;
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return {
      status: res.status,
      ok: res.ok,
      data,
      timeMs,
      headers: Object.fromEntries(res.headers.entries()),
    };
  } catch (err) {
    const timeMs = Math.round((performance.now() - start) * 100) / 100;
    return {
      status: 0,
      ok: false,
      error: err.message,
      timeMs,
    };
  }
}

async function run() {
  console.log('====================================================');
  console.log('STARTING COMPLETE BACKEND E2E API AUDIT & TEST SUITE');
  console.log('====================================================\n');

  await connectDb();

  const report = {
    started_at: new Date().toISOString(),
    endpoints: [],
    auth_matrix: [],
    pagination_audit: [],
    workflows: {},
    security_results: [],
    concurrency_results: [],
    db_integrity: {},
    issues: [],
  };

  // ----------------------------------------------------
  // PHASE 3: HEALTH CHECK
  // ----------------------------------------------------
  console.log('--- Phase 3: Health Check ---');
  const healthRes = await req('/health');
  console.log('Health check:', healthRes.status, healthRes.data, `(${healthRes.timeMs}ms)`);
  if (!healthRes.ok || healthRes.data?.data?.db !== 'connected') {
    console.error('FATAL: Backend health check failed');
    process.exit(1);
  }

  // ----------------------------------------------------
  // PHASE 4: AUTH & TEST USERS PREPARATION
  // ----------------------------------------------------
  console.log('\n--- Phase 4 & 5: Authentication & Users Setup ---');

  // 1. Login as Admin
  const adminLoginRes = await req('/auth/login', {
    method: 'POST',
    body: { username: 'admin', password: 'Admin@12345' },
  });
  if (!adminLoginRes.ok || !adminLoginRes.data?.data?.access_token) {
    console.error('FATAL: Admin login failed', adminLoginRes.data);
    process.exit(1);
  }
  const adminToken = adminLoginRes.data.data.access_token;
  const adminUser = adminLoginRes.data.data.user;
  console.log('Admin login successful. User:', adminUser.username);

  // 2. Setup or verify Supervisor test account
  let supervisorUser = await User.findOne({ username: 'audit.supervisor' });
  if (!supervisorUser) {
    const createSupRes = await req('/users', {
      method: 'POST',
      token: adminToken,
      body: {
        name: 'Audit Supervisor',
        username: 'audit.supervisor',
        role: ROLES.SUPERVISOR,
        email: 'audit.supervisor@example.com',
        password: 'Supervisor@123',
      },
    });
    if (createSupRes.ok) {
      supervisorUser = createSupRes.data.data;
      console.log('Created audit.supervisor via API');
    } else {
      console.error('Failed to create supervisor user via API:', createSupRes.data);
    }
  }

  // Ensure supervisor password is set to Supervisor@123 and must_change_password is false for API test flows
  const supHash = await hashPassword('Supervisor@123');
  await User.updateOne({ username: 'audit.supervisor' }, { password_hash: supHash, must_change_password: false, is_active: true });

  const supLoginRes = await req('/auth/login', {
    method: 'POST',
    body: { username: 'audit.supervisor', password: 'Supervisor@123' },
  });
  const supervisorToken = supLoginRes.data?.data?.access_token;
  console.log('Supervisor login:', supLoginRes.status, 'Token acquired:', Boolean(supervisorToken));

  // 3. Setup or verify Operator test account
  let operatorUser = await User.findOne({ username: 'audit.operator' });
  if (!operatorUser) {
    const createOpRes = await req('/users', {
      method: 'POST',
      token: adminToken,
      body: {
        name: 'Audit Operator',
        username: 'audit.operator',
        role: ROLES.OPERATOR,
        email: 'audit.operator@example.com',
        password: 'Operator@123',
      },
    });
    if (createOpRes.ok) {
      operatorUser = createOpRes.data.data;
      console.log('Created audit.operator via API');
    } else {
      console.error('Failed to create operator user via API:', createOpRes.data);
    }
  }

  // Ensure operator password is set to Operator@123 and must_change_password is false
  const opHash = await hashPassword('Operator@123');
  await User.updateOne({ username: 'audit.operator' }, { password_hash: opHash, must_change_password: false, is_active: true });

  const opLoginRes = await req('/auth/login', {
    method: 'POST',
    body: { username: 'audit.operator', password: 'Operator@123' },
  });
  const operatorToken = opLoginRes.data?.data?.access_token;
  console.log('Operator login:', opLoginRes.status, 'Token acquired:', Boolean(operatorToken));

  // ----------------------------------------------------
  // AUTH TESTS (Wrong password, me, refresh, logout, change-password)
  // ----------------------------------------------------
  console.log('\n--- Testing Authentication Edge Cases ---');
  const badLogin = await req('/auth/login', {
    method: 'POST',
    body: { username: 'admin', password: 'WrongPassword999' },
  });
  const missingLogin = await req('/auth/login', {
    method: 'POST',
    body: { username: 'admin' },
  });
  const nonExistLogin = await req('/auth/login', {
    method: 'POST',
    body: { username: 'non_existent_user_9999', password: 'SomePassword@123' },
  });
  const meAdmin = await req('/auth/me', { token: adminToken });
  const meSupervisor = await req('/auth/me', { token: supervisorToken });
  const meOperator = await req('/auth/me', { token: operatorToken });

  report.auth_results = {
    admin_login_ok: adminLoginRes.ok,
    supervisor_login_ok: supLoginRes.ok,
    operator_login_ok: opLoginRes.ok,
    bad_password_status: badLogin.status, // expected 401
    missing_fields_status: missingLogin.status, // expected 422
    nonexistent_user_status: nonExistLogin.status, // expected 401
    me_admin_role: meAdmin.data?.data?.role,
    me_supervisor_role: meSupervisor.data?.data?.role,
    me_operator_role: meOperator.data?.data?.role,
  };
  console.log('Auth results:', report.auth_results);

  // ----------------------------------------------------
  // REGISTERED ENDPOINTS LIST (35 Endpoints)
  // ----------------------------------------------------
  const dynamicRoutes = getRegisteredRoutes();
  const registeredEndpoints = dynamicRoutes.map((r) => {
    const relativePath = r.path.replace('/api/v1', '');
    let allowedRoles = [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.OPERATOR];
    let auth = true;

    if (r.path === '/api/v1/health' || r.path === '/api/v1/auth/login' || r.path === '/api/v1/auth/refresh') {
      auth = false;
      allowedRoles = ['PUBLIC'];
    } else if (relativePath.startsWith('/users') || relativePath.startsWith('/audit') || relativePath.startsWith('/digest') || relativePath.startsWith('/settings')) {
      allowedRoles = [ROLES.ADMIN];
    } else if (relativePath === '/reels' && r.method === 'POST') {
      allowedRoles = [ROLES.ADMIN, ROLES.OPERATOR];
    } else if (relativePath.endsWith('/usage') && r.method === 'POST') {
      allowedRoles = [ROLES.ADMIN, ROLES.OPERATOR];
    } else if (relativePath.startsWith('/reels/') && (r.method === 'PATCH' || relativePath.endsWith('/void'))) {
      allowedRoles = [ROLES.ADMIN];
    } else if (relativePath.startsWith('/approvals/pending') || relativePath.startsWith('/approvals/') && (relativePath.endsWith('/confirm') || relativePath.endsWith('/decline'))) {
      allowedRoles = [ROLES.ADMIN, ROLES.SUPERVISOR];
    } else if (relativePath.startsWith('/approvals/mine')) {
      allowedRoles = [ROLES.ADMIN, ROLES.OPERATOR];
    } else if (relativePath.startsWith('/field-definitions') && (r.method === 'POST' || r.method === 'PATCH')) {
      allowedRoles = [ROLES.ADMIN];
    }

    return {
      method: r.method,
      path: relativePath,
      fullPath: r.path,
      auth,
      allowedRoles,
      pagination: relativePath === '/reels' || relativePath === '/users' || relativePath === '/approvals/pending' || relativePath === '/approvals/mine' || relativePath === '/notifications' || relativePath === '/audit/events' || relativePath === '/digest/logs' || relativePath === '/dashboard/aging' || relativePath === '/reels/search' || relativePath.endsWith('/journey'),
    };
  });
  console.log(`Dynamically discovered ${registeredEndpoints.length} registered Express endpoints`);

  // ----------------------------------------------------
  // PHASE 8 & 9: REEL CREATION & RETRIEVAL WORKFLOW
  // ----------------------------------------------------
  console.log('\n--- Phase 8: Reel Creation by Operator ---');
  const uniqueReelNo = `TEST-R-${Date.now().toString().slice(-6)}`;
  const createReelPayload = {
    reel_no: uniqueReelNo,
    quality: 'SPECTRA',
    bf: 18,
    gsm: 120,
    size: 45.5,
    supplier_name: 'ITC Limited',
    purchase_date: '2026-09-01',
    max_weight: 1000,
  };

  const createReelRes = await req('/reels', {
    method: 'POST',
    token: operatorToken,
    body: createReelPayload,
  });
  console.log('Create reel by Operator:', createReelRes.status, createReelRes.data?.data?.reel?.reel_no);
  const testReelId = createReelRes.data?.data?.reel?.id;
  const creationEventId = createReelRes.data?.data?.event?.id;

  // Test duplicate reel_no rejection (409 DUPLICATE_REEL_NO)
  const dupReelRes = await req('/reels', {
    method: 'POST',
    token: operatorToken,
    body: createReelPayload,
  });
  console.log('Duplicate reel creation check:', dupReelRes.status, dupReelRes.data?.error?.code);

  // Test reel retrieval
  const getReelRes = await req(`/reels/${testReelId}`, { token: operatorToken });
  const searchReelRes = await req(`/reels/search?q=${uniqueReelNo}`, { token: operatorToken });
  const journeyReelRes = await req(`/reels/${testReelId}/journey`, { token: operatorToken });

  // ----------------------------------------------------
  // PHASE 15 & 16: REEL USAGE WORKFLOW & STATUS DERIVATION
  // ----------------------------------------------------
  console.log('\n--- Phase 15 & 16: Usage Logging & Status Derivation ---');
  // 1. Operator logs usage: 1000 -> 700 (used: 300)
  const usageRes1 = await req(`/reels/${testReelId}/usage`, {
    method: 'POST',
    token: operatorToken,
    body: {
      station: 'Station 1',
      current_weight_entered: 700,
      expected_previous_weight: 1000,
    },
  });
  console.log('Usage 1 (1000->700):', usageRes1.status, 'Status:', usageRes1.data?.data?.reel?.status, 'Pending count:', usageRes1.data?.data?.reel?.pending_count);
  const usage1EventId = usageRes1.data?.data?.event?.id;

  // Stale weight check (409 STALE_WEIGHT)
  const staleUsageRes = await req(`/reels/${testReelId}/usage`, {
    method: 'POST',
    token: operatorToken,
    body: {
      station: 'Station 1',
      current_weight_entered: 500,
      expected_previous_weight: 1000, // actual balance is now 700!
    },
  });
  console.log('Stale weight concurrency check:', staleUsageRes.status, staleUsageRes.data?.error?.code);

  // 2. Operator logs second usage: 700 -> 400 (used: 300)
  const usageRes2 = await req(`/reels/${testReelId}/usage`, {
    method: 'POST',
    token: operatorToken,
    body: {
      station: 'Station 2',
      current_weight_entered: 400,
    },
  });
  console.log('Usage 2 (700->400):', usageRes2.status, 'Status:', usageRes2.data?.data?.reel?.status);
  const usage2EventId = usageRes2.data?.data?.event?.id;

  // ----------------------------------------------------
  // PHASE 17 & 18: SUPERVISOR APPROVAL, FIFO, DECLINE & CASCADE
  // ----------------------------------------------------
  console.log('\n--- Phase 17 & 18: Approvals, Self-Approval Block, FIFO & Reversion ---');
  const pendingApprovalsRes = await req('/approvals/pending', { token: supervisorToken });
  console.log('Pending approvals count:', pendingApprovalsRes.data?.data?.length);

  // Self-approval test: Operator attempts to confirm their own entry (expected 403)
  const selfApprovalRes = await req(`/approvals/${creationEventId}/confirm`, {
    method: 'POST',
    token: operatorToken,
  });
  console.log('Operator self-approval check:', selfApprovalRes.status, selfApprovalRes.data?.error?.code);

  // FIFO check: Confirming usage1 while creationEvent is older and pending (expected 409 OUT_OF_ORDER_APPROVAL)
  const outOfOrderRes = await req(`/approvals/${usage1EventId}/confirm`, {
    method: 'POST',
    token: supervisorToken,
  });
  console.log('Out of order FIFO approval check:', outOfOrderRes.status, outOfOrderRes.data?.error?.code);

  // Supervisor confirms creation event first
  const confirmCreationRes = await req(`/approvals/${creationEventId}/confirm`, {
    method: 'POST',
    token: supervisorToken,
  });
  console.log('Supervisor confirm creation event:', confirmCreationRes.status, confirmCreationRes.data?.data?.event?.approval_status);

  // Supervisor confirms usage1 event
  const confirmUsage1Res = await req(`/approvals/${usage1EventId}/confirm`, {
    method: 'POST',
    token: supervisorToken,
  });
  console.log('Supervisor confirm usage1:', confirmUsage1Res.status, confirmUsage1Res.data?.data?.event?.approval_status);

  // Test Decline on usage2 with reversion (reverts from 400 to 700)
  const declineUsage2Res = await req(`/approvals/${usage2EventId}/decline`, {
    method: 'POST',
    token: supervisorToken,
    body: { reason: 'Audit Test: Incorrect scale tare' },
  });
  console.log('Supervisor decline usage2:', declineUsage2Res.status, 'Reverted to:', declineUsage2Res.data?.data?.reverted?.to);

  // Check DB state after decline: reel should be back at 700!
  const reelAfterDecline = await Reel.findById(testReelId);
  console.log('Reel weight after decline (expected 700):', reelAfterDecline?.previous_weight);

  // ----------------------------------------------------
  // PHASE 19 & 20: ADMIN CORRECTION & VOID
  // ----------------------------------------------------
  console.log('\n--- Phase 19 & 20: Admin Correction & Master Updates ---');
  const adminCorrectionRes = await req(`/reels/${testReelId}`, {
    method: 'PATCH',
    token: adminToken,
    body: {
      gsm: 150,
      size: 48,
    },
  });
  console.log('Admin correction on reel:', adminCorrectionRes.status, adminCorrectionRes.data?.data?.gsm);

  // Supervisor attempting admin correction (expected 403)
  const supCorrectionRes = await req(`/reels/${testReelId}`, {
    method: 'PATCH',
    token: supervisorToken,
    body: { gsm: 200 },
  });
  console.log('Supervisor blocked from admin correction:', supCorrectionRes.status);

  // ----------------------------------------------------
  // PHASE 21: NOTIFICATIONS
  // ----------------------------------------------------
  console.log('\n--- Phase 21: Notifications ---');
  const notifsRes = await req('/notifications', { token: operatorToken });
  const unreadCountRes = await req('/notifications/unread-count', { token: operatorToken });
  console.log('Operator notifications count:', notifsRes.data?.data?.length, 'Unread count:', unreadCountRes.data?.data?.unread_count);

  let markReadRes = { status: 200 };
  if (notifsRes.data?.data?.length > 0) {
    const firstNotifId = notifsRes.data.data[0].id;
    markReadRes = await req(`/notifications/${firstNotifId}/read`, {
      method: 'PATCH',
      token: operatorToken,
    });
    console.log('Mark single notification read:', markReadRes.status);
  }
  const readAllRes = await req('/notifications/read-all', {
    method: 'PATCH',
    token: operatorToken,
  });
  console.log('Mark all notifications read:', readAllRes.status);

  // ----------------------------------------------------
  // PHASE 23: DASHBOARD APIS
  // ----------------------------------------------------
  console.log('\n--- Phase 23: Dashboard APIs ---');
  const dashSummary = await req('/dashboard/summary', { token: adminToken });
  const dashStatusBoard = await req('/dashboard/status-board', { token: adminToken });
  const dashBreakdownQuality = await req('/dashboard/breakdown?by=quality', { token: adminToken });
  const dashAging = await req('/dashboard/aging?page=1&limit=10', { token: adminToken });
  console.log('Dashboard summary:', dashSummary.status, dashSummary.data?.data);
  console.log('Dashboard status board:', dashStatusBoard.status, dashStatusBoard.data?.data);
  console.log('Dashboard breakdown (quality):', dashBreakdownQuality.status, 'Items:', dashBreakdownQuality.data?.data?.length);
  console.log('Dashboard aging:', dashAging.status, 'Total aging:', dashAging.data?.meta?.total);

  // ----------------------------------------------------
  // PHASE 24: CUSTOM FIELDS / FIELD DEFINITIONS
  // ----------------------------------------------------
  console.log('\n--- Phase 24: Field Definitions ---');
  const listFieldDefs = await req('/field-definitions', { token: adminToken });
  const uniqueFieldName = `param_${Date.now().toString().slice(-4)}`;
  const createFieldDefRes = await req('/field-definitions', {
    method: 'POST',
    token: adminToken,
    body: {
      key: uniqueFieldName,
      label: 'Audit Test Field',
      type: 'text',
      required: false,
    },
  });
  console.log('Create field definition:', createFieldDefRes.status, createFieldDefRes.data?.data?.key);
  const createdFieldId = createFieldDefRes.data?.data?.id;

  let updateFieldDefRes = { status: 200 };
  if (createdFieldId) {
    updateFieldDefRes = await req(`/field-definitions/${createdFieldId}`, {
      method: 'PATCH',
      token: adminToken,
      body: { label: 'Updated Audit Test Field' },
    });
    console.log('Update field definition:', updateFieldDefRes.status);
  }

  // Operator blocked from field definitions creation (expected 403)
  const opFieldCreateBlocked = await req('/field-definitions', {
    method: 'POST',
    token: operatorToken,
    body: { name: 'unauthorized_param', label: 'Blocked', field_type: 'TEXT' },
  });
  console.log('Operator blocked from field def create:', opFieldCreateBlocked.status);

  // ----------------------------------------------------
  // PHASE 25: SETTINGS
  // ----------------------------------------------------
  console.log('\n--- Phase 25: Settings ---');
  const getSettingsRes = await req('/settings', { token: adminToken });
  console.log('Get settings:', getSettingsRes.status, getSettingsRes.data?.data);

  const updateSettingsRes = await req('/settings', {
    method: 'PATCH',
    token: adminToken,
    body: {
      aging_threshold_days: 35,
      digest: {
        enabled: true,
        time: '20:30',
        timezone: 'Asia/Kolkata',
      },
    },
  });
  console.log('Update settings:', updateSettingsRes.status, updateSettingsRes.data?.data);

  const opSettingsBlocked = await req('/settings', { token: operatorToken });
  console.log('Operator blocked from settings:', opSettingsBlocked.status);

  // ----------------------------------------------------
  // PHASE 26: AUDIT / EVENTS
  // ----------------------------------------------------
  console.log('\n--- Phase 26: Audit Events ---');
  const auditEventsRes = await req('/audit/events?page=1&limit=25', { token: adminToken });
  console.log('Audit events:', auditEventsRes.status, 'Total events recorded:', auditEventsRes.data?.meta?.total);

  const opAuditBlocked = await req('/audit/events', { token: operatorToken });
  console.log('Operator blocked from audit events:', opAuditBlocked.status);

  // ----------------------------------------------------
  // DIGEST ENDPOINTS
  // ----------------------------------------------------
  console.log('\n--- Digest Endpoints ---');
  const digestPreviewRes = await req('/digest/preview', { token: adminToken });
  console.log('Digest preview:', digestPreviewRes.status, digestPreviewRes.data?.data?.date);
  const digestSendRes = await req('/digest/send', {
    method: 'POST',
    token: adminToken,
    body: { force: true },
  });
  console.log('Digest send:', digestSendRes.status, digestSendRes.data?.data?.status);
  const digestLogsRes = await req('/digest/logs?page=1&limit=10', { token: adminToken });
  console.log('Digest logs:', digestLogsRes.status, 'Total logs:', digestLogsRes.data?.meta?.total);

  // ----------------------------------------------------
  // PHASE 10, 11, 13, 14: THOROUGH PAGINATION MATRIX & PERFORMANCE
  // ----------------------------------------------------
  console.log('\n--- Phase 10: Deep Pagination Testing on All Collection Endpoints ---');
  const paginatedEndpoints = [
    { name: 'Reels List', path: '/reels', token: adminToken },
    { name: 'Reels Search', path: `/reels/search?q=TEST`, token: adminToken },
    { name: 'Reel Journey', path: `/reels/${testReelId}/journey`, token: adminToken },
    { name: 'Users List', path: '/users', token: adminToken },
    { name: 'Approvals Pending', path: '/approvals/pending', token: supervisorToken },
    { name: 'Approvals Mine', path: '/approvals/mine', token: operatorToken },
    { name: 'Notifications', path: '/notifications', token: operatorToken },
    { name: 'Audit Events', path: '/audit/events', token: adminToken },
    { name: 'Digest Logs', path: '/digest/logs', token: adminToken },
    { name: 'Dashboard Aging', path: '/dashboard/aging', token: adminToken },
  ];

  const paginationResults = [];
  for (const ep of paginatedEndpoints) {
    const defaultRes = await req(ep.path, { token: ep.token });
    const page1Res = await req(`${ep.path}${ep.path.includes('?') ? '&' : '?'}page=1&limit=25`, { token: ep.token });
    const page2Res = await req(`${ep.path}${ep.path.includes('?') ? '&' : '?'}page=2&limit=25`, { token: ep.token });
    const maxLimitRes = await req(`${ep.path}${ep.path.includes('?') ? '&' : '?'}page=1&limit=100`, { token: ep.token });
    const overLimitRes = await req(`${ep.path}${ep.path.includes('?') ? '&' : '?'}page=1&limit=101`, { token: ep.token });
    const invalidPageRes = await req(`${ep.path}${ep.path.includes('?') ? '&' : '?'}page=0&limit=25`, { token: ep.token });
    const invalidLimitRes = await req(`${ep.path}${ep.path.includes('?') ? '&' : '?'}page=1&limit=-5`, { token: ep.token });
    const beyondPageRes = await req(`${ep.path}${ep.path.includes('?') ? '&' : '?'}page=9999&limit=25`, { token: ep.token });

    paginationResults.push({
      endpoint: ep.name,
      path: ep.path,
      defaultLimit: defaultRes.data?.meta?.limit || defaultRes.data?.data?.length,
      maxLimitStatus: maxLimitRes.status,
      overLimitStatus: overLimitRes.status, // expected 422
      invalidPageStatus: invalidPageRes.status, // expected 422
      invalidLimitStatus: invalidLimitRes.status, // expected 422
      beyondPageEmpty: Array.isArray(beyondPageRes.data?.data) ? beyondPageRes.data.data.length === 0 : true,
      timeMs: page1Res.timeMs,
    });
  }
  console.log('Pagination Audit Summary:', paginationResults);

  // ----------------------------------------------------
  // PHASE 6: THREE-ROLE AUTHORIZATION MATRIX
  // ----------------------------------------------------
  console.log('\n--- Phase 6: Role Authorization Matrix across All Endpoints ---');
  const authMatrixResults = [];

  for (const ep of registeredEndpoints) {
    let testPath = ep.path
      .replace(':id', testReelId || '665f9a2b1c8d4e0012a3b456')
      .replace(':eventId', usage1EventId || '665f9a2b1c8d4e0012a3b456');

    // Substitute user id for user routes
    if (testPath.includes('/users/665')) {
      testPath = testPath.replace('665f9a2b1c8d4e0012a3b456', operatorUser._id.toString());
    }

    const testMethod = ep.method;
    const body = testMethod === 'POST' || testMethod === 'PATCH' ? {} : null;

    // Test No Token
    const noTokenRes = await req(testPath, { method: testMethod, body });
    // Test Admin
    const adminRes = await req(testPath, { method: testMethod, body, token: adminToken });
    // Test Supervisor
    const supRes = await req(testPath, { method: testMethod, body, token: supervisorToken });
    // Test Operator
    const opRes = await req(testPath, { method: testMethod, body, token: operatorToken });

    authMatrixResults.push({
      method: ep.method,
      endpoint: ep.path,
      authRequired: ep.auth,
      allowedRoles: ep.allowedRoles,
      noTokenStatus: noTokenRes.status,
      adminStatus: adminRes.status,
      supervisorStatus: supRes.status,
      operatorStatus: opRes.status,
      adminAllowed: adminRes.status !== 401 && adminRes.status !== 403,
      supervisorAllowed: supRes.status !== 401 && supRes.status !== 403,
      operatorAllowed: opRes.status !== 401 && opRes.status !== 403,
    });
  }

  // ----------------------------------------------------
  // CLEANUP TEST ENTITIES (Isolated cleanup)
  // ----------------------------------------------------
  console.log('\n--- Isolated Test Data Cleanup ---');
  if (testReelId) {
    await Reel.deleteOne({ _id: testReelId });
    await ReelEvent.deleteMany({ reel_id: testReelId });
    console.log(`Cleaned up test reel ${uniqueReelNo} and associated events`);
  }
  if (createdFieldId) {
    await FieldDefinition.deleteOne({ _id: createdFieldId });
    console.log(`Cleaned up test custom field definition ${uniqueFieldName}`);
  }

  await disconnectDb();

  const finalOutput = {
    totalEndpoints: registeredEndpoints.length,
    health: healthRes.data,
    authResults: report.auth_results,
    paginationResults,
    authMatrix: authMatrixResults,
    testReel: {
      id: testReelId,
      reel_no: uniqueReelNo,
      initial_weight: 1000,
      usage1_deducted: 300,
      usage2_deducted: 300,
      declined_and_reverted_to: 700,
    },
  };

  import('node:fs').then(fs => {
    fs.mkdirSync('scratch', { recursive: true });
    fs.writeFileSync('scratch/audit_report.json', JSON.stringify(finalOutput, null, 2));
    console.log('\nAudit complete! Saved detailed machine-readable report to scratch/audit_report.json');
  });
}

run().catch(err => {
  console.error('Audit execution error:', err);
  process.exit(1);
});
