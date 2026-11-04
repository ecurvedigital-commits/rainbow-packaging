import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { User } from '../../users/models/user.model.js';
import { ROLES } from '../../../core/constants/roles.js';
import { env } from '../../../core/config/env.js';
import { logger } from '../../../core/config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let firebaseAdminApp = null;
let isFcmInitialized = false;

/**
 * Initializes Firebase Admin SDK with the Service Account credentials
 */
export function initializeFcm() {
  if (isFcmInitialized) return firebaseAdminApp;
  if (getApps().length > 0) {
    isFcmInitialized = true;
    return getApps()[0];
  }

  try {
    const candidatePaths = [
      env.FIREBASE_SERVICE_ACCOUNT_PATH,
      path.resolve(__dirname, '../../../../rainbow-packaging-firebase-adminsdk-fbsvc-283613d33c.json'),
      path.resolve(process.cwd(), 'rainbow-packaging-firebase-adminsdk-fbsvc-283613d33c.json'),
      path.resolve(process.cwd(), '../rainbow-packaging-firebase-adminsdk-fbsvc-283613d33c.json'),
    ];

    let serviceAccount = null;
    let loadedPath = null;

    for (const p of candidatePaths) {
      if (p && fs.existsSync(p)) {
        try {
          const raw = fs.readFileSync(p, 'utf8');
          serviceAccount = JSON.parse(raw);
          loadedPath = p;
          break;
        } catch (_err) {
          // Continue to next path
        }
      }
    }

    if (serviceAccount && serviceAccount.project_id) {
      firebaseAdminApp = initializeApp({
        credential: cert(serviceAccount),
      });
      isFcmInitialized = true;
      logger.info({ path: loadedPath, projectId: serviceAccount.project_id }, 'Firebase Admin FCM initialized successfully');
      return firebaseAdminApp;
    } else {
      logger.warn('Firebase Service Account JSON not found. Push notifications will be logged only.');
    }
  } catch (err) {
    logger.warn({ error: err.message }, 'Failed to initialize Firebase Admin SDK');
  }

  return null;
}

// Auto-initialize on module load
initializeFcm();

/**
 * Registers an FCM push registration token for an active user.
 * @param {{ userId: string, token: string, deviceName?: string }} args
 * @returns {Promise<{ success: boolean }>}
 */
export async function registerDeviceToken({ userId, token, deviceName }) {
  if (!token) return { success: false };

  const user = await User.findById(userId);
  if (!user) return { success: false };

  if (!user.fcm_tokens) user.fcm_tokens = [];

  // Remove existing entry for same token if present
  user.fcm_tokens = user.fcm_tokens.filter((t) => t.token !== token);

  // Add new token
  user.fcm_tokens.push({
    token,
    device_name: deviceName || null,
    created_at: new Date(),
  });

  // Limit to 5 active device tokens per user
  if (user.fcm_tokens.length > 5) {
    user.fcm_tokens = user.fcm_tokens.slice(-5);
  }

  await user.save();
  return { success: true };
}

/**
 * Unregisters an FCM push registration token on logout.
 * @param {{ userId: string, token: string }} args
 * @returns {Promise<{ success: boolean }>}
 */
export async function unregisterDeviceToken({ userId, token }) {
  if (!token) return { success: false };

  await User.updateOne(
    { _id: userId },
    { $pull: { fcm_tokens: { token } } }
  );
  return { success: true };
}

/**
 * Sends a push notification to specific users.
 * Automatically handles expired/invalid tokens.
 * 
 * @param {{ userIds: Array<string>, title: string, body: string, data?: object, clickAction?: string }} args
 * @returns {Promise<{ successCount: number, failureCount: number }>}
 */
