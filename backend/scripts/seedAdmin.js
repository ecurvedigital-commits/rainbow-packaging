import { connectDb, disconnectDb } from '../src/core/database/db.js';
import { User } from '../src/modules/users/models/user.model.js';
import { ROLES } from '../src/core/constants/roles.js';
import { hashPassword } from '../src/core/utils/password.js';
import { env } from '../src/core/config/env.js';
import { logger } from '../src/core/config/logger.js';

async function run() {
  try {
    await connectDb();

    const existingAdmin = await User.findOne({ role: ROLES.ADMIN, is_active: true });
    if (existingAdmin) {
      console.log('Admin already exists');
      await disconnectDb();
      process.exit(0);
    }

    const name = env.SEED_ADMIN_NAME || 'Super Admin';
    const username = (env.SEED_ADMIN_USERNAME || 'admin').toLowerCase().trim();
    const email = (env.SEED_ADMIN_EMAIL || 'admin@rainbowpackages.com').toLowerCase().trim();
    const password = env.SEED_ADMIN_PASSWORD || 'Admin@12345';

    const password_hash = await hashPassword(password);

    await User.create({
      name,
      username,
      email,
      password_hash,
      role: ROLES.ADMIN,
      is_active: true,
      must_change_password: true,
    });

    console.log(`Seeded initial Admin user: ${username}`);
    logger.info({ username }, 'Seeded initial Admin user successfully');

    await disconnectDb();
    process.exit(0);
  } catch (error) {
    logger.error({ reason: error.message }, 'Failed to seed initial Admin user');
    await disconnectDb();
    process.exit(1);
  }
}

run();
