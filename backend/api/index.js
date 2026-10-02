import { connectDb } from '../src/config/db.js';
import { ensureSettings } from '../src/services/setting.service.js';
import { ensureAdmin } from '../src/services/user.service.js';
import { createApp } from '../src/app.js';

const app = createApp();

let isConnected = false;

export default async function handler(req, res) {
  if (!isConnected) {
    await connectDb();
    await ensureSettings();
    await ensureAdmin();
    isConnected = true;
  }
  return app(req, res);
}
