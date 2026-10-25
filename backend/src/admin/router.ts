import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../config/db";
import { redis } from "../config/redis";
import { env } from "../config/env";
import { id, airlineSchema } from "../validators";
import { reportQuery } from "./validation";
import { overview, revenueReport } from "./analytics";
import {
  monitoring,
  bookings,
  bookingDetail,
  customers,
  airlines,
  quickSearch,
  pagination,
  audit,
} from "./data";
import { csvCell } from "./privacy";
import { syncStatus, queueSync } from "./sync";
import { syncKind } from "./provider";
import { uploadLogo } from "./media";
import { adminService } from "../services/admin.service";
import { bookingWhere } from "./query";
import { adminBookingDto } from "./privacy";
import { AppError } from "../utils/app-error";
const router = Router();
const syncLimit = rateLimit({
  windowMs: 15 * 60000,
  limit: 6,
  keyGenerator: (req) => String(req.auth!.id),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Tối đa 6 yêu cầu đồng bộ mỗi 15 phút." },
});
const logoLimit = rateLimit({
  windowMs: 15 * 60000,
  limit: 20,
  keyGenerator: (req) => String(req.auth!.id),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Tối đa 20 ảnh logo mỗi 15 phút." },
});
router.get("/analytics/overview", async (req, res) => {
  res.json({
    success: true,
    data: await overview(reportQuery.parse(req.query)),
  });
});
router.get("/monitoring", async (req, res) => {
  res.json({
    success: true,
    data: await monitoring(reportQuery.parse(req.query)),
  });
});
router.get("/fares/history", async (req, res) => {
  res.json({
    success: true,
    data: await (
      await import("./data")
    ).fareAnalytics(reportQuery.parse(req.query)),
  });
});
router.get("/booking-management", async (req, res) => {
  const data = await bookings(reportQuery.parse(req.query));
  await audit(req.auth!.id, "BOOKING_LIST", "Booking", undefined, {
    count: data.items.length,
    page: data.pagination.page,
  });
  res.json({ success: true, data });
});
router.get("/bookings/:id", async (req, res) => {
  res.json({
    success: true,
    data: await bookingDetail(
      z.string().uuid().parse(req.params.id),
      req.auth!.id,
    ),
  });
});
router.get("/customers", async (req, res) => {
  res.json({
    success: true,
    data: await customers(reportQuery.parse(req.query)),
  });
});
router.get("/airline-catalog", async (req, res) => {
  res.json({
    success: true,
    data: await airlines(reportQuery.parse(req.query)),
  });
});
router.patch("/airlines/:id/status", async (req, res) => {
  const target = id.parse(req.params.id);
  const body = z.object({ isActive: z.boolean() }).strict().parse(req.body);
  const current = await prisma.airline.findUniqueOrThrow({
    where: { id: target },
  });
  res.json({
    success: true,
    data: await adminService.updateAirline(
      target,
      airlineSchema.parse({ ...current, ...body }),
      req.auth!.id,
    ),
  });
});
router.post("/airlines/logo", logoLimit, uploadLogo);
router.get("/revenue", async (req, res) => {
  const q = reportQuery.parse(req.query),
    report = await revenueReport(q);
  const total = report.transactions.length;
  res.json({
    success: true,
    data: {
      ...report,
      transactions: report.transactions.slice(
        (q.page - 1) * q.pageSize,
        q.page * q.pageSize,
      ),
      pagination: pagination(q, total),
    },
  });
});
router.get("/revenue/export.csv", async (req, res) => {
  const report = await revenueReport(reportQuery.parse(req.query));
  const rows = [
    [
      "Mã giao dịch",
      "Mã đặt vé",
      "Ngày thu",
      "Ngày hoàn",
      "Trạng thái",
      "Nhà cung cấp",
      "Thực thu",
      "Hoàn tiền",
      "Tiền tệ",
      "Chuyến bay",
    ],
    ...report.transactions.map((p) => [
      p.id,
      p.reference,
      p.paidAt.toISOString(),
      p.refundedAt?.toISOString(),
      p.status,
      p.provider,
      p.gross,
      p.refund,
      p.currency,
      p.flightNumbers,
    ]),
  ];
  await audit(req.auth!.id, "REVENUE_EXPORT", "Report", undefined, {
    rowCount: report.transactions.length,
    currency: report.currency,
  });
  res
    .type("text/csv; charset=utf-8")
    .attachment("flight-revenue.csv")
    .send(
      "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n"),
    );
});
router.get("/booking-management/export.csv", async (req, res) => {
  const q = reportQuery.parse(req.query);
  const found = await prisma.booking.findMany({
    where: bookingWhere(q),
    orderBy: { createdAt: "desc" },
    take: 10001,
    select: {
      id: true,
      reference: true,
      status: true,
      totalAmount: true,
      currency: true,
      contactEmail: true,
      contactPhone: true,
      user: { select: { fullName: true } },
      passengers: { select: { fullName: true, documentNumber: true } },
    },
  });
  if (found.length > 10000)
    throw new AppError(
      "Tối đa 10.000 đơn mỗi báo cáo; vui lòng thu hẹp bộ lọc.",
      413,
    );
  const items = found.map((b) => adminBookingDto(b));
  const rows = [
    [
      "Mã đặt vé",
      "Khách hàng",
      "Email đã che",
      "Điện thoại đã che",
      "Hành khách",
      "CCCD đã che",
      "Trạng thái",
      "Tổng tiền",
      "Tiền tệ",
    ],
    ...items.map((b) => [
      b.reference,
      b.user?.fullName,
      b.contactEmail,
      b.contactPhone,
      b.passengers.map((p) => p.fullName).join(" | "),
      b.passengers.map((p) => p.maskedCitizenId).join(" | "),
      b.status,
      b.totalAmount,
      b.currency,
    ]),
  ];
  await audit(req.auth!.id, "BOOKING_EXPORT", "Report", undefined, {
    rowCount: items.length,
  });
  res
    .type("text/csv; charset=utf-8")
    .attachment("flight-bookings.csv")
    .send(
      "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n"),
    );
});
router.get("/search", async (req, res) => {
  res.json({
    success: true,
    data: await quickSearch(
      z
        .string()
        .trim()
        .min(0)
        .max(100)
        .parse(req.query.q ?? ""),
      req.auth!.id,
    ),
  });
});
router.get("/activity", async (req, res) => {
  const q = reportQuery.parse(req.query);
  const [items, total] = await Promise.all([
    prisma.adminAuditEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: q.pageSize,
      skip: (q.page - 1) * q.pageSize,
      include: { actor: { select: { id: true, fullName: true } } },
    }),
    prisma.adminAuditEvent.count(),
  ]);
  res.json({
    success: true,
    data: { items, pagination: pagination(q, total) },
  });
});
router.get("/sync/status", async (_req, res) => {
  res.json({ success: true, data: await syncStatus() });
});
router.post("/sync/:kind", syncLimit, async (req, res) => {
  res.status(202).json({
    success: true,
    data: await queueSync(syncKind.parse(req.params.kind), req.auth!.id),
  });
});
router.get("/settings", async (_req, res) => {
  let database = false,
    cache = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = true;
  } catch {}
  try {
    cache = (await redis.ping()) === "PONG";
  } catch {}
  res.json({
    success: true,
    data: {
      database,
      cache,
      timeZone: "Asia/Ho_Chi_Minh",
      currency: "VND",
      mockPayments: env.ENABLE_MOCK_PAYMENTS === "true",
      provider: env.FLIGHT_PROVIDER_NAME,
      apiKeyConfigured: Boolean(env.FLIGHT_PROVIDER_API_KEY),
      syncEnabled: env.FLIGHT_SYNC_ENABLED === "true",
      syncInterval: env.FLIGHT_SYNC_INTERVAL_SECONDS,
      endpoints: {
        schedule: Boolean(env.FLIGHT_SCHEDULE_URL),
        status: Boolean(env.FLIGHT_STATUS_URL),
        fares: Boolean(env.FLIGHT_FARES_URL),
      },
      currencies: (await prisma.booking.groupBy({ by: ["currency"] })).map(
        (r) => r.currency,
      ),
    },
  });
});
export default router;
