import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { flightInclude } from './flight.repository';
export const bookingInclude = {
  segments: { orderBy: { sequence: 'asc' as const }, include: { fare: { include: { flight: { include: flightInclude } } }, tickets: true } },
  passengers: { include: { tickets: true } }, payment: true,
} satisfies Prisma.BookingInclude;
export const bookingRepository = {
  list: (userId: number) => prisma.booking.findMany({ where: { userId }, include: bookingInclude, orderBy: { createdAt: 'desc' }, take: 100 }),
  find: (id: string, userId: number) => prisma.booking.findFirst({ where: { id, userId }, include: bookingInclude }),
};
