import { env } from './config/env';
import app from './app';
import { prisma } from './config/db';
import { redis } from './config/redis';
import { releaseExpired } from './services/booking.service';
async function main() {
  await prisma.$connect();
  await redis.connect().catch(() => console.warn('Redis unavailable; serving directly from database.'));
  await releaseExpired();
  const server = app.listen(env.PORT, () => console.log(`Flight Tickets API http://localhost:${env.PORT}/api/v1`));
  let sweeping = false;
  const timer = setInterval(async () => {
    if (sweeping) return;
    sweeping = true;
    try { await releaseExpired(); } catch (error) { console.error('Hold cleanup failed:', (error as Error).name); }
    finally { sweeping = false; }
  }, 30000);
  async function shutdown() {
    clearInterval(timer);
    server.close(async () => { await prisma.$disconnect(); redis.disconnect(); process.exit(0); });
    setTimeout(() => process.exit(1), 10000).unref();
  }
  process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
}
main().catch((e: Error) => { console.error('Startup failed:', e.message); process.exit(1); });
