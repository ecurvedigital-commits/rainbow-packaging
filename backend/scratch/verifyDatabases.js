import { connectDb, disconnectDb } from '../src/config/db.js';
import mongoose from 'mongoose';

async function verifyDatabases() {
  await connectDb();
  const client = mongoose.connection.client;

  const sourceDb = client.db('rainbow_dev');
  const prodDb = client.db('reel_inventory_prod');
  const devDb = client.db('reel_inventory_dev');

  const sourceCollections = await sourceDb.listCollections().toArray();
  const results = [];

  console.log('========================================================================================');
  console.log('PHASE 4 — DATABASE VERIFICATION REPORT');
  console.log('========================================================================================\n');

  for (const colInfo of sourceCollections) {
    const colName = colInfo.name;
    const sourceCount = await sourceDb.collection(colName).countDocuments();
    const prodCount = await prodDb.collection(colName).countDocuments();
    const devCount = await devDb.collection(colName).countDocuments();

    const matches = prodCount === sourceCount && devCount === sourceCount;

    results.push({
      collection: colName,
      sourceCount,
      prodCount,
      devCount,
      matches: matches ? 'YES' : 'NO',
    });
  }

  console.table(results);

  await disconnectDb();
}

verifyDatabases().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
