import { Prisma } from "@prisma/client";
import { AdminQuery, period } from "./validation";
const vn = ["Việt Nam", "Viet Nam", "Vietnam", "VN"];
export function flightWhere(
  q: AdminQuery,
  withDates = true,
): Prisma.FlightWhereInput {
  const and: Prisma.FlightWhereInput[] = [];
  if (q.flightId) and.push({ id: q.flightId });
  if (q.airlineId) and.push({ airlineId: q.airlineId });
  if (q.origin) and.push({ origin: { code: q.origin } });
  if (q.destination) and.push({ destination: { code: q.destination } });
  const domestic: Prisma.FlightWhereInput = {
    origin: { country: { in: vn, mode: "insensitive" } },
    destination: { country: { in: vn, mode: "insensitive" } },
  };
  if (q.region === "DOMESTIC") and.push(domestic);
  if (q.region === "INTERNATIONAL") and.push({ NOT: domestic });
  if (withDates) and.push({ departureTime: period(q) });
  if (q.departureDate)
    and.push({
      departureTime: {
        gte: new Date(q.departureDate + "T00:00:00+07:00"),
        lt: new Date(
          Date.parse(q.departureDate + "T00:00:00+07:00") + 86400000,
        ),
      },
    });
  return { AND: and };
}
export function bookingWhere(q: AdminQuery): Prisma.BookingWhereInput {
  return {
    createdAt: period(q),
    currency: q.currency,
    ...(q.customerId ? { userId: q.customerId } : {}),
    segments: { some: { fare: { flight: flightWhere(q, false) } } },
    ...(q.status ? { status: q.status } : {}),
    ...(q.paymentStatus === "UNPAID"
      ? { payment: { is: null } }
      : q.paymentStatus
        ? { payment: { is: { status: q.paymentStatus } } }
        : {}),
    ...(q.q
      ? {
          OR: [
            { reference: { contains: q.q, mode: "insensitive" } },
            { contactEmail: { contains: q.q, mode: "insensitive" } },
            { user: { fullName: { contains: q.q, mode: "insensitive" } } },
            {
              segments: {
                some: {
                  fare: {
                    flight: {
                      flightNumber: { contains: q.q, mode: "insensitive" },
                    },
                  },
                },
              },
            },
          ],
        }
      : {}),
  };
}
