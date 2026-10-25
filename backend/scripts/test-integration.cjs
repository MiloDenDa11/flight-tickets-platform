require('dotenv/config');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
if (!process.env.DATABASE_URL) throw new Error('Configure backend/.env first');
const url = new URL(process.env.DATABASE_URL);
url.searchParams.set('schema','flight_platform_test');
const env = { ...process.env, DATABASE_URL: url.toString(), NODE_ENV: 'test', ENABLE_MOCK_PAYMENTS: 'true', RUN_FLIGHT_INTEGRATION: '1' };
for (const args of [[path.resolve('node_modules/prisma/build/index.js'),'migrate','deploy'],['--test','--test-concurrency=1','tests/integration.test.cjs']]) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
