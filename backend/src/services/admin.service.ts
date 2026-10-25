import { z } from 'zod';
import { prisma } from '../config/db';
import { flightSchema, fareSchema, airlineSchema } from '../validators';
import { publicUser } from '../repositories/user.repository';
import { flightInclude } from '../repositories/flight.repository';
import { serial } from './booking.service';
import { AppError } from '../utils/app-error';
import { observationData, observationInclude } from '../admin/data';

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
  async createFlight(input: z.infer<typeof flightSchema>, actorId?: number) {
    const { fares, ...data } = input;
    return prisma.$transaction(async tx=>{const flight=await tx.flight.create({ data: { ...data, departureTime: new Date(data.departureTime), arrivalTime: new Date(data.arrivalTime), fares: { create: fares.map(f => ({ ...f, availableSeats: f.totalSeats })) } }, include: flightInclude });const observed=await tx.flightFare.findMany({where:{flightId:flight.id},include:observationInclude});await tx.fareObservation.createMany({data:observed.map(f=>observationData(f))});if(actorId)await tx.adminAuditEvent.create({data:{actorId,action:'FLIGHT_CREATED',entity:'Flight',entityId:String(flight.id)}});return flight;});
  },
  async updateFare(id: number, input: z.infer<typeof fareSchema>, actorId?: number) {
    return serial(async tx => {
      const previous = await tx.flightFare.findUniqueOrThrow({ where: { id } });
      if(previous.source!=='LOCAL_DEMO')throw new AppError('Giá từ đối tác chỉ được cập nhật qua đồng bộ.',409);
      if (input.cabinClass !== previous.cabinClass) throw new AppError('Không thể đổi hạng vé đã tạo');
      const reserved = previous.totalSeats - previous.availableSeats;
      if (input.totalSeats < reserved) throw new AppError(`Đã có ${reserved} chỗ được giữ/đặt`);
      const fare=await tx.flightFare.update({ where: { id }, data: { ...input, availableSeats: input.totalSeats - reserved,priceObservedAt:new Date() },include:observationInclude });await tx.fareObservation.create({data:observationData(fare)});if(actorId)await tx.adminAuditEvent.create({data:{actorId,action:'LOCAL_FARE_UPDATED',entity:'FlightFare',entityId:String(id),metadata:{previousTotal:previous.basePrice+previous.tax,total:fare.basePrice+fare.tax}}});return fare;
    });
  },
  async flightStatus(id: number, status: string,actorId?: number) {
    return serial(async tx => {
      const current=await tx.flight.findUniqueOrThrow({where:{id}});if(current.source!=='LOCAL_DEMO')throw new AppError('Chuyến đối tác chỉ được cập nhật qua đồng bộ.',409);
      const active = await tx.bookingSegment.count({ where: { fare: { flightId: id }, booking: { status: { in: ['PENDING', 'CONFIRMED'] } } } });
      if (active) throw new AppError('Chuyến có đơn đang hoạt động. Hãy xử lý các đơn trước khi đổi trạng thái.', 409);
      const flight=await tx.flight.update({ where: { id }, data: { status } });if(actorId)await tx.adminAuditEvent.create({data:{actorId,action:'LOCAL_FLIGHT_STATUS',entity:'Flight',entityId:String(id),metadata:{status}}});return flight;
    });
  },
  async updateAirline(id: number, input: z.infer<typeof airlineSchema>,actorId?: number) {
    return serial(async tx => {
      if (!input.isActive) {
        const active = await tx.bookingSegment.count({ where: { fare: { flight: { airlineId: id, departureTime: { gt: new Date() } } }, booking: { status: { in: ['PENDING', 'CONFIRMED'] } } } });
        if (active) throw new AppError('Hãng còn đơn bay sắp tới đang hoạt động', 409);
      }
      const airline=await tx.airline.update({ where: { id }, data: input });if(actorId)await tx.adminAuditEvent.create({data:{actorId,action:'AIRLINE_UPDATED',entity:'Airline',entityId:String(id),metadata:{code:airline.code,isActive:airline.isActive}}});return airline;
    });
  },
  async updateUser(actor: number, target: number, data: { role?: string; isActive?: boolean }) {
    if (actor === target) throw new AppError('Không thể đổi quyền hoặc khóa chính tài khoản đang dùng');
    return prisma.$transaction(async tx => {
      await tx.refreshToken.deleteMany({ where: { userId: target } });
      await tx.adminAuditEvent.create({data:{actorId:actor,action:'USER_ACCESS_UPDATED',entity:'User',entityId:String(target),metadata:{...data}}});
      return tx.user.update({ where: { id: target }, data: { ...data, tokenVersion: { increment: 1 } }, select: publicUser });
    });
  },
};
