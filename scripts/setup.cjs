const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const target = path.join(root, 'backend', '.env');
if (fs.existsSync(target)) {
  console.log('Existing backend/.env preserved. Read README.md for database migration and startup.');
  process.exit(0);
}
const dbPassword = crypto.randomBytes(24).toString('hex');
const adminPassword = 'Admin-' + crypto.randomBytes(10).toString('hex');
const userPassword = 'Fly-' + crypto.randomBytes(10).toString('hex');
const composeEnv = path.join(root, '.env');
if (fs.existsSync(composeEnv)) throw new Error('Root .env already exists. Configure backend/.env manually to match it.');
fs.writeFileSync(composeEnv, `POSTGRES_PASSWORD=${dbPassword}\n`, { flag: 'wx' });
const sample = fs.readFileSync(path.join(root, 'backend', '.env.example'), 'utf8')
  .replace('replace_password', dbPassword)
  .replace('replace_with_random_secret_at_least_32_characters', crypto.randomBytes(48).toString('hex'))
  .replace('SEED_ADMIN_PASSWORD=', 'SEED_ADMIN_PASSWORD=' + adminPassword)
  .replace('SEED_USER_PASSWORD=', 'SEED_USER_PASSWORD=' + userPassword);
fs.writeFileSync(target, sample, { flag: 'wx' });
const frontEnv = path.join(root, 'frontend', '.env');
if (!fs.existsSync(frontEnv)) fs.copyFileSync(path.join(root, 'frontend', '.env.example'), frontEnv);
fs.writeFileSync(path.join(root, 'DEMO-ACCOUNTS.md'), `# Local demo accounts\n\nCreated by setup. Available after npm run db:seed. Do not commit this file.\n\n- Admin: admin@flight.local — ${adminPassword}\n- User: demo@flight.local — ${userPassword}\n\nFrontend: http://localhost:5174\nAPI: http://localhost:3001/api/v1\n`, { flag: 'wx' });
console.log('Created independent local configuration and generated passwords. See DEMO-ACCOUNTS.md after seeding.');
