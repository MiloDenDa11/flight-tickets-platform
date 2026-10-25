import { z } from "zod";
import { env } from "../config/env";
import { AppError } from "../utils/app-error";
export const syncKind = z.enum(["schedule", "status", "fares"]);
export type SyncKind = z.infer<typeof syncKind>;
const timestamp = z.string().datetime({ offset: true });
const key = z.string().trim().min(1).max(150);
const code = z.string().regex(/^[A-Z]{3}$/);
export const scheduleRecord = z
  .object({
    externalId: key,
    airlineCode: z.string().regex(/^[A-Z0-9]{2,3}$/),
    flightNumber: z.string().regex(/^[A-Z0-9]{2,3}\d{1,4}$/),
    origin: code,
    destination: code,
    departureTime: timestamp,
    arrivalTime: timestamp,
    aircraft: z.string().min(2).max(60).default("Not supplied"),
  })
  .refine(
    (v) =>
      v.origin !== v.destination &&
      Date.parse(v.arrivalTime) > Date.parse(v.departureTime),
    "Invalid schedule",
  );
export const statusRecord = z
  .object({
    externalFlightId: key,
    status: z.enum([
      "ON_TIME",
      "DELAYED",
      "DEPARTED",
      "LANDED",
      "CANCELLED",
      "DIVERTED",
    ]),
    actualDepartureTime: timestamp.nullable().optional(),
    actualArrivalTime: timestamp.nullable().optional(),
    observedAt: timestamp,
  })
  .refine(
    (v) => Date.parse(v.observedAt) <= Date.now() + 300000,
    "Future observation",
  )
  .refine(
    (v) =>
      [v.actualDepartureTime, v.actualArrivalTime].every(
        (value) =>
          !value || Date.parse(value) <= Date.parse(v.observedAt) + 300000,
      ) &&
      (!v.actualDepartureTime ||
        !v.actualArrivalTime ||
        Date.parse(v.actualArrivalTime) >= Date.parse(v.actualDepartureTime)),
    "Invalid actual flight times",
  );
export const fareRecord = z
  .object({
    externalFlightId: key,
    cabinClass: z.enum(["ECONOMY", "PREMIUM", "BUSINESS"]),
    basePrice: z.number().int().min(0).max(100000000),
    tax: z.number().int().min(0).max(10000000),
    currency: z.literal("VND"),
    availableSeats: z.number().int().min(0).max(600),
    baggageKg: z.number().int().min(0).max(60),
    cabinBaggageKg: z.number().int().min(0).max(20),
    refundable: z.boolean(),
    observedAt: timestamp,
  })
  .refine(
    (v) => Date.parse(v.observedAt) <= Date.now() + 300000,
    "Future observation",
  );
export interface FlightDataProvider {
  name: string;
  configured(kind: SyncKind): boolean;
  read(kind: SyncKind): Promise<unknown[]>;
}
export class ProviderRateLimit extends AppError {
  constructor(public readonly retryAt: Date) {
    super("PROVIDER_RATE_LIMITED", 429);
  }
}
async function boundedText(response: globalThis.Response) {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 5 * 1024 * 1024) {
        await reader.cancel();
        throw new AppError("PAYLOAD_TOO_LARGE", 502);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks).toString("utf8");
}
function endpoint(kind: SyncKind) {
  return {
    schedule: env.FLIGHT_SCHEDULE_URL,
    status: env.FLIGHT_STATUS_URL,
    fares: env.FLIGHT_FARES_URL,
  }[kind];
}
export class HttpFlightDataProvider implements FlightDataProvider {
  name = env.FLIGHT_PROVIDER_NAME;
  configured(kind: SyncKind) {
    return Boolean(endpoint(kind));
  }
  async read(kind: SyncKind): Promise<unknown[]> {
    if (!this.configured(kind))
      throw new AppError("Nguồn dữ liệu chưa được cấu hình.", 409);
    let finalCode = "CONNECTION_FAILED";
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(endpoint(kind), {
          headers: {
            Accept: "application/json",
            ...(env.FLIGHT_PROVIDER_API_KEY
              ? { Authorization: `Bearer ${env.FLIGHT_PROVIDER_API_KEY}` }
              : {}),
          },
          signal: AbortSignal.timeout(env.FLIGHT_PROVIDER_TIMEOUT_MS),
          redirect: "error",
        });
        if (!response.ok) {
          await response.body?.cancel();
          finalCode = `HTTP_${response.status}`;
          if (response.status === 429) {
            const header = response.headers.get("retry-after") ?? "60";
            const seconds = /^\d+$/.test(header)
              ? Number(header)
              : Math.ceil((Date.parse(header) - Date.now()) / 1000);
            throw new ProviderRateLimit(
              new Date(
                Math.min(
                  253402300799000,
                  Date.now() +
                    Math.max(60, Number.isFinite(seconds) ? seconds : 60) *
                      1000,
                ),
              ),
            );
          }
          if (response.status < 500) throw new AppError(finalCode, 502);
        } else {
          const length = Number(response.headers.get("content-length") || 0);
          if (length > 5 * 1024 * 1024)
            throw new AppError("PAYLOAD_TOO_LARGE", 502);
          const payload: unknown = JSON.parse(await boundedText(response));
          const records = Array.isArray(payload)
            ? payload
            : payload && typeof payload === "object" && "data" in payload
              ? payload.data
              : null;
          if (!Array.isArray(records) || records.length > 10000)
            throw new AppError("INVALID_PROVIDER_ENVELOPE", 502);
          return records;
        }
      } catch (e) {
        if (e instanceof AppError) throw e;
        finalCode =
          e instanceof SyntaxError
            ? "INVALID_PROVIDER_JSON"
            : e instanceof Error && e.name === "TimeoutError"
              ? "PROVIDER_TIMEOUT"
              : "CONNECTION_FAILED";
      }
      if (attempt < 2)
        await new Promise((resolve) =>
          setTimeout(resolve, 500 * (attempt + 1)),
        );
    }
    throw new AppError(finalCode, 502);
  }
}
export const flightDataProvider = new HttpFlightDataProvider();
