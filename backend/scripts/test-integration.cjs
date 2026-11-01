require('dotenv/config');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
if (!process.env.DATABASE_URL) throw new Error('Configure backend/.env first');
const url = new URL(process.env.DATABASE_URL);
url.searchParams.set('schema','flight_platform_test');
const testRedis=new URL(process.env.REDIS_URL);testRedis.pathname='/15';
const env = { ...process.env, DATABASE_URL: url.toString(),REDIS_URL:testRedis.toString(), NODE_ENV: 'test', ENABLE_MOCK_PAYMENTS: 'true', RUN_FLIGHT_INTEGRATION: '1',FLIGHT_SYNC_ENABLED:'false',FLIGHT_SCHEDULE_URL:'',FLIGHT_STATUS_URL:'',FLIGHT_FARES_URL:'',FLIGHT_PROVIDER_API_KEY:'',SMTP_HOST:'',SMTP_USER:'',SMTP_PASSWORD:'' };
const testFiles = process.argv.slice(2);
for (const args of [[path.resolve('node_modules/prisma/build/index.js'),'migrate','deploy'],['--test','--test-concurrency=1',...(testFiles.length ? testFiles : ['tests/integration.test.cjs','tests/admin.integration.test.cjs','tests/qa.integration.test.cjs'])]]) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
