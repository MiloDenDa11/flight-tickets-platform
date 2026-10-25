import { z } from "zod";
import { day } from "../validators";
export const reportQuery = z
  .object({
    start: day.optional(),
    end: day.optional(),
    airlineId: z.coerce.number().int().positive().optional(),
    origin: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .optional(),
    destination: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .optional(),
    region: z.enum(["ALL", "DOMESTIC", "INTERNATIONAL"]).default("ALL"),
    currency: z.literal("VND").default("VND"),
    group: z.enum(["DAY", "WEEK", "MONTH"]).default("DAY"),
    q: z.string().trim().max(100).default(""),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    pageSize: z.coerce.number().int().min(5).max(100).default(15),
    sort: z.enum(["asc", "desc"]).default("desc"),
    status: z.string().max(24).optional(),
    paymentStatus: z.enum(["PAID", "REFUNDED", "UNPAID"]).optional(),
    departureDate: day.optional(),
    cabinClass: z.enum(["ECONOMY", "PREMIUM", "BUSINESS"]).optional(),
    fareId: z.coerce.number().int().positive().optional(),
    passengers: z.coerce.number().int().min(1).max(9).optional(),
    order: z.enum(["DATE", "AMOUNT", "NAME", "FLIGHT"]).default("DATE"),
    customerId: z.coerce.number().int().positive().optional(),
    flightId: z.coerce.number().int().positive().optional(),
  })
  .transform((q) => {
    const now = new Date(Date.now() + 7 * 3600000),
      today = now.toISOString().slice(0, 10);
    return {
      ...q,
      start: q.start ?? today.slice(0, 8) + "01",
      end:
        q.end ??
        new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))
          .toISOString()
          .slice(0, 10),
    };
  })
  .superRefine((q, ctx) => {
    const span = Date.parse(q.end) - Date.parse(q.start);
    if (span < 0 || span > 365 * 86400000)
      ctx.addIssue({
        code: "custom",
        message: "Chọn khoảng thời gian từ 1 đến 366 ngày",
      });
  });
export type AdminQuery = z.infer<typeof reportQuery>;
export function period(q: Pick<AdminQuery, "start" | "end">) {
  return {
    gte: new Date(q.start + "T00:00:00+07:00"),
    lt: new Date(Date.parse(q.end + "T00:00:00+07:00") + 86400000),
  };
}
export function localDay(date: Date) {
  return new Date(+date + 7 * 3600000).toISOString().slice(0, 10);
}
export function bucket(date: Date, group: AdminQuery["group"]) {
  const key = localDay(date);
  if (group === "MONTH") return key.slice(0, 7) + "-01";
  if (group === "WEEK") {
    const d = new Date(key + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    return d.toISOString().slice(0, 10);
  }
  return key;
}
export function previousPeriod(q: AdminQuery): AdminQuery {
  const p = period(q),
    span = +p.lt - +p.gte;
  return {
    ...q,
    start: localDay(new Date(+p.gte - span)),
    end: localDay(new Date(+p.gte - 1)),
  };
}
