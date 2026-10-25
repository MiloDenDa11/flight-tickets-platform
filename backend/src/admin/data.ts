import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { AdminQuery, bucket, period } from "./validation";
import { flightWhere, bookingWhere } from "./query";
import { flightInclude } from "../repositories/flight.repository";
import { bookingInclude } from "../repositories/booking.repository";
import { publicUser } from "../repositories/user.repository";
import { adminBookingDto, maskEmail, maskPhone } from "./privacy";
import { AppError } from "../utils/app-error";

export function pagination(q: AdminQuery, total: number) {
  return {
    page: q.page,
    pageSize: q.pageSize,
    total,
    pages: Math.max(1, Math.ceil(total / q.pageSize)),
  };
}
export async function audit(
  actorId: number,
  action: string,
  entity: string,
  entityId?: string,
  metadata: Prisma.InputJsonValue = {},
) {
  await prisma.adminAuditEvent.create({
    data: { actorId, action, entity, entityId, metadata },
  });
}
export async function monitoring(q: AdminQuery) {
  const where: Prisma.FlightWhereInput = {
    AND: [
      flightWhere(q),
      ...(q.status
        ? [{ OR: [{ operationalStatus: q.status }, { status: q.status }] }]
        : []),
      ...(q.q
        ? [
            {
              OR: [
                {
                  flightNumber: { contains: q.q, mode: "insensitive" as const },
                },
                {
                  airline: {
                    name: { contains: q.q, mode: "insensitive" as const },
                  },
                },
                {
                  origin: {
                    code: { contains: q.q, mode: "insensitive" as const },
                  },
                },
                {
                  destination: {
                    code: { contains: q.q, mode: "insensitive" as const },
                  },
                },
              ],
            },
          ]
        : []),
    ],
  };
  const [items, total] = await Promise.all([
    prisma.flight.findMany({
      where,
      include: flightInclude,
      orderBy:
        q.order === "FLIGHT"
          ? { flightNumber: q.sort }
          : { departureTime: q.sort },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    prisma.flight.count({ where }),
  ]);
  return {
    items,
    pagination: pagination(q, total),
    generatedAt: new Date(),
    notice:
      "Lịch xuất bản và trạng thái khai thác là hai nguồn riêng. Không có statusObservedAt nghĩa là chưa có dữ liệu khai thác thực tế.",
  };
}
export async function bookings(q: AdminQuery) {
  const where = bookingWhere(q);
  const [items, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: { ...bookingInclude, user: { select: publicUser } },
      orderBy:
        q.order === "AMOUNT" ? { totalAmount: q.sort } : { createdAt: q.sort },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    prisma.booking.count({ where }),
  ]);
  return {
    items: items.map((b) => adminBookingDto(b)),
    pagination: pagination(q, total),
  };
}
export async function bookingDetail(id: string, actor: number) {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id },
    include: { ...bookingInclude, user: { select: publicUser } },
  });
  await audit(actor, "BOOKING_CONTACT_VIEW", "Booking", id);
  return adminBookingDto(booking, true);
}
export async function customers(q: AdminQuery) {
  const where: Prisma.UserWhereInput = {
    ...(q.status === "ACTIVE"
      ? { isActive: true }
      : q.status === "INACTIVE"
        ? { isActive: false }
        : {}),
    ...(q.q
      ? {
          OR: [
            { fullName: { contains: q.q, mode: "insensitive" } },
            { email: { contains: q.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { ...publicUser, _count: { select: { bookings: true } } },
      orderBy:
        q.order === "NAME" ? { fullName: q.sort } : { createdAt: q.sort },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    prisma.user.count({ where }),
  ]);
  return {
    items: items.map((u) => ({
      ...u,
      email: maskEmail(u.email),
      phone: u.phone ? maskPhone(u.phone) : u.phone,
    })),
    pagination: pagination(q, total),
  };
}
export async function airlines(q: AdminQuery) {
  const where: Prisma.AirlineWhereInput = {
    ...(q.status === "ACTIVE"
      ? { isActive: true }
      : q.status === "INACTIVE"
        ? { isActive: false }
        : {}),
    ...(q.q
      ? {
          OR: [
            { name: { contains: q.q, mode: "insensitive" } },
            { code: { contains: q.q, mode: "insensitive" } },
            { country: { contains: q.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.airline.findMany({
      where,
      include: { _count: { select: { flights: true } } },
      orderBy: { name: q.sort },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    prisma.airline.count({ where }),
  ]);
  return { items, pagination: pagination(q, total) };
}
export const observationInclude = {
  flight: { include: { airline: true, origin: true, destination: true } },
} satisfies Prisma.FlightFareInclude;
export type ObservedFare = Prisma.FlightFareGetPayload<{
  include: typeof observationInclude;
}>;
export function observationData(
  f: ObservedFare,
  recordedAt = new Date(),
): Prisma.FareObservationUncheckedCreateInput {
  return {
    fareId: f.id,
    flightId: f.flightId,
    airlineId: f.flight.airlineId,
    airlineCode: f.flight.airline.code,
    airlineName: f.flight.airline.name,
    flightNumber: f.flight.flightNumber,
    originCode: f.flight.origin.code,
    destinationCode: f.flight.destination.code,
    originCountry: f.flight.origin.country,
    destinationCountry: f.flight.destination.country,
    departureTime: f.flight.departureTime,
    cabinClass: f.cabinClass,
    basePrice: f.basePrice,
    tax: f.tax,
    totalPrice: f.basePrice + f.tax,
    currency: "VND",
    source: f.source,
    recordedAt,
  };
}
export async function fareAnalytics(q: AdminQuery) {
  const where: Prisma.FlightFareWhereInput = {
    flight: flightWhere(q, false),
    ...(q.fareId ? { id: q.fareId } : {}),
    ...(q.cabinClass ? { cabinClass: q.cabinClass } : {}),
    ...(q.passengers ? { availableSeats: { gte: q.passengers } } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.flightFare.findMany({
      where,
      include: observationInclude,
      orderBy: { flight: { departureTime: q.sort } },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    prisma.flightFare.count({ where }),
  ]);
  const [observed, prior] = await Promise.all([
    prisma.fareObservation.findMany({
      where: {
        recordedAt: period(q),
        fare: { is: where },
        fareId: { in: items.map((f) => f.id) },
        ...(q.cabinClass ? { cabinClass: q.cabinClass } : {}),
        ...(q.airlineId ? { airlineId: q.airlineId } : {}),
        ...(q.origin ? { originCode: q.origin } : {}),
        ...(q.destination ? { destinationCode: q.destination } : {}),
        currency: q.currency,
      },
      orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
      take: 50001,
    }),
    items.length
      ? prisma.$queryRaw<
          { fare_id: number; total_price: number }[]
        >`SELECT DISTINCT ON (o.fare_id) o.fare_id,o.total_price FROM fare_observations o JOIN flight_fares f ON f.id=o.fare_id WHERE o.fare_id IN (${Prisma.join(items.map((f) => f.id))}) AND o.recorded_at<f.price_observed_at AND o.currency=${q.currency} ORDER BY o.fare_id,o.recorded_at DESC,o.id DESC`
      : Promise.resolve([]),
  ]);
  if (observed.length > 50000)
    throw new AppError(
      "Lịch sử giá quá lớn; chọn kỳ ngắn hơn hoặc một hạng vé cụ thể.",
      413,
    );
  const series = new Map<
    string,
    { date: string; sum: number; count: number; min: number; max: number }
  >();
  for (const o of observed) {
    const date = bucket(o.recordedAt, q.group),
      row = series.get(date) ?? {
        date,
        sum: 0,
        count: 0,
        min: o.totalPrice,
        max: o.totalPrice,
      };
    row.sum += o.totalPrice;
    row.count++;
    row.min = Math.min(row.min, o.totalPrice);
    row.max = Math.max(row.max, o.totalPrice);
    series.set(date, row);
  }
  return {
    items: items.map((f) => {
      const points = observed.filter((o) => o.fareId === f.id),
        previous = prior.find((p) => p.fare_id === f.id)?.total_price;
      return {
        ...f,
        historyCount: points.length,
        previousPrice: previous ?? null,
        minimumPrice: points.length
          ? Math.min(...points.map((p) => p.totalPrice))
          : null,
        averagePrice: points.length
          ? Math.round(
              points.reduce((s, p) => s + p.totalPrice, 0) / points.length,
            )
          : null,
        changePercent: previous
          ? Math.round(((f.basePrice + f.tax - previous) / previous) * 1000) /
            10
          : null,
      };
    }),
    pagination: pagination(q, total),
    series: [...series.values()]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((p) => ({
        date: p.date,
        average: Math.round(p.sum / p.count),
        min: p.min,
        max: p.max,
        count: p.count,
      })),
    observations: observed.slice(0, 200),
    totalObservations: observed.length,
    currency: q.currency,
    source: "RECORDED_DATABASE_OBSERVATIONS",
    notice:
      "Lịch sử bắt đầu từ lần quan sát thực tế đầu tiên. Không nội suy giá cho ngày chưa ghi nhận.",
  };
}
export async function quickSearch(query: string, actor: number) {
  if (query.length < 2) return { flights: [], bookings: [], airlines: [] };
  const [flights, bookings, airlines] = await Promise.all([
    prisma.flight.findMany({
      where: { flightNumber: { contains: query, mode: "insensitive" } },
      select: {
        id: true,
        flightNumber: true,
        departureTime: true,
        origin: { select: { code: true } },
        destination: { select: { code: true } },
      },
      take: 5,
      orderBy: { departureTime: "desc" },
    }),
    prisma.booking.findMany({
      where: {
        OR: [
          { reference: { contains: query, mode: "insensitive" } },
          { contactEmail: { contains: query, mode: "insensitive" } },
          { user: { fullName: { contains: query, mode: "insensitive" } } },
        ],
      },
      select: {
        id: true,
        reference: true,
        user: { select: { fullName: true } },
      },
      take: 5,
    }),
    prisma.airline.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { code: { contains: query, mode: "insensitive" } },
        ],
      },
      select: { id: true, code: true, name: true },
      take: 5,
    }),
  ]);
  await audit(actor, "ADMIN_SEARCH", "Search", undefined, {
    resultCount: flights.length + bookings.length + airlines.length,
  });
  return { flights, bookings, airlines };
}