export async function sendPushToUsers({ userIds, title, body, data = {}, clickAction = '/approvals' }) {
  if (!userIds || userIds.length === 0) return { successCount: 0, failureCount: 0 };

  const users = await User.find({ _id: { $in: userIds }, is_active: true }, 'fcm_tokens').lean();
  const tokens = [];

  for (const u of users) {
    if (Array.isArray(u.fcm_tokens)) {
      for (const t of u.fcm_tokens) {
        if (t.token) tokens.push(t.token);
      }
    }
  }

  if (tokens.length === 0) {
    logger.debug({ userIds, title }, 'No registered FCM tokens found for target users');
    return { successCount: 0, failureCount: 0 };
  }

  if (!isFcmInitialized) {
    logger.info({ title, body, tokenCount: tokens.length }, '[SIMULATED PUSH] FCM Service Account not loaded');
    return { successCount: tokens.length, failureCount: 0 };
  }

  // FCM requires all data values to be strings
  const stringifiedData = {};
  for (const [k, v] of Object.entries(data || {})) {
    if (v !== null && v !== undefined) {
      stringifiedData[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
    }
  }
  stringifiedData.click_action = clickAction;
  stringifiedData.clickUrl = clickAction;

  const message = {
    tokens,
    notification: {
      title,
      body,
    },
    data: stringifiedData,
    webpush: {
      fcmOptions: {
        link: clickAction,
      },
      notification: {
        title,
        body,
        icon: '/rainbow-packaging-icon.png',
        badge: '/favicon.svg',
      },
    },
  };

  try {
    const response = await getMessaging().sendEachForMulticast(message);
    logger.info(
      { successCount: response.successCount, failureCount: response.failureCount, title },
      'FCM Push notification dispatched'
    );

    // Clean up stale or invalid tokens
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errCode = resp.error?.code;
          if (
            errCode === 'messaging/invalid-registration-token' ||
            errCode === 'messaging/registration-token-not-registered'
          ) {
            failedTokens.push(tokens[idx]);
          }
        }
      });

      if (failedTokens.length > 0) {
        await User.updateMany(
          { 'fcm_tokens.token': { $in: failedTokens } },
          { $pull: { fcm_tokens: { token: { $in: failedTokens } } } }
        );
      }
    }

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (err) {
    logger.error({ error: err.message }, 'Failed to dispatch FCM push notification');
    return { successCount: 0, failureCount: tokens.length };
  }
}

/**
 * Triggers instant push notification to Supervisors and Admins for PENDING stock entries.
 * 
 * @param {{ stockType: 'REEL' | 'SHEET' | 'BOX', itemLabel: string, category?: string, quantity?: string | number, requestedByName?: string, detailsUrl?: string }} args
 */
export async function notifyPendingStock({
  stockType = 'REEL',
  itemLabel,
  category = '',
  quantity = '',
  requestedByName = 'Operator',
  detailsUrl = '/approvals',
}) {
  try {
    // 1. Find all Admin and Supervisor users
    const recipients = await User.find(
      {
        role: { $in: [ROLES.ADMIN, ROLES.SUPERVISOR] },
        is_active: true,
      },
      '_id'
    ).lean();

    const recipientIds = recipients.map((r) => r._id.toString());
    if (recipientIds.length === 0) return;

    // 2. Format title and body describing which stock is pending
    let title = `⚠️ Pending Stock Alert: ${stockType}`;
    let body = `${itemLabel}`;
    if (category) body += ` · ${category}`;
    if (quantity) body += ` (${quantity})`;
    body += ` pending approval by ${requestedByName}.`;

    if (stockType === 'REEL') {
      title = `📦 Reel Stock Pending: ${itemLabel}`;
    } else if (stockType === 'SHEET') {
      title = `📄 Cut Sheet Stock Pending: ${itemLabel}`;
    } else if (stockType === 'BOX') {
      title = `📦 Box Batch Pending: ${itemLabel}`;
    }

    // 3. Dispatch Push Notification
    await sendPushToUsers({
      userIds: recipientIds,
      title,
      body,
      data: {
        stockType,
        itemLabel: itemLabel || '',
        category: category || '',
        quantity: String(quantity || ''),
        type: 'STOCK_PENDING_APPROVAL',
      },
      clickAction: detailsUrl,
    });
  } catch (err) {
    logger.warn({ error: err.message }, 'Failed to process pending stock notification');
  }
}
