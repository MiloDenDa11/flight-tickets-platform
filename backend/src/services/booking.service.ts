import { createHash, randomBytes, randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { bookingSchema } from '../validators';
import { bookingInclude, bookingRepository } from '../repositories/booking.repository';
import { AppError } from '../utils/app-error';

type Tx = Prisma.TransactionClient;
// Retry serializable conflicts, including concurrent booking/payment/expiry requests.
export async function serial<T>(run: (tx: Tx) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await prisma.$transaction(run, { isolationLevel: 'Serializable', timeout: 15000 }); }
    catch (e) { if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2034' && attempt < 3) continue; throw e; }
  }
}
async function restore(tx: Tx, booking: { segments: { fareId: number }[]; passengers: unknown[] }) {
  for (const segment of [...booking.segments].sort((a, b) => a.fareId - b.fareId)) {
    await tx.flightFare.update({ where: { id: segment.fareId }, data: { availableSeats: { increment: booking.passengers.length } } });
  }
}
export async function releaseExpired() {
  const rows = await prisma.booking.findMany({ where: { status: 'PENDING', expiresAt: { lte: new Date() } }, select: { id: true }, take: 100 });
  for (const row of rows) await serial(async tx => {
    const booking = await tx.booking.findUnique({ where: { id: row.id }, include: { segments: true, passengers: true } });
    if (!booking || booking.status !== 'PENDING' || booking.expiresAt > new Date()) return;
    const won = await tx.booking.updateMany({ where: { id: row.id, status: 'PENDING', expiresAt: { lte: new Date() } }, data: { status: 'EXPIRED' } });
    if (won.count) await restore(tx, booking);
  });
}
export const bookingService = {
  async create(userId: number, input: z.infer<typeof bookingSchema>) {
    const requestHash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
    const existing = await prisma.booking.findUnique({ where: { userId_idempotencyKey: { userId, idempotencyKey: input.idempotencyKey } }, include: bookingInclude });
    if (existing) { if (existing.requestHash !== requestHash) throw new AppError('Mã yêu cầu đã được dùng cho nội dung khác', 409); return existing; }
    await releaseExpired();
    return serial(async tx => {
      const duplicate = await tx.booking.findUnique({ where: { userId_idempotencyKey: { userId, idempotencyKey: input.idempotencyKey } }, include: bookingInclude });
      if (duplicate) { if (duplicate.requestHash !== requestHash) throw new AppError('Nội dung yêu cầu không khớp', 409); return duplicate; }
      const fares = await tx.flightFare.findMany({ where: { id: { in: input.fareIds } }, include: { flight: { include: { airline: true } } } });
      if (fares.length !== input.fareIds.length) throw new AppError('Hạng vé không tồn tại', 404);
      const ordered = input.fareIds.map(fid => fares.find(f => f.id === fid)!);
      if (new Set(fares.map(f => f.flightId)).size !== fares.length) throw new AppError('Không được đặt hai hạng vé trên cùng chuyến bay');
      if (ordered.length === 2) {
        const a = ordered[0].flight, b = ordered[1].flight;
        if (a.originId !== b.destinationId || a.destinationId !== b.originId || +b.departureTime < +a.arrivalTime + 3600000) throw new AppError('Chuyến về không hợp lệ hoặc quá sát chuyến đi');
      }
      for (const fare of [...fares].sort((a, b) => a.id - b.id)) {
        if (fare.flight.status !== 'SCHEDULED' || !fare.flight.airline.isActive || +fare.flight.departureTime < Date.now() + 3600000) throw new AppError('Chuyến bay không còn mở bán', 409);
        const won = await tx.flightFare.updateMany({ where: { id: fare.id, availableSeats: { gte: input.passengers.length } }, data: { availableSeats: { decrement: input.passengers.length } } });
        if (won.count !== 1) throw new AppError('Không đủ ghế trống. Vui lòng chọn chuyến khác.', 409);
      }
      const totalAmount = fares.reduce((sum, f) => sum + f.basePrice + f.tax, 0) * input.passengers.length;
      if (!Number.isSafeInteger(totalAmount) || totalAmount > 2147483647) throw new AppError('Giá trị đơn vượt giới hạn');
      return tx.booking.create({ data: {
        userId, reference: randomBytes(5).toString('hex').toUpperCase(), idempotencyKey: input.idempotencyKey, requestHash,
        contactEmail: input.contactEmail, contactPhone: input.contactPhone, totalAmount,
        expiresAt: new Date(Date.now() + env.HOLD_MINUTES * 60000),
        passengers: { create: input.passengers.map(p => ({ ...p, dateOfBirth: new Date(p.dateOfBirth), documentNumber: p.documentNumber.toUpperCase() })) },
        segments: { create: ordered.map((f, sequence) => ({ fareId: f.id, sequence, unitPrice: f.basePrice + f.tax, cabinClass: f.cabinClass, baggageKg: f.baggageKg, cabinBaggageKg: f.cabinBaggageKg, refundable: f.refundable })) },
      }, include: bookingInclude });
    });
  },
  async get(id: string, userId: number) {
    await releaseExpired();
    const booking = await bookingRepository.find(id, userId);
    if (!booking) throw new AppError('Không tìm thấy đơn đặt vé', 404);
    return booking;
  },
  async pay(id: string, userId: number) {
    if (env.ENABLE_MOCK_PAYMENTS !== 'true') throw new AppError('Thanh toán mô phỏng đã tắt. Chưa cấu hình nhà cung cấp thanh toán.', 503);
    await releaseExpired();
    return serial(async tx => {
      const b = await tx.booking.findFirst({ where: { id, userId }, include: bookingInclude });
      if (!b) throw new AppError('Không tìm thấy đơn', 404);
      if (b.status === 'CONFIRMED') return b;
      if (b.status !== 'PENDING' || b.expiresAt <= new Date()) throw new AppError('Đơn đã hết hạn hoặc không thể thanh toán', 409);
      if (b.segments.some(s => s.fare.flight.status !== 'SCHEDULED' || !s.fare.flight.airline.isActive || s.fare.flight.departureTime <= new Date())) throw new AppError('Chuyến bay đã thay đổi trạng thái. Vui lòng hủy đơn.', 409);
      const won = await tx.booking.updateMany({ where: { id, status: 'PENDING', expiresAt: { gt: new Date() } }, data: { status: 'CONFIRMED' } });
      if (won.count !== 1) throw new AppError('Trạng thái đơn đã thay đổi', 409);
      await tx.payment.create({ data: { bookingId: id, transactionId: `MOCK-${randomUUID()}`, amount: b.totalAmount } });
      await tx.ticket.createMany({ data: b.passengers.flatMap(p => b.segments.map(s => ({ passengerId: p.id, segmentId: s.id, number: `FT-${randomBytes(10).toString('hex').toUpperCase()}` }))) });
      return tx.booking.findUniqueOrThrow({ where: { id }, include: bookingInclude });
    });
  },
  async cancel(id: string, userId: number) {
    await releaseExpired();
    return serial(async tx => {
      const b = await tx.booking.findFirst({ where: { id, userId }, include: bookingInclude });
      if (!b) throw new AppError('Không tìm thấy đơn', 404);
      if (['CANCELLED', 'EXPIRED'].includes(b.status)) return b;
      if (b.status === 'CONFIRMED' && b.segments.some(s => !s.refundable || s.fare.flight.departureTime <= new Date())) throw new AppError('Vé này không đủ điều kiện hủy/hoàn tiền', 409);
      const won = await tx.booking.updateMany({ where: { id, status: b.status }, data: { status: 'CANCELLED' } });
      if (won.count !== 1) throw new AppError('Trạng thái đơn đã thay đổi', 409);
      await restore(tx, b);
      await tx.ticket.updateMany({ where: { segmentId: { in: b.segments.map(s => s.id) } }, data: { status: 'VOID' } });
      if (b.payment) await tx.payment.update({ where: { bookingId: id }, data: { status: 'REFUNDED' } });
      return tx.booking.findUniqueOrThrow({ where: { id }, include: bookingInclude });
    });
  },
};
