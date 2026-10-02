import serverless from 'serverless-http';
import { connectDb } from '../../backend/src/config/db.js';
import { ensureSettings } from '../../backend/src/services/setting.service.js';
import { ensureAdmin } from '../../backend/src/services/user.service.js';
import { createApp } from '../../backend/src/app.js';

const app = createApp();
const serverlessHandler = serverless(app);

let isConnected = false;

export const handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  if (!isConnected) {
    await connectDb();
    await ensureSettings();
    await ensureAdmin();
    isConnected = true;
  }
  return serverlessHandler(event, context);
};
