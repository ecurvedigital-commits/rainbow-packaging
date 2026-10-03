import { connectDb, disconnectDb } from '../src/config/db.js';
import mongoose from 'mongoose';

async function check() {
  const conn = await connectDb();
  const db = mongoose.connection.db;

  console.log(`CURRENT DB NAME: "${db.databaseName}"`);

  // List all databases in cluster
  const adminDb = db.admin();
  const dbs = await adminDb.listDatabases();
  console.log('\n--- DATABASES IN MONGO ATLAS CLUSTER ---');
  dbs.databases.forEach((d) => {
    console.log(` - Database: ${d.name} (sizeOnDisk: ${d.sizeOnDisk} bytes)`);
  });

  // List collections in current database
  const collections = await db.listCollections().toArray();
  console.log(`\n--- COLLECTIONS IN "${db.databaseName}" ---`);
  for (const colInfo of collections) {
    const colName = colInfo.name;
    const count = await db.collection(colName).countDocuments();
    console.log(` - Collection: ${colName} -> ${count} documents`);
  }

  await disconnectDb();
}

check().catch((err) => {
  console.error('Error checking DB:', err.message);
  process.exit(1);
});
