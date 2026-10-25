import { prisma } from "../config/db";
import { AppError } from "../utils/app-error";
import {
  AdminQuery,
  bucket,
  period,
  previousPeriod,
  localDay,
} from "./validation";
import { flightWhere, bookingWhere } from "./query";

// Integer proportional allocation preserves every VND across mixed-airline return journeys.
export function allocateAmount(amount: number, weights: number[]): number[] {
  if (!weights.length) return [];
  const total = weights.reduce((s, w) => s + BigInt(w), 0n);
  if (total === 0n) return weights.map((_, i) => (i === 0 ? amount : 0));
  const parts = weights.map((w, i) => {
    const n = BigInt(amount) * BigInt(w);
    return { i, value: Number(n / total), remainder: n % total };
  });
  let left = amount - parts.reduce((s, p) => s + p.value, 0);
  const ranked = [...parts].sort((a, b) =>
    a.remainder === b.remainder
      ? a.i - b.i
      : a.remainder > b.remainder
        ? -1
        : 1,
  );
  for (const part of ranked) {
    if (!left) break;
    part.value++;
    left--;
  }
  return parts.map((p) => p.value);
}
const analyticsFlightSelect = {
  id: true,
  flightNumber: true,
  departureTime: true,
  airline: {
    select: { id: true, code: true, name: true, color: true, logoUrl: true },
  },
  origin: { select: { code: true, country: true } },
  destination: { select: { code: true, country: true } },
} as const;
const paymentSelect = {
  id: true,
  amount: true,
  status: true,
  provider: true,
  paidAt: true,
  refundedAt: true,
  booking: {
    select: {
      id: true,
      reference: true,
      currency: true,
      createdAt: true,
      _count: { select: { passengers: true } },
      segments: {
        orderBy: { sequence: "asc" as const },
        select: {
          unitPrice: true,
          sequence: true,
          fare: { select: { flight: { select: analyticsFlightSelect } } },
        },
      },
    },
  },
} as const;
function segmentMatches(
  f: {
    airline: { id: number };
    origin: { code: string; country: string };
    destination: { code: string; country: string };
    departureTime: Date;
  },
  q: AdminQuery,
) {
  const vietnam = (s: string) =>
    ["viet nam", "vietnam", "vn"].includes(
      s
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase(),
    );
  const domestic = vietnam(f.origin.country) && vietnam(f.destination.country);
  return (
    (!q.airlineId || f.airline.id === q.airlineId) &&
    (!q.origin || f.origin.code === q.origin) &&
    (!q.destination || f.destination.code === q.destination) &&
    (!q.departureDate ||
      (f.departureTime >= new Date(q.departureDate + "T00:00:00+07:00") &&
        f.departureTime <
          new Date(
            Date.parse(q.departureDate + "T00:00:00+07:00") + 86400000,
          ))) &&
    (q.region === "ALL" || (q.region === "DOMESTIC" ? domestic : !domestic))
  );
}
export async function revenueReport(q: AdminQuery) {
  const range = period(q);
  const payments = await prisma.payment.findMany({
    where: {
      status: { in: ["PAID", "REFUNDED"] },
      booking: {
        currency: q.currency,
        segments: { some: { fare: { flight: flightWhere(q, false) } } },
      },
      OR: [
        { paidAt: range },
        { refundedAt: range },
        ...(range.gte <= new Date()
          ? [{ status: "REFUNDED", refundedAt: null, paidAt: { lt: range.lt } }]
          : []),
      ],
    },
    select: paymentSelect,
    take: 50001,
  });
  if (payments.length > 50000)
    throw new AppError(
      "Quá nhiều giao dịch trong kỳ; vui lòng thu hẹp bộ lọc.",
      413,
    );
  const series = new Map<
    string,
    { date: string; gross: number; refunds: number; tickets: number }
  >();
  const today = localDay(new Date());
  for (
    let d = new Date(range.gte);
    d < range.lt && localDay(d) <= today;
    d = new Date(+d + 86400000)
  ) {
    const date = bucket(d, q.group);
    if (!series.has(date))
      series.set(date, { date, gross: 0, refunds: 0, tickets: 0 });
  }
  const airlines = new Map<
    number,
    {
      id: number;
      code: string;
      name: string;
      color: string;
      logoUrl: string | null;
      gross: number;
      refunds: number;
      tickets: number;
    }
  >();
  const details = [];
  let gross = 0,
    refunds = 0,
    tickets = 0,
    unknownRefunds = 0,
    orders = 0;
  const seen = new Set<string>();
  for (const payment of payments) {
    const segments = payment.booking.segments;
    const allocated = allocateAmount(
      payment.amount,
      segments.map((s) => s.unitPrice),
    );
    let paymentGross = 0,
      paymentRefund = 0;
    segments.forEach((segment, index) => {
      const f = segment.fare.flight;
      if (!segmentMatches(f, q)) return;
      let airline = airlines.get(f.airline.id);
      if (!airline) {
        airline = { ...f.airline, gross: 0, refunds: 0, tickets: 0 };
        airlines.set(f.airline.id, airline);
      }
      const amount = allocated[index];
      if (payment.paidAt >= range.gte && payment.paidAt < range.lt) {
        gross += amount;
        airline.gross += amount;
        paymentGross += amount;
        const sold = payment.booking._count.passengers;
        tickets += sold;
        airline.tickets += sold;
        const row = series.get(bucket(payment.paidAt, q.group));
        if (row) {
          row.gross += amount;
          row.tickets += sold;
        }
        if (!seen.has(payment.id)) {
          orders++;
          seen.add(payment.id);
        }
      }
      if (payment.status === "REFUNDED") {
        if (!payment.refundedAt) {
          unknownRefunds += amount;
        } else if (
          payment.refundedAt >= range.gte &&
          payment.refundedAt < range.lt
        ) {
          refunds += amount;
          airline.refunds += amount;
          paymentRefund += amount;
          const row = series.get(bucket(payment.refundedAt, q.group));
          if (row) row.refunds += amount;
        }
      }
    });
    if (
      (payment.paidAt >= range.gte && payment.paidAt < range.lt) ||
      (payment.refundedAt &&
        payment.refundedAt >= range.gte &&
        payment.refundedAt < range.lt)
    )
      details.push({
        id: payment.id,
        reference: payment.booking.reference,
        paidAt: payment.paidAt,
        refundedAt: payment.refundedAt,
        status: payment.status,
        provider: payment.provider,
        gross: paymentGross,
        refund: paymentRefund,
        currency: q.currency,
        flightNumbers: segments
          .filter((s) => segmentMatches(s.fare.flight, q))
          .map((s) => s.fare.flight.flightNumber)
          .join(", "),
      });
  }
  return {
    currency: q.currency,
    timeZone: "Asia/Ho_Chi_Minh",
    start: q.start,
    end: q.end,
    gross,
    refunds,
    net: unknownRefunds ? null : gross - refunds,
    unknownRefunds,
    tickets,
    orders,
    averageOrder: orders ? Math.round(gross / orders) : 0,
    averageTicket: tickets ? Math.round(gross / tickets) : 0,
    series: [...series.values()],
    byAirline: [...airlines.values()].sort((a, b) => b.gross - a.gross),
    transactions: details.sort((a, b) => +b.paidAt - +a.paidAt),
    source: "CONFIRMED_DATABASE_PAYMENTS",
    note: "Gồm khoản đã thu của cả giao dịch được hoàn sau đó. Hoàn tiền nhóm theo ngày hoàn; giao dịch MOCK vẫn được ghi rõ là demo.",
  };
}
export async function overview(q: AdminQuery) {
  const [
    report,
    previous,
    flightCounts,
    successful,
    pending,
    cancelled,
    activeAirlines,
    customers,
    upcoming,
    routeGroups,
  ] = await Promise.all([
    revenueReport(q),
    revenueReport(previousPeriod(q)),
    prisma.$transaction(
      [
        prisma.flight.count({ where: flightWhere(q) }),
        prisma.flight.count({
          where: {
            AND: [flightWhere(q), flightWhere({ ...q, region: "DOMESTIC" })],
          },
        }),
      ],
      { isolationLevel: "RepeatableRead" },
    ),
    prisma.booking.count({
      where: {
        ...bookingWhere({ ...q, status: "CONFIRMED" }),
        status: "CONFIRMED",
      },
    }),
    prisma.booking.count({
      where: {
        ...bookingWhere({ ...q, status: "PENDING" }),
        status: "PENDING",
      },
    }),
    prisma.booking.count({
      where: {
        ...bookingWhere({ ...q, status: "CANCELLED" }),
        status: "CANCELLED",
      },
    }),
    prisma.airline.count({
      where: { isActive: true, ...(q.airlineId ? { id: q.airlineId } : {}) },
    }),
    prisma.user.count({ where: { role: "USER" } }),
    prisma.flight.findMany({
      where: {
        AND: [
          flightWhere(q),
          { departureTime: { gte: new Date() }, status: "SCHEDULED" },
        ],
      },
      include: { airline: true, origin: true, destination: true },
      orderBy: { departureTime: "asc" },
      take: 6,
    }),
    prisma.flight.groupBy({
      by: ["originId", "destinationId"],
      where: flightWhere(q),
      _count: true,
      orderBy: { _count: { originId: "desc" } },
      take: 8,
    }),
  ]);
  const [flights, domesticFlights] = flightCounts;
  const airports = await prisma.airport.findMany({
    where: {
      id: {
        in: [
          ...new Set(routeGroups.flatMap((r) => [r.originId, r.destinationId])),
        ],
      },
    },
    select: { id: true, code: true, city: true, country: true },
  });
  const routes = routeGroups.map((r) => ({
    origin: airports.find((a) => a.id === r.originId),
    destination: airports.find((a) => a.id === r.destinationId),
    count: r._count,
  }));
  return {
    generatedAt: new Date(),
    source: "DATABASE",
    regions: {
      domestic: domesticFlights,
      international: flights - domesticFlights,
    },
    mockPayments: report.transactions.some((t) => t.provider === "MOCK"),
    kpis: {
      flights,
      tickets: report.tickets,
      revenue: report.gross,
      successful,
      pending,
      cancelled,
      refunds: report.refunds,
      net: report.net,
      averageFare: report.averageTicket,
      activeAirlines,
      customers,
    },
    comparison: {
      revenue:
        previous.gross > 0
          ? Math.round(
              ((report.gross - previous.gross) / previous.gross) * 1000,
            ) / 10
          : null,
      tickets:
        previous.tickets > 0
          ? Math.round(
              ((report.tickets - previous.tickets) / previous.tickets) * 1000,
            ) / 10
          : null,
    },
    report: { ...report, transactions: report.transactions.slice(0, 6) },
    upcoming,
    routes,
  };
}
