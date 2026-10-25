import Redis from 'ioredis';
import { env } from './env';
export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true, maxRetriesPerRequest: 1, connectTimeout: 3000,
  retryStrategy: (attempt) => attempt <= 3 ? attempt * 300 : null,
});
redis.on('error', () => {});
// Cache is an optimization only. Seat availability is always checked in PostgreSQL.
export async function cached<T>(key: string, loader: () => Promise<T>): Promise<T> {
  try { const hit = await redis.get(key); if (hit) return JSON.parse(hit) as T; } catch { /* DB fallback */ }
  const result = await loader();
  try { await redis.set(key, JSON.stringify(result), 'EX', 30); } catch { /* DB fallback */ }
  return result;
}
