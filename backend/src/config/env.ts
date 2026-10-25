import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().url(),
  FRONTEND_URL: z.string().url().default('http://localhost:5174'),
  JWT_ACCESS_SECRET: z.string().min(32),
  HOLD_MINUTES: z.coerce.number().int().min(1).max(60).default(15),
  ENABLE_MOCK_PAYMENTS: z.enum(['true', 'false']).default('true'),
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_USER: z.string().default(''),
  SMTP_PASSWORD: z.string().default(''),
  MAIL_FROM: z.string().default('Flight Tickets <noreply@example.com>'),
  FLIGHT_PROVIDER_NAME: z.string().regex(/^[A-Z0-9_-]{2,60}$/).refine(v=>v!=='LOCAL_DEMO').default('PARTNER_FEED'),
  FLIGHT_SCHEDULE_URL: z.string().default(''),
  FLIGHT_STATUS_URL: z.string().default(''),
  FLIGHT_FARES_URL: z.string().default(''),
  FLIGHT_PROVIDER_API_KEY: z.string().default(''),
  FLIGHT_PROVIDER_TIMEOUT_MS: z.coerce.number().int().min(1000).max(20000).default(10000),
  FLIGHT_SYNC_ENABLED: z.enum(['true','false']).default('false'),
  FLIGHT_SYNC_INTERVAL_SECONDS: z.coerce.number().int().min(60).max(86400).default(300),
});
export const env = schema.parse(process.env);
for(const address of [env.FLIGHT_SCHEDULE_URL,env.FLIGHT_STATUS_URL,env.FLIGHT_FARES_URL])if(address){const url=new URL(address);if(url.username||url.password||(url.protocol!=='https:'&&!(env.NODE_ENV==='test'&&['localhost','127.0.0.1'].includes(url.hostname)&&url.protocol==='http:')))throw new Error('Provider endpoints require HTTPS without URL credentials');}
if (env.NODE_ENV === 'production' && env.ENABLE_MOCK_PAYMENTS === 'true') {
  throw new Error('Disable ENABLE_MOCK_PAYMENTS before production deployment');
}
