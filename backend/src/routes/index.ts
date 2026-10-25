import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { redis } from '../config/redis';
import { env } from '../config/env';
import { authenticate, optionalAuthenticate } from '../middlewares/auth.middleware';
import { flightController } from '../controllers/flight.controller';
import auth from './auth.routes';
import bookings from './booking.routes';
import users from './user.routes';
import admin from './admin.routes';
const router = Router();
router.get('/health', async (_req, res) => {
  let database = false, cache = false;
  try { await prisma.$queryRaw`SELECT 1`; database = true; } catch { /* report health */ }
  try { cache = await redis.ping() === 'PONG'; } catch { /* optional */ }
  res.status(database ? 200 : 503).json({ success: database, data: { service: 'flight-tickets-platform', database, cache, mockPayments: env.ENABLE_MOCK_PAYMENTS === 'true' } });
});
router.get('/airports', flightController.airports);
router.get('/airlines', async (_req, res) => { res.json({ success: true, data: await prisma.airline.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }) }); });
router.get('/airlines/:id/reviews', async (req, res) => { res.json({ success: true, data: await prisma.review.findMany({ where: { airlineId: z.coerce.number().int().positive().parse(req.params.id), isVisible: true }, select: { id: true, rating: true, comment: true, createdAt: true, user: { select: { fullName: true } } }, take: 50, orderBy: { createdAt: 'desc' } }) }); });
router.get('/flights', optionalAuthenticate, flightController.search);
router.get('/fares/:id', async (req, res) => { res.json({ success: true, data: await prisma.flightFare.findUniqueOrThrow({ where: { id: z.coerce.number().int().positive().parse(req.params.id) }, include: { flight: { include: { airline: true, origin: true, destination: true, fares: true } } } }) }); });
router.get('/flights/:id', flightController.detail);
router.post('/assistant/recommend', authenticate, flightController.assistant);
router.post('/flights/recommend', authenticate, flightController.assistant);
router.use('/auth', auth);
router.use('/bookings', bookings);
router.use('/users', users);
router.use('/admin', admin);
export default router;
