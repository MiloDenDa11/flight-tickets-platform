import { Prisma } from "@prisma/client";
export async function locallyReservedSeats(
  tx: Prisma.TransactionClient,
  fareId: number,
) {
  const segments = await tx.bookingSegment.findMany({
    where: { fareId, booking: { status: { in: ["PENDING", "CONFIRMED"] } } },
    select: {
      booking: { select: { _count: { select: { passengers: true } } } },
    },
  });
  return segments.reduce((sum, s) => sum + s.booking._count.passengers, 0);
}
export function providerInventory(ceiling: number, reserved: number) {
  return {
    providerAvailableSeats: ceiling,
    totalSeats: Math.max(1, ceiling, reserved),
    availableSeats: Math.max(0, ceiling - reserved),
  };
}
