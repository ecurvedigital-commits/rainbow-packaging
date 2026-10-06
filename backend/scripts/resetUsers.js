import { connectDb, disconnectDb } from '../src/config/db.js';
import { User } from '../src/models/user.model.js';
import { RefreshToken } from '../src/models/refreshToken.model.js';
import { ROLES } from '../src/constants/roles.js';
import { hashPassword } from '../src/utils/password.js';
import { logger } from '../src/config/logger.js';

async function resetUsers() {
  try {
    await connectDb();
    console.log('Connected to MongoDB database.');

    // 1. Clear all existing users and refresh tokens
    const deletedTokens = await RefreshToken.deleteMany({});
    const deletedUsers = await User.deleteMany({});
    console.log(`Removed ${deletedUsers.deletedCount} existing users and ${deletedTokens.deletedCount} active sessions.`);

    // 2. Hash default password
    const rawPassword = 'Q@123456';
    const password_hash = await hashPassword(rawPassword);

    // 3. Define the three requested system users
    const usersToCreate = [
      {
        name: 'Store (Operator)',
        username: 'store',
        email: 'store@rainbowpackages.com',
        password_hash,
        plain_password: rawPassword,
        role: ROLES.OPERATOR,
        is_active: true,
        must_change_password: false,
      },
      {
        name: 'MIS (Supervisor)',
        username: 'mis',
        email: 'mis@rainbowpackages.com',
        password_hash,
        plain_password: rawPassword,
        role: ROLES.SUPERVISOR,
        is_active: true,
        must_change_password: false,
      },
      {
        name: 'Admin (Full Access)',
        username: 'admin',
        email: 'admin@rainbowpackages.com',
        password_hash,
        plain_password: rawPassword,
        role: ROLES.ADMIN,
        is_active: true,
        must_change_password: false,
      },
    ];

    for (const u of usersToCreate) {
      const created = await User.create(u);
      console.log(`[+] Created user: ${created.username} (Role: ${created.role}, Name: ${created.name})`);
    }

    console.log('\n=== USERS RESET SUMMARY ===');
    console.log('1. store (Operator / Create) -> Password: Q@123456');
    console.log('2. mis (Supervisor / Approve) -> Password: Q@123456');
    console.log('3. admin (Admin / Full Access) -> Password: Q@123456');
    console.log('===========================\n');

    await disconnectDb();
    process.exit(0);
  } catch (error) {
    console.error('Error resetting users:', error);
    logger.error({ reason: error.message }, 'Failed to reset system users');
    await disconnectDb();
    process.exit(1);
  }
}

resetUsers();
