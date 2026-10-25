import { z } from 'zod';
import { prisma } from '../config/db';
import { flightSchema, fareSchema, airlineSchema } from '../validators';
import { publicUser } from '../repositories/user.repository';
import { flightInclude } from '../repositories/flight.repository';
import { serial } from './booking.service';
import { AppError } from '../utils/app-error';

export const adminService = {
  async dashboard() {
    const [users, flights, bookings, revenue, pending, recent, routes] = await Promise.all([
      prisma.user.count(), prisma.flight.count(), prisma.booking.count(),
      prisma.payment.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
      prisma.booking.count({ where: { status: 'PENDING' } }),
      prisma.booking.findMany({ take: 8, orderBy: { createdAt: 'desc' }, include: { user: { select: publicUser } } }),
      prisma.flight.groupBy({ by: ['originId', 'destinationId'], _count: true, orderBy: { _count: { originId: 'desc' } }, take: 6 }),
    ]);
    return { users, flights, bookings, revenue: revenue._sum.amount ?? 0, pending, recent, routes };
  },
  async createFlight(input: z.infer<typeof flightSchema>) {
    const { fares, ...data } = input;
    return prisma.flight.create({ data: { ...data, departureTime: new Date(data.departureTime), arrivalTime: new Date(data.arrivalTime), fares: { create: fares.map(f => ({ ...f, availableSeats: f.totalSeats })) } }, include: flightInclude });
  },
  async updateFare(id: number, input: z.infer<typeof fareSchema>) {
    return serial(async tx => {
      const previous = await tx.flightFare.findUniqueOrThrow({ where: { id } });
      if (input.cabinClass !== previous.cabinClass) throw new AppError('Không thể đổi hạng vé đã tạo');
      const reserved = previous.totalSeats - previous.availableSeats;
      if (input.totalSeats < reserved) throw new AppError(`Đã có ${reserved} chỗ được giữ/đặt`);
      return tx.flightFare.update({ where: { id }, data: { ...input, availableSeats: input.totalSeats - reserved } });
    });
  },
  async flightStatus(id: number, status: string) {
    return serial(async tx => {
      const active = await tx.bookingSegment.count({ where: { fare: { flightId: id }, booking: { status: { in: ['PENDING', 'CONFIRMED'] } } } });
      if (active) throw new AppError('Chuyến có đơn đang hoạt động. Hãy xử lý các đơn trước khi đổi trạng thái.', 409);
      return tx.flight.update({ where: { id }, data: { status } });
    });
  },
  async updateAirline(id: number, input: z.infer<typeof airlineSchema>) {
    return serial(async tx => {
      if (!input.isActive) {
        const active = await tx.bookingSegment.count({ where: { fare: { flight: { airlineId: id, departureTime: { gt: new Date() } } }, booking: { status: { in: ['PENDING', 'CONFIRMED'] } } } });
        if (active) throw new AppError('Hãng còn đơn bay sắp tới đang hoạt động', 409);
      }
      return tx.airline.update({ where: { id }, data: input });
    });
  },
  async updateUser(actor: number, target: number, data: { role?: string; isActive?: boolean }) {
    if (actor === target) throw new AppError('Không thể đổi quyền hoặc khóa chính tài khoản đang dùng');
    return prisma.$transaction(async tx => {
      await tx.refreshToken.deleteMany({ where: { userId: target } });
      return tx.user.update({ where: { id: target }, data: { ...data, tokenVersion: { increment: 1 } }, select: publicUser });
    });
  },
};
