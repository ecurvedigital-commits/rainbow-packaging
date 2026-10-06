import { connectDb, disconnectDb } from '../src/config/db.js';
import mongoose from 'mongoose';

async function main() {
  await connectDb();
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  console.log('--- Current Collections & Document Counts ---');
  for (const col of collections) {
    const count = await db.collection(col.name).countDocuments();
    console.log(`${col.name}: ${count} docs`);
  }
  await disconnectDb();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
