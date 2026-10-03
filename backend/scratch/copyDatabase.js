import { connectDb, disconnectDb } from '../src/config/db.js';
import mongoose from 'mongoose';

const SOURCE_DB_NAME = 'rainbow_dev';
const TARGET_DBS = ['reel_inventory_prod', 'reel_inventory_dev'];

async function copyDatabase() {
  await connectDb();
  const client = mongoose.connection.client;
  const sourceDb = client.db(SOURCE_DB_NAME);

  console.log(`====================================================`);
  console.log(`COPY DATABASE SCRIPT (NON-DESTRUCTIVE)`);
  console.log(`Source Database: "${SOURCE_DB_NAME}"`);
  console.log(`Target Databases: ${TARGET_DBS.map((d) => `"${d}"`).join(', ')}`);
  console.log(`====================================================\n`);

  // Get list of collections in source DB
  const sourceCollections = await sourceDb.listCollections().toArray();
  console.log(`Found ${sourceCollections.length} collections in source database "${SOURCE_DB_NAME}":`);
  sourceCollections.forEach((c) => console.log(` - ${c.name}`));

  for (const targetDbName of TARGET_DBS) {
    console.log(`\n----------------------------------------------------`);
    console.log(`Copying "${SOURCE_DB_NAME}" -> "${targetDbName}"`);
    console.log(`----------------------------------------------------`);

    const targetDb = client.db(targetDbName);

    for (const colInfo of sourceCollections) {
      const colName = colInfo.name;
      const sourceCol = sourceDb.collection(colName);
      const targetCol = targetDb.collection(colName);

      // Check if target collection already has data to prevent duplicate key errors
      const targetExistingCount = await targetCol.countDocuments();
      if (targetExistingCount > 0) {
        console.log(` [SKIP] Target collection "${targetDbName}.${colName}" already contains ${targetExistingCount} documents.`);
        continue;
      }

      // Fetch all documents from source collection
      const docs = await sourceCol.find({}).toArray();
      if (docs.length > 0) {
        await targetCol.insertMany(docs, { ordered: false });
        console.log(` [COPIED] ${docs.length} documents -> "${targetDbName}.${colName}"`);
      } else {
        console.log(` [EMPTY] 0 documents -> "${targetDbName}.${colName}"`);
      }

      // Copy indexes (excluding default _id_ index)
      const sourceIndexes = await sourceCol.indexes();
      for (const index of sourceIndexes) {
        if (index.name === '_id_') continue;
        try {
          const { key, name, unique, partialFilterExpression, background } = index;
          const options = {};
          if (name) options.name = name;
          if (unique) options.unique = unique;
          if (partialFilterExpression) options.partialFilterExpression = partialFilterExpression;
          if (background) options.background = background;

          await targetCol.createIndex(key, options);
          console.log(`   └─ Created Index "${index.name}" on "${targetDbName}.${colName}"`);
        } catch (idxErr) {
          console.warn(`   └─ Warning creating index "${index.name}":`, idxErr.message);
        }
      }
    }
  }

  console.log('\n====================================================');
  console.log('Database copy operation complete.');
  console.log('====================================================');

  await disconnectDb();
}

copyDatabase().catch((err) => {
  console.error('Database copy failed:', err);
  process.exit(1);
});
