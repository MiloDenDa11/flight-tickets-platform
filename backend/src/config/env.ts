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
});
export const env = schema.parse(process.env);
if (env.NODE_ENV === 'production' && env.ENABLE_MOCK_PAYMENTS === 'true') {
  throw new Error('Disable ENABLE_MOCK_PAYMENTS before production deployment');
}
