import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
export const flightInclude = { airline: true, origin: true, destination: true, fares: { orderBy: { basePrice: 'asc' as const } } } satisfies Prisma.FlightInclude;
export const flightRepository = {
  search: (where: Prisma.FlightWhereInput) => prisma.flight.findMany({ where, include: flightInclude, orderBy: { departureTime: 'asc' }, take: 500 }),
  byId: (id: number) => prisma.flight.findUniqueOrThrow({ where: { id }, include: flightInclude }),
};
