import { connectDb, disconnectDb } from '../src/config/db.js';
import { MasterCode } from '../src/models/masterCode.model.js';

const NEW_18_MASTER_CODES = [
  { master_code: '1', master_code_name: 'Duplex ultra 220', quality: 'duplex', bf: 'ultra', gsm: 220, size: '', description: 'quality -> duplex, bf -> ultra, gsm -> 220', status: 'ACTIVE' },
  { master_code: '2', master_code_name: 'Duplex Ultra230/240', quality: 'duplex', bf: 'ultra', gsm: '230/240', size: '', description: 'quality -> duplex, bf -> ultra, gsm -> 230/240', status: 'ACTIVE' },
  { master_code: '3', master_code_name: 'Duplex Ultra 250+', quality: 'duplex', bf: 'ultra', gsm: '250+', size: '', description: 'quality -> duplex, bf -> ultra, gsm -> 250+', status: 'ACTIVE' },
  { master_code: '4', master_code_name: 'Duplex DCB', quality: 'duplex', bf: 'dcb', gsm: '', size: '', description: 'quality -> duplex, bf -> dcb', status: 'ACTIVE' },
  { master_code: '5', master_code_name: 'Duplex Spectra', quality: 'duplex', bf: 'spectra', gsm: '', size: '', description: 'quality -> duplex, bf -> spectra', status: 'ACTIVE' },
  { master_code: '6', master_code_name: 'SK-16-100', quality: 'sk', bf: 16, gsm: 100, size: '', description: 'quality -> sk, bf -> 16, gsm -> 100', status: 'ACTIVE' },
  { master_code: '7', master_code_name: 'SK-18-180', quality: 'sk', bf: 18, gsm: 180, size: '', description: 'quality -> sk, bf -> 18, gsm -> 180', status: 'ACTIVE' },
  { master_code: '8', master_code_name: 'SK-18-140', quality: 'sk', bf: 18, gsm: 140, size: '', description: 'quality -> sk, bf -> 18, gsm -> 140', status: 'ACTIVE' },
  { master_code: '9', master_code_name: 'SK-18-180', quality: 'sk', bf: 18, gsm: 180, size: '', description: 'quality -> sk, bf -> 18, gsm -> 180', status: 'ACTIVE' },
  { master_code: '10', master_code_name: 'SK-22-140', quality: 'sk', bf: 22, gsm: 140, size: '', description: 'quality -> sk, bf -> 22, gsm -> 140', status: 'ACTIVE' },
  { master_code: '11', master_code_name: 'VK-18-140', quality: 'vk', bf: 18, gsm: 140, size: '', description: 'quality -> vk, bf -> 18, gsm -> 140', status: 'ACTIVE' },
  { master_code: '12', master_code_name: 'VK-18-180', quality: 'vk', bf: 18, gsm: 180, size: '', description: 'quality -> vk, bf -> 18, gsm -> 180', status: 'ACTIVE' },
  { master_code: '13', master_code_name: 'VK-22-180', quality: 'vk', bf: 22, gsm: 180, size: '', description: 'quality -> vk, bf -> 22, gsm -> 180', status: 'ACTIVE' },
  { master_code: '14', master_code_name: 'VK-25-180', quality: 'vk', bf: 25, gsm: 180, size: '', description: 'quality -> vk, bf -> 25, gsm -> 180', status: 'ACTIVE' },
  { master_code: '15', master_code_name: 'VK-25-220', quality: 'vk', bf: 25, gsm: 220, size: '', description: 'quality -> vk, bf -> 25, gsm -> 220', status: 'ACTIVE' },
  { master_code: '16', master_code_name: 'Import Kraft', quality: 'import kraft', bf: '', gsm: '', size: '', description: 'import kraft', status: 'ACTIVE' },
  { master_code: '17', master_code_name: 'FBB', quality: 'fbb', bf: '', gsm: '', size: '', description: 'fbb', status: 'ACTIVE' },
  { master_code: '18', master_code_name: 'SBS', quality: 'sbs', bf: '', gsm: '', size: '', description: 'sbs', status: 'ACTIVE' },
];

async function reset() {
  try {
    await connectDb();
    console.log('Connected to DB. Removing existing Master Codes...');
    const delResult = await MasterCode.deleteMany({});
    console.log(`Deleted ${delResult.deletedCount} old master code records.`);

    console.log('Inserting 18 updated master code buckets...');
    const inserted = await MasterCode.insertMany(NEW_18_MASTER_CODES);
    console.log(`Successfully seeded ${inserted.length} master codes!`);

    await disconnectDb();
    process.exit(0);
  } catch (err) {
    console.error('Error resetting master codes:', err);
    await disconnectDb();
    process.exit(1);
  }
}

reset();
