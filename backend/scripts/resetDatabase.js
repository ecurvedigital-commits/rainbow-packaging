import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import dns from 'dns';
import { execSync } from 'child_process';
import { User } from '../src/models/user.model.js';
import { RefreshToken } from '../src/models/refreshToken.model.js';
import { Reel } from '../src/models/reel.model.js';
import { ReelEvent } from '../src/models/reelEvent.model.js';
import { CorrectionRequest } from '../src/models/correctionRequest.model.js';
import { Notification } from '../src/models/notification.model.js';
import { Message } from '../src/models/message.model.js';
import { Counter } from '../src/models/counter.model.js';
import { DigestLog } from '../src/models/digestLog.model.js';
import { Setting } from '../src/models/setting.model.js';
import { ROLES } from '../src/constants/roles.js';
import { hashPassword } from '../src/utils/password.js';

function configureDns() {
  if (process.platform === 'win32') {
    try {
      const output = execSync('powershell -NoProfile -Command "(Get-DnsClientServerAddress -AddressFamily IPv4).ServerAddresses"', { encoding: 'utf8' });
      const ips = output.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
      dns.setServers(Array.from(new Set([...ips, '8.8.8.8', '1.1.1.1', '8.8.4.4'])));
    } catch {
      dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
    }
  }
}

