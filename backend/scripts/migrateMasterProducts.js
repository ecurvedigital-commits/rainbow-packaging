import { connectDb, disconnectDb } from '../src/config/db.js';
import { Reel } from '../src/models/reel.model.js';
import { MasterProduct } from '../src/models/masterProduct.model.js';
import { User } from '../src/models/user.model.js';
import { generateMasterKey } from '../src/utils/masterKeyGenerator.js';
import fs from 'node:fs';

const isCommit = process.argv.includes('--commit');

async function migrate() {
  console.log('====================================================');
  console.log(`MASTER PRODUCT MIGRATION (${isCommit ? 'COMMIT MODE' : 'DRY-RUN MODE'})`);
  console.log('====================================================\n');

  await connectDb();

  const adminUser = await User.findOne({ role: 'ADMIN' });
  const adminId = adminUser ? adminUser._id : null;

  const reels = await Reel.find({}).lean();
  console.log(`Total reels found in database: ${reels.length}`);

  const specGroups = new Map();
  const invalidReels = [];

  for (const reel of reels) {
    try {
      const spec = generateMasterKey({
        quality: reel.quality,
        gsm: reel.gsm,
        bf: reel.bf,
        size: reel.size,
      });

      if (!specGroups.has(spec.master_key)) {
        specGroups.set(spec.master_key, {
          spec,
          reelIds: [],
        });
      }
      specGroups.get(spec.master_key).reelIds.push(reel._id);
    } catch (err) {
      invalidReels.push({
        id: reel._id.toString(),
        reel_no: reel.reel_no,
        reason: err.message,
      });
    }
  }

  console.log(`Distinct Master Products identified: ${specGroups.size}`);
  console.log(`Reels failing spec validation: ${invalidReels.length}`);

  const report = {
    timestamp: new Date().toISOString(),
    isCommit,
    totalReelsExamined: reels.length,
    masterProductsIdentified: specGroups.size,
    invalidReelsCount: invalidReels.length,
    invalidReels,
    masterProductsSummary: [],
  };

  for (const [key, group] of specGroups.entries()) {
    report.masterProductsSummary.push({
      master_key: key,
      name: group.spec.name,
      reelCount: group.reelIds.length,
    });
  }

  if (isCommit) {
    console.log('\n--- Executing Migration Writes ---');
    let masterProductsCreated = 0;
    let masterProductsReused = 0;
    let reelsUpdated = 0;

    for (const [key, group] of specGroups.entries()) {
      const { spec, reelIds } = group;

      let masterProduct = await MasterProduct.findOne({ master_key: key });

      if (!masterProduct) {
        masterProduct = await MasterProduct.create({
          master_key: spec.master_key,
          name: spec.name,
          quality: spec.quality,
          gsm: spec.gsm,
          bf: spec.bf,
          size: spec.size,
          parameter_codes: spec.parameter_codes,
          is_active: true,
          created_by: adminId,
        });
        masterProductsCreated++;
      } else {
        masterProductsReused++;
      }

      const updateRes = await Reel.updateMany(
        { _id: { $in: reelIds } },
        {
          $set: {
            master_product_id: masterProduct._id,
            master_key: masterProduct.master_key,
          },
        }
      );
      reelsUpdated += updateRes.modifiedCount;
    }

    console.log(`Master Products Created: ${masterProductsCreated}`);
    console.log(`Master Products Reused: ${masterProductsReused}`);
    console.log(`Reels Updated: ${reelsUpdated}`);

    report.migrationResult = {
      masterProductsCreated,
      masterProductsReused,
      reelsUpdated,
    };
  } else {
    console.log('\nDRY-RUN complete. No database changes were executed.');
    console.log('To perform migration, run: node scripts/migrateMasterProducts.js --commit');
  }

  await disconnectDb();

  fs.mkdirSync('scratch', { recursive: true });
  fs.writeFileSync('scratch/master_product_migration_report.json', JSON.stringify(report, null, 2));
  console.log('\nMigration report saved to scratch/master_product_migration_report.json');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
