import fs from 'node:fs';

const envPath = '.env';
if (fs.existsSync(envPath)) {
  let content = fs.readFileSync(envPath, 'utf8');

  if (content.includes('MONGODB_DB_NAME=')) {
    content = content.replace(/MONGODB_DB_NAME=.*/g, 'MONGODB_DB_NAME=reel_inventory_dev');
  } else {
    content += '\nMONGODB_DB_NAME=reel_inventory_dev\n';
  }

  fs.writeFileSync(envPath, content, 'utf8');
  console.log('Successfully updated backend/.env to use MONGODB_DB_NAME=reel_inventory_dev');
} else {
  console.log('backend/.env file not found.');
}