async function main() {
  configureDns();
  const args = process.argv.slice(2);

  // Extract URI from CLI arguments if provided
  let targetUri = null;
  let customDbName = null;
  let mode = 'all'; // 'all' | 'users' | 'reels'

  for (const arg of args) {
    if (arg.startsWith('--uri=')) {
      targetUri = arg.replace('--uri=', '').trim();
    } else if (arg.startsWith('--db=')) {
      customDbName = arg.replace('--db=', '').trim();
    } else if (arg === '--users-only' || arg === '--users') {
      mode = 'users';
    } else if (arg === '--reels-only' || arg === '--reels') {
      mode = 'reels';
    } else if (arg.startsWith('mongodb://') || arg.startsWith('mongodb+srv://')) {
      targetUri = arg.trim();
    }
  }

  // Fallback to env variable
  if (!targetUri) {
    targetUri = process.env.PROD_MONGODB_URI || process.env.MONGODB_URI;
  }
  if (!customDbName) {
    customDbName = process.env.PROD_MONGODB_DB_NAME || process.env.MONGODB_DB_NAME;
  }

  if (!targetUri) {
    console.error('❌ Error: No MongoDB connection URI specified.');
    console.error('Usage:');
    console.error('  node scripts/resetDatabase.js "mongodb+srv://<user>:<password>@<cluster>/<database>"');
    console.error('  node scripts/resetDatabase.js --reels-only');
    console.error('  node scripts/resetDatabase.js --users-only');
    process.exit(1);
  }

  // Mask credentials for logging
  const maskedUri = targetUri.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@');
  console.log('\n======================================================');
  console.log(`🔌 Connecting to MongoDB: ${maskedUri}`);
  console.log(`🎯 Mode: ${mode.toUpperCase()}`);
  console.log('======================================================\n');

  try {
    const connectOptions = {
      serverSelectionTimeoutMS: 15000,
    };
    if (customDbName) {
      connectOptions.dbName = customDbName;
    }

    await mongoose.connect(targetUri, connectOptions);
    const dbName = mongoose.connection.name;
    const dbHost = mongoose.connection.host;
    console.log(`✅ Connected successfully to database: [${dbName}] on [${dbHost}]\n`);

    // ----------------------------------------------------
    // 1. RESET REELS & TRANSACTIONS (If mode is 'all' or 'reels')
    // ----------------------------------------------------
    if (mode === 'all' || mode === 'reels') {
      console.log('🧹 [1/2] Clearing all reels, logs, and transactions...');
      
      const [
        delReels,
        delEvents,
        delCorrections,
        delNotifs,
        delMessages,
        delDigests,
        delCounters,
      ] = await Promise.all([
        Reel.deleteMany({}),
        ReelEvent.deleteMany({}),
        CorrectionRequest.deleteMany({}),
        Notification.deleteMany({}),
        Message.deleteMany({}),
        DigestLog.deleteMany({}),
        Counter.deleteMany({}),
      ]);

      console.log(`   - Deleted ${delReels.deletedCount} Reels`);
      console.log(`   - Deleted ${delEvents.deletedCount} Reel Activity Events`);
      console.log(`   - Deleted ${delCorrections.deletedCount} Correction Requests`);
      console.log(`   - Deleted ${delNotifs.deletedCount} Notifications`);
      console.log(`   - Deleted ${delMessages.deletedCount} Messages`);
      console.log(`   - Deleted ${delDigests.deletedCount} Digest Logs`);
      console.log(`   - Reset ${delCounters.deletedCount} Auto-increment Counters`);
      console.log('   ✨ Inventory & transactions are completely fresh.\n');
    }

    // ----------------------------------------------------
    // 2. RESET USERS (If mode is 'all' or 'users')
    // ----------------------------------------------------
    if (mode === 'all' || mode === 'users') {
      console.log('👤 [2/2] Resetting users to the standard 3 accounts...');

      const delTokens = await RefreshToken.deleteMany({});
      const delUsers = await User.deleteMany({});
      console.log(`   - Removed ${delUsers.deletedCount} existing users and ${delTokens.deletedCount} active refresh tokens.`);

      const defaultPassword = 'Q@123456';
      const passwordHash = await hashPassword(defaultPassword);

      const standardUsers = [
        {
          name: 'Store (Operator)',
          username: 'store',
          email: 'store@rainbowpackages.com',
          password_hash: passwordHash,
          plain_password: defaultPassword,
          role: ROLES.OPERATOR,
          is_active: true,
          must_change_password: false,
        },
        {
          name: 'MIS (Supervisor)',
          username: 'mis',
          email: 'mis@rainbowpackages.com',
          password_hash: passwordHash,
          plain_password: defaultPassword,
          role: ROLES.SUPERVISOR,
          is_active: true,
          must_change_password: false,
        },
        {
          name: 'Admin (Full Access)',
          username: 'admin',
          email: 'admin@rainbowpackages.com',
          password_hash: passwordHash,
          plain_password: defaultPassword,
          role: ROLES.ADMIN,
          is_active: true,
          must_change_password: false,
        },
      ];

      for (const u of standardUsers) {
        const created = await User.create(u);
        console.log(`   [+] Created user: @${created.username.padEnd(8)} | Role: ${created.role.padEnd(12)} | Name: ${created.name}`);
      }
    }

    // Ensure settings exist
    const currentSettings = await Setting.findOne();
    if (!currentSettings) {
      await Setting.create({
        general: {
          low_stock_threshold_kg: 500,
          aging_threshold_days: 45,
          default_rate_per_kg: 55,
        },
        approval: {
          require_approval_for_creation: true,
          require_approval_for_usage: true,
          allow_supervisor_approval: true,
        },
      });
      console.log('\n⚙️ Default settings initialized (Approval workflows: ACTIVE).');
    }

    console.log('\n======================================================');
    console.log('🎉 DATABASE RESET COMPLETE!');
    console.log('======================================================');
    console.log('Database Name:', dbName);
    console.log('\nStandard Login Credentials (All roles password: Q@123456):');
    console.log('  1. Store Operator:   Username: store   | Password: Q@123456');
    console.log('  2. MIS Supervisor:   Username: mis     | Password: Q@123456');
    console.log('  3. Administrator:    Username: admin   | Password: Q@123456');
    console.log('======================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error executing database reset:', error);
    try {
      await mongoose.disconnect();
    } catch (_) {}
    process.exit(1);
  }
}

main();
