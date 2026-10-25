import { prisma } from "../config/db";
import { env } from "../config/env";
import { serial } from "../services/booking.service";
import { AppError } from "../utils/app-error";
import {
  flightDataProvider,
  FlightDataProvider,
  SyncKind,
  scheduleRecord,
  statusRecord,
  fareRecord,
  ProviderRateLimit,
} from "./provider";
import { audit, observationData, observationInclude } from "./data";
import { locallyReservedSeats, providerInventory } from "./inventory";

const kinds: SyncKind[] = ["schedule", "status", "fares"];
export async function syncStatus() {
  const [states, runs] = await Promise.all([
    prisma.providerSyncState.findMany(),
    prisma.providerSyncRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 15,
    }),
  ]);
  return {
    provider: env.FLIGHT_PROVIDER_NAME,
    automatic: env.FLIGHT_SYNC_ENABLED === "true",
    intervalSeconds: env.FLIGHT_SYNC_INTERVAL_SECONDS,
    pollSeconds: 30,
    kinds: kinds.map((kind) => ({
      kind,
      configured: flightDataProvider.configured(kind),
      ...states.find((s) => s.kind === kind),
    })),
    runs,
    sourceNotice:
      "Polling database không phải radar trực tiếp. Trạng thái khai thác chỉ có khi API đối tác thực sự cung cấp.",
  };
}
export async function syncNow(
  kind: SyncKind,
  actor?: number,
  provider: FlightDataProvider = flightDataProvider,
  onStarted?: (run: { id: string; status: string }) => void,
) {
  if (!provider.configured(kind))
    throw new AppError("Chưa cấu hình API cho nguồn này.", 409);
  const state = await prisma.providerSyncState.upsert({
    where: { kind },
    create: { kind },
    update: {},
  });
  if (state.nextAllowedAt && state.nextAllowedAt > new Date())
    throw new AppError(
      "Nhà cung cấp đang giới hạn tốc độ; vui lòng chờ thời điểm cho phép tiếp theo.",
      429,
    );
  const now = new Date();
  const claim = await prisma.providerSyncState.updateMany({
    where: {
      kind,
      AND: [
        { OR: [{ runningUntil: null }, { runningUntil: { lt: now } }] },
        { OR: [{ nextAllowedAt: null }, { nextAllowedAt: { lte: now } }] },
      ],
    },
    data: { runningUntil: new Date(+now + 180000), lastAttemptAt: now },
  });
  if (!claim.count)
    throw new AppError("Nguồn này đang đồng bộ; vui lòng chờ.", 409);
  await prisma.providerSyncRun.updateMany({
    where: { kind, status: "RUNNING", startedAt: { lt: now } },
    data: {
      status: "FAILED",
      errorCode: "WORKER_INTERRUPTED",
      finishedAt: now,
    },
  });
  const run = await prisma.providerSyncRun.create({
    data: { kind, provider: provider.name, actorId: actor },
  });
  onStarted?.(run);
  let processed = 0,
    skipped = 0,
    invalid = 0;
  try {
    const data = await provider.read(kind);
    const [airlineRows, airportRows] =
      kind === "schedule"
        ? await Promise.all([
            prisma.airline.findMany({ select: { id: true, code: true } }),
            prisma.airport.findMany({ select: { id: true, code: true } }),
          ])
        : [[], []];
    const airlineMap = new Map(airlineRows.map((a) => [a.code, a]));
    const airportMap = new Map(airportRows.map((a) => [a.code, a]));
    let heartbeat = Date.now();
    for (const raw of data) {
      if (Date.now() - heartbeat > 30000) {
        const lease = await prisma.providerSyncState.updateMany({
          where: { kind, lastAttemptAt: now },
          data: { runningUntil: new Date(Date.now() + 180000) },
        });
        if (!lease.count) throw new AppError("LEASE_LOST", 409);
        heartbeat = Date.now();
      }
      try {
        if (kind === "schedule") {
          const parsed = scheduleRecord.safeParse(raw);
          if (!parsed.success) {
            skipped++;
            invalid++;
            continue;
          }
          const item = parsed.data;
          const airline = airlineMap.get(item.airlineCode),
            origin = airportMap.get(item.origin),
            destination = airportMap.get(item.destination);
          if (!airline || !origin || !destination) {
            skipped++;
            invalid++;
            continue;
          }
          await serial(async (tx) => {
            const existing = await tx.flight.findUnique({
              where: {
                source_externalId: {
                  source: provider.name,
                  externalId: item.externalId,
                },
              },
            });
            if (existing) {
              if (
                existing.airlineId !== airline.id ||
                existing.originId !== origin.id ||
                existing.destinationId !== destination.id ||
                existing.flightNumber !== item.flightNumber
              )
                throw new AppError("PROVIDER_IDENTITY_CHANGED", 409);
              await tx.flight.update({
                where: { id: existing.id },
                data: {
                  departureTime: new Date(item.departureTime),
                  arrivalTime: new Date(item.arrivalTime),
                  aircraft: item.aircraft,
                  scheduleObservedAt: now,
                },
              });
            } else {
              const collision = await tx.flight.findUnique({
                where: {
                  flightNumber_departureTime: {
                    flightNumber: item.flightNumber,
                    departureTime: new Date(item.departureTime),
                  },
                },
              });
              if (collision) throw new AppError("LOCAL_FLIGHT_COLLISION", 409);
              await tx.flight.create({
                data: {
                  airlineId: airline.id,
                  originId: origin.id,
                  destinationId: destination.id,
                  flightNumber: item.flightNumber,
                  aircraft: item.aircraft,
                  departureTime: new Date(item.departureTime),
                  arrivalTime: new Date(item.arrivalTime),
                  source: provider.name,
                  externalId: item.externalId,
                  scheduleObservedAt: now,
                },
              });
            }
          });
        } else if (kind === "status") {
          const parsed = statusRecord.safeParse(raw);
          if (!parsed.success) {
            skipped++;
            invalid++;
            continue;
          }
          const item = parsed.data;
          const updated = await prisma.flight.updateMany({
            where: {
              source: provider.name,
              externalId: item.externalFlightId,
              OR: [
                { statusObservedAt: null },
                { statusObservedAt: { lt: new Date(item.observedAt) } },
              ],
            },
            data: {
              operationalStatus: item.status,
              actualDepartureTime:
                item.actualDepartureTime === undefined
                  ? undefined
                  : item.actualDepartureTime === null
                    ? null
                    : new Date(item.actualDepartureTime),
              actualArrivalTime:
                item.actualArrivalTime === undefined
                  ? undefined
                  : item.actualArrivalTime === null
                    ? null
                    : new Date(item.actualArrivalTime),
              statusObservedAt: new Date(item.observedAt),
              statusSource: provider.name,
            },
          });
          if (!updated.count) {
            skipped++;
            continue;
          }
        } else {
          const parsed = fareRecord.safeParse(raw);
          if (!parsed.success) {
            skipped++;
            invalid++;
            continue;
          }
          const item = parsed.data;
          const flight = await prisma.flight.findUnique({
            where: {
              source_externalId: {
                source: provider.name,
                externalId: item.externalFlightId,
              },
            },
          });
          if (!flight) {
            skipped++;
            invalid++;
            continue;
          }
          const accepted = await serial(async (tx) => {
            const previous = await tx.flightFare.findUnique({
              where: {
                flightId_cabinClass: {
                  flightId: flight.id,
                  cabinClass: item.cabinClass,
                },
              },
            });
            if (
              previous &&
              previous.priceObservedAt >= new Date(item.observedAt)
            )
              return false;
            const reserved = previous
              ? await locallyReservedSeats(tx, previous.id)
              : 0;
            // Provider available seats are an external ceiling; preserve locally held/booked inventory.
            const fields = {
              basePrice: item.basePrice,
              tax: item.tax,
              baggageKg: item.baggageKg,
              cabinBaggageKg: item.cabinBaggageKg,
              refundable: item.refundable,
              ...providerInventory(item.availableSeats, reserved),
              source: provider.name,
              priceObservedAt: new Date(item.observedAt),
            };
            const fare = await tx.flightFare.upsert({
              where: {
                flightId_cabinClass: {
                  flightId: flight.id,
                  cabinClass: item.cabinClass,
                },
              },
              create: {
                flightId: flight.id,
                cabinClass: item.cabinClass,
                ...fields,
              },
              update: fields,
              include: observationInclude,
            });
            await tx.fareObservation.create({
              data: observationData(fare, new Date(item.observedAt)),
            });
            return true;
          });
          if (!accepted) {
            skipped++;
            continue;
          }
        }
        processed++;
      } catch (e) {
        if (
          e instanceof AppError ||
          (typeof e === "object" &&
            e !== null &&
            "code" in e &&
            String(e.code).startsWith("P20"))
        ) {
          skipped++;
          invalid++;
          continue;
        }
        throw e;
      }
    }
    if (data.length > 0 && invalid === data.length)
      throw new AppError("NO_VALID_PROVIDER_RECORDS", 502);
    const status = invalid ? "PARTIAL" : "SUCCEEDED";
    const result = await prisma.providerSyncRun.update({
      where: { id: run.id },
      data: { status, processed, skipped, finishedAt: new Date() },
    });
    await prisma.providerSyncState.updateMany({
      where: { kind, lastAttemptAt: now },
      data: {
        runningUntil: null,
        nextAllowedAt: null,
        lastSuccessAt: new Date(),
        lastError: invalid ? "SOME_RECORDS_SKIPPED" : null,
      },
    });
    if (actor)
      await audit(actor, "PROVIDER_SYNC", "SyncRun", run.id, {
        kind,
        processed,
        skipped,
      });
    return result;
  } catch (error) {
    const errorCode =
      error instanceof AppError ? error.message : "PROVIDER_SYNC_FAILED";
    await prisma.providerSyncRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        processed,
        skipped,
        errorCode,
        finishedAt: new Date(),
      },
    });
    await prisma.providerSyncState.updateMany({
      where: { kind, lastAttemptAt: now },
      data: {
        runningUntil: null,
        lastError: errorCode,
        ...(error instanceof ProviderRateLimit
          ? { nextAllowedAt: error.retryAt }
          : {}),
      },
    });
    throw new AppError(
      `Đồng bộ không thành công (${errorCode}).`,
      error instanceof ProviderRateLimit ? 429 : 502,
    );
  }
}
export function queueSync(kind: SyncKind, actor: number) {
  return new Promise<{ id: string; status: string }>((resolve, reject) => {
    let started = false;
    void syncNow(kind, actor, flightDataProvider, (run) => {
      started = true;
      resolve(run);
    }).catch((error) => {
      if (!started) reject(error);
      else console.warn("Manual provider sync failed:", kind);
    });
  });
}
export function startProviderSync() {
  let busy = false;
  const tick = async () => {
    if (busy || env.FLIGHT_SYNC_ENABLED !== "true") return;
    busy = true;
    try {
      for (const kind of kinds) {
        if (!flightDataProvider.configured(kind)) continue;
        const state = await prisma.providerSyncState.findUnique({
          where: { kind },
        });
        if (
          state?.lastAttemptAt &&
          Date.now() - +state.lastAttemptAt <
            env.FLIGHT_SYNC_INTERVAL_SECONDS * 1000
        )
          continue;
        try {
          await syncNow(kind);
        } catch {
          console.warn("Provider sync attempt failed:", kind);
        }
      }
    } finally {
      busy = false;
    }
  };
  const timer = setInterval(() => {
    void tick().catch(() => console.warn("Provider scheduler unavailable"));
  }, 30000);
  timer.unref();
  return () => clearInterval(timer);
}
