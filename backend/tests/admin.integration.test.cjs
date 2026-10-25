const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID, randomBytes } = require("node:crypto");
const http = require("node:http");
if (
  process.env.RUN_FLIGHT_INTEGRATION !== "1" ||
  new URL(process.env.DATABASE_URL).searchParams.get("schema") !==
    "flight_platform_test"
)
  throw Error("Use npm run test:integration; never run fixtures in public.");
const app = require("../dist/src/app").default;
const { prisma: db } = require("../dist/src/config/db");
const { redis } = require("../dist/src/config/redis");
const { env } = require("../dist/src/config/env");
const jwt = require("jsonwebtoken");
const { bookingService } = require("../dist/src/services/booking.service");
const {
  revenueReport,
  allocateAmount,
} = require("../dist/src/admin/analytics");
const { reportQuery } = require("../dist/src/admin/validation");
const { syncNow } = require("../dist/src/admin/sync");
const {
  HttpFlightDataProvider,
  ProviderRateLimit,
} = require("../dist/src/admin/provider");
const { adminService } = require("../dist/src/services/admin.service");
const { maskCitizenId, csvCell } = require("../dist/src/admin/privacy");
let server,
  base,
  partner,
  partnerBase,
  admin,
  user,
  token,
  userToken,
  a,
  b,
  airlineA,
  airlineB,
  outbound,
  inbound,
  mixed,
  paid,
  unpaid;
let mode = "ok",
  calls = 0,
  seenBearer = false,
  body = [],
  releaseFeed;
const tag = randomBytes(4).toString("hex"),
  citizenId = "012345678901";
const january = { start: "2025-01-01", end: "2025-01-31" };
const query = (values) => reportQuery.parse({ ...january, ...values });
const signed = (u) =>
  jwt.sign({ version: u.tokenVersion, role: "ADMIN" }, env.JWT_ACCESS_SECRET, {
    subject: String(u.id),
    issuer: "flight-tickets",
    audience: "flight-web",
    expiresIn: "15m",
  });
async function call(path, { method = "GET", data, auth = token, form } = {}) {
  const response = await fetch(base + "/api/v1" + path, {
    method,
    headers: {
      ...(auth ? { Authorization: "Bearer " + auth } : {}),
      ...(data ? { "Content-Type": "application/json" } : {}),
    },
    body: form ?? (data ? JSON.stringify(data) : undefined),
  });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: response.status, text, json, headers: response.headers };
}
const passenger = (suffix = "A") => ({
  fullName: "Nguyen Fixture " + suffix,
  dateOfBirth: "1993-01-01",
  documentNumber: citizenId,
  nationality: "VN",
});
async function createBooking({
  owner = user.id,
  ids = [outbound.fares[0].id],
  pax = 1,
  pay = false,
} = {}) {
  const booking = await bookingService.create(owner, {
    fareIds: ids,
    passengers: Array.from({ length: pax }, (_, i) => passenger(String(i))),
    contactEmail: "fixture-" + tag + "@example.com",
    contactPhone: "0901234567",
    idempotencyKey: randomUUID(),
  });
  return pay ? bookingService.pay(booking.id, owner) : booking;
}
before(async () => {
  await redis.del("flight:airports:v1");
  admin = await db.user.create({
    data: {
      email: "admin-" + tag + "@fixture.local",
      fullName: "Admin Fixture",
      role: "ADMIN",
      passwordHash: "fixture-not-loginable",
    },
  });
  user = await db.user.create({
    data: {
      email: "user-" + tag + "@fixture.local",
      fullName: "Customer Fixture",
      role: "USER",
      passwordHash: "fixture-not-loginable",
    },
  });
  token = signed(admin);
  userToken = signed(user);
  const letters = randomBytes(3)
    .toString("hex")
    .replace(/[0-9]/g, (c) => String.fromCharCode(65 + Number(c)))
    .slice(0, 2)
    .toUpperCase();
  a = await db.airport.create({
    data: {
      code: "Y" + letters,
      name: "Fixture Departure",
      city: "Fixture VN",
      country: "Việt Nam",
      latitude: 10,
      longitude: 106,
    },
  });
  b = await db.airport.create({
    data: {
      code: "W" + letters,
      name: "Fixture Arrival",
      city: "Fixture International",
      country: "Singapore",
      timezone: "Asia/Singapore",
      latitude: 1,
      longitude: 104,
    },
  });
  airlineA = await db.airline.create({
    data: {
      code: "A" + letters,
      name: "Fixture Airline A " + tag,
      color: "#4263eb",
      country: "Việt Nam",
    },
  });
  airlineB = await db.airline.create({
    data: {
      code: "B" + letters,
      name: "Fixture Airline B " + tag,
      color: "#0aa694",
      country: "Singapore",
    },
  });
  const departure = new Date(Date.now() + 3 * 86400000);
  outbound = await db.flight.create({
    data: {
      airlineId: airlineA.id,
      originId: a.id,
      destinationId: b.id,
      flightNumber: airlineA.code + "101",
      departureTime: departure,
      arrivalTime: new Date(+departure + 7200000),
      fares: {
        create: {
          cabinClass: "ECONOMY",
          basePrice: 900000,
          tax: 100000,
          totalSeats: 100,
          availableSeats: 100,
          refundable: true,
        },
      },
    },
    include: { fares: true },
  });
  inbound = await db.flight.create({
    data: {
      airlineId: airlineB.id,
      originId: b.id,
      destinationId: a.id,
      flightNumber: airlineB.code + "202",
      departureTime: new Date(+departure + 14400000),
      arrivalTime: new Date(+departure + 21600000),
      fares: {
        create: {
          cabinClass: "ECONOMY",
          basePrice: 2900000,
          tax: 100000,
          totalSeats: 100,
          availableSeats: 100,
          refundable: true,
        },
      },
    },
    include: { fares: true },
  });
  mixed = await createBooking({
    ids: [outbound.fares[0].id, inbound.fares[0].id],
    pax: 2,
    pay: true,
  });
  await bookingService.cancel(mixed.id, user.id);
  await db.booking.update({
    where: { id: mixed.id },
    data: { createdAt: new Date("2025-01-31T20:00:00+07:00") },
  });
  await db.payment.update({
    where: { bookingId: mixed.id },
    data: {
      paidAt: new Date("2025-01-31T23:30:00+07:00"),
      refundedAt: new Date("2025-02-01T00:05:00+07:00"),
    },
  });
  paid = await createBooking({ pay: true });
  await db.payment.update({
    where: { bookingId: paid.id },
    data: { paidAt: new Date("2025-01-01T00:30:00+07:00") },
  });
  await db.booking.update({
    where: { id: paid.id },
    data: { createdAt: new Date("2025-01-01T00:15:00+07:00") },
  });
  unpaid = await createBooking();
  await db.booking.update({
    where: { id: unpaid.id },
    data: { createdAt: new Date("2025-01-02T12:00:00+07:00") },
  });
  server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  base = "http://127.0.0.1:" + server.address().port;
  partner = http.createServer((req, res) => {
    calls++;
    seenBearer = req.headers.authorization === "Bearer fixture-key";
    res.setHeader("Content-Type", "application/json");
    if (mode === "held") {
      releaseFeed = () => res.end(JSON.stringify({ data: [] }));
      return;
    }
    if (mode === "rate" || mode === "long-rate") {
      res
        .writeHead(429, {
          "Retry-After": mode === "long-rate" ? "172800" : "120",
        })
        .end('{"secret":"never-return-this-body"}');
      return;
    }
    if (mode === "retry" && calls < 3) {
      res.writeHead(503).end("{}");
      return;
    }
    if (mode === "invalid") {
      res.end("{broken");
      return;
    }
    if (mode === "unauthorized") {
      res.writeHead(401).end("sensitive-partner-body");
      return;
    }
    res.end(JSON.stringify({ data: body }));
  });
  partner.listen(0, "127.0.0.1");
  await new Promise((r) => partner.once("listening", r));
  partnerBase = "http://127.0.0.1:" + partner.address().port;
});
after(async () => {
  try {
    const ids = [admin?.id, user?.id].filter(Boolean);
    const existing = await db.booking.findMany({
      where: { userId: { in: ids } },
      select: { id: true },
    });
    await db.payment.deleteMany({
      where: { bookingId: { in: existing.map((b) => b.id) } },
    });
    await db.booking.deleteMany({
      where: { id: { in: existing.map((b) => b.id) } },
    });
    await db.adminAuditEvent.deleteMany({ where: { actorId: { in: ids } } });
    await db.providerSyncRun.deleteMany({
      where: { OR: [{ actorId: { in: ids } }, { provider: "FIXTURE_FEED" }] },
    });
    await db.providerSyncState.deleteMany();
    await db.user.deleteMany({ where: { id: { in: ids } } });
    await db.flight.deleteMany({
      where: {
        airlineId: { in: [airlineA?.id, airlineB?.id].filter(Boolean) },
      },
    });
    await db.airline.deleteMany({
      where: {
        OR: [
          { id: { in: [airlineA?.id, airlineB?.id].filter(Boolean) } },
          { name: { contains: tag } },
        ],
      },
    });
    await db.airport.deleteMany({
      where: { id: { in: [a?.id, b?.id].filter(Boolean) } },
    });
  } finally {
    await new Promise((r) => (server ? server.close(r) : r()));
    await new Promise((r) => (partner ? partner.close(r) : r()));
    await db.$disconnect();
    redis.disconnect();
  }
});
test("all admin read, export, upload and sync APIs reject anonymous and USER tokens", async () => {
  for (const path of [
    "/admin/analytics/overview",
    "/admin/monitoring",
    "/admin/fares/history",
    "/admin/booking-management",
    "/admin/bookings/" + mixed.id,
    "/admin/booking-management/export.csv",
    "/admin/revenue",
    "/admin/revenue/export.csv",
    "/admin/customers",
    "/admin/airline-catalog",
    "/admin/settings",
    "/admin/activity",
    "/admin/sync/status",
    "/admin/search?q=VN",
  ]) {
    assert.equal((await call(path, { auth: null })).status, 401, path);
    assert.equal((await call(path, { auth: userToken })).status, 403, path);
  }
  for (const path of ["/admin/airlines/logo", "/admin/sync/schedule"])
    assert.equal(
      (await call(path, { method: "POST", auth: userToken })).status,
      403,
    );
});
test("admin booking DTO, legacy API, detail and CSV never contain full citizen ID", async () => {
  for (const path of [
    "/admin/bookings",
    "/admin/bookings/" + mixed.id,
    "/admin/booking-management?" + new URLSearchParams(january),
    "/admin/booking-management/export.csv?" + new URLSearchParams(january),
  ]) {
    const response = await call(path);
    assert.equal(response.status, 200, path);
    assert.ok(!response.text.includes(citizenId), path);
    assert.ok(response.text.includes("*********901"), path);
    assert.ok(!response.text.includes("dateOfBirth"), path);
  }
  const detail = (await call("/admin/bookings/" + mixed.id)).json.data;
  assert.equal(detail.contactPhone, "0901234567");
  assert.equal(
    (await db.adminAuditEvent.count({
      where: {
        actorId: admin.id,
        action: "BOOKING_CONTACT_VIEW",
        entityId: mixed.id,
      },
    })) > 0,
    true,
  );
  assert.ok(
    !JSON.stringify(
      await db.adminAuditEvent.findMany({ where: { actorId: admin.id } }),
    ).includes(citizenId),
  );
});
test("ADMIN-owned booking endpoints are masked while normal USER ownership contract stays intact", async () => {
  const own = await call("/bookings", {
    method: "POST",
    data: {
      fareIds: [outbound.fares[0].id],
      passengers: [passenger()],
      contactEmail: "admin-fixture@example.com",
      contactPhone: "0901234567",
      idempotencyKey: randomUUID(),
    },
  });
  assert.equal(own.status, 201);
  for (const response of [
    own,
    await call("/bookings"),
    await call("/bookings/" + own.json.data.id),
  ])
    assert.ok(!response.text.includes(citizenId));
  const normal = await call("/bookings/" + paid.id, { auth: userToken });
  assert.ok(normal.text.includes(citizenId));
  assert.equal((await call("/bookings/" + paid.id)).status, 404);
});
test("revenue uses payments, VN timezone and mixed-airline allocation without duplicate orders", async () => {
  const report = await revenueReport(query());
  assert.equal(report.gross, 9000000);
  assert.equal(report.refunds, 0);
  assert.equal(report.net, 9000000);
  assert.equal(report.orders, 2);
  assert.equal(report.tickets, 5);
  assert.equal(
    report.series.find((p) => p.date === "2025-01-01").gross,
    1000000,
  );
  assert.equal(
    report.byAirline.reduce((s, a) => s + a.gross, 0),
    report.gross,
  );
  assert.equal(
    report.byAirline.find((a) => a.id === airlineA.id).gross,
    3000000,
  );
  assert.equal(
    report.byAirline.find((a) => a.id === airlineB.id).gross,
    6000000,
  );
  assert.equal(
    (await revenueReport(query({ airlineId: airlineB.id }))).gross,
    6000000,
  );
  assert.equal((await revenueReport(query({ region: "DOMESTIC" }))).gross, 0);
  assert.equal(
    (await revenueReport(query({ region: "INTERNATIONAL" }))).gross,
    9000000,
  );
  assert.equal(
    (await revenueReport(query({ group: "MONTH" }))).series[0].gross,
    9000000,
  );
});
test("refunds are attributed to refund date and zero gross can have negative net", async () => {
  const report = await revenueReport(
    query({ start: "2025-02-01", end: "2025-02-28" }),
  );
  assert.equal(report.gross, 0);
  assert.equal(report.refunds, 8000000);
  assert.equal(report.net, -8000000);
  assert.equal(report.orders, 0);
  assert.equal(report.transactions.length, 1);
  assert.ok(
    (await db.payment.findUnique({ where: { bookingId: mixed.id } }))
      .refundedAt,
  );
});
test("currencies stay separate and a missing refund timestamp is never fabricated", async () => {
  assert.equal(
    reportQuery.safeParse({ ...january, currency: "USD" }).success,
    false,
  );
  assert.equal((await call("/admin/revenue?currency=USD")).status, 422);
  assert.equal((await revenueReport(query())).gross, 9000000);
  const legacy = await createBooking({ pay: true });
  await bookingService.cancel(legacy.id, user.id);
  await db.payment.update({
    where: { bookingId: legacy.id },
    data: { paidAt: new Date("2024-12-20T12:00:00+07:00"), refundedAt: null },
  });
  const report = await revenueReport(query());
  assert.equal(report.net, null);
  assert.equal(report.unknownRefunds, 1000000);
  await db.payment.delete({ where: { bookingId: legacy.id } });
  await db.booking.delete({ where: { id: legacy.id } });
});
test("server-side filters, pagination, invalid dates, sorting and search use database data", async () => {
  const start = new Date(+outbound.departureTime + 7 * 3600000)
      .toISOString()
      .slice(0, 10),
    end = new Date(+inbound.departureTime + 7 * 3600000)
      .toISOString()
      .slice(0, 10);
  const overview = (
    await call(
      "/admin/analytics/overview?" + new URLSearchParams({ start, end }),
    )
  ).json.data;
  assert.equal(overview.regions.domestic, 0);
  assert.equal(overview.regions.international, 2);
  assert.equal(
    overview.regions.domestic + overview.regions.international,
    overview.kpis.flights,
  );
  const response = await call(
    "/admin/booking-management?" +
      new URLSearchParams({
        ...january,
        q: mixed.reference,
        pageSize: "5",
        order: "AMOUNT",
        sort: "asc",
      }),
  );
  assert.equal(response.status, 200);
  assert.equal(response.json.data.pagination.total, 1);
  assert.equal(response.json.data.items[0].reference, mixed.reference);
  const flights = await call(
    "/admin/monitoring?" +
      new URLSearchParams({
        start: new Date(outbound.departureTime).toISOString().slice(0, 10),
        end: new Date(inbound.departureTime).toISOString().slice(0, 10),
        airlineId: String(airlineA.id),
        pageSize: "5",
      }),
  );
  assert.equal(flights.status, 200);
  assert.equal(
    flights.json.data.items.every((f) => f.airline.id === airlineA.id),
    true,
  );
  assert.equal((await call("/admin/revenue?start=2025-02-30")).status, 422);
  assert.equal(
    (await call("/admin/revenue?start=2025-02-01&end=2025-01-01")).status,
    422,
  );
  const search = await call("/admin/search?q=" + mixed.reference);
  assert.equal(search.json.data.bookings[0].id, mixed.id);
  assert.ok(!search.text.includes(citizenId));
});
test("fare updates append real observations; before-first-observation period stays empty", async () => {
  const fare = await db.flightFare.findUnique({
    where: { id: outbound.fares[0].id },
  });
  const payload = {
    cabinClass: fare.cabinClass,
    basePrice: 950000,
    tax: fare.tax,
    baggageKg: fare.baggageKg,
    cabinBaggageKg: fare.cabinBaggageKg,
    refundable: fare.refundable,
    totalSeats: fare.totalSeats,
  };
  const before = await db.fareObservation.count({ where: { fareId: fare.id } });
  assert.equal(
    (await call("/admin/fares/" + fare.id, { method: "PATCH", data: payload }))
      .status,
    200,
  );
  assert.equal(
    await db.fareObservation.count({ where: { fareId: fare.id } }),
    before + 1,
  );
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(
    (
      await call("/admin/fares/" + fare.id, {
        method: "PATCH",
        data: { ...payload, basePrice: 1000000 },
      })
    ).status,
    200,
  );
  const today = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
  const current = (
    await call(
      "/admin/fares/history?" +
        new URLSearchParams({
          start: today,
          end: today,
          fareId: String(fare.id),
        }),
    )
  ).json.data;
  assert.equal(current.pagination.total, 1);
  assert.equal(current.items[0].previousPrice, 1050000);
  assert.equal(current.items[0].minimumPrice, 1050000);
  assert.equal(current.items[0].averagePrice, 1075000);
  assert.equal(current.series.length, 1);
  const past = (
    await call(
      "/admin/fares/history?" +
        new URLSearchParams({ ...january, fareId: String(fare.id) }),
    )
  ).json.data;
  assert.equal(past.totalObservations, 0);
  assert.equal(past.series.length, 0);
});
test("airline CRUD validates duplicates, persists metadata and prevents referenced hard deletion", async () => {
  const code = "C" + airlineA.code.slice(1);
  const payload = {
    code,
    name: "New Airline " + tag,
    country: "Singapore",
    logoUrl: "/brands/cards/vn.svg",
    website: "https://example.com",
    color: "#125588",
    isActive: true,
  };
  const created = await call("/admin/airlines", {
    method: "POST",
    data: payload,
  });
  assert.equal(created.status, 201);
  assert.equal(created.json.data.country, "Singapore");
  assert.equal(
    (await call("/admin/airlines", { method: "POST", data: payload })).status,
    409,
  );
  assert.equal(
    (
      await call("/admin/airlines", {
        method: "POST",
        data: {
          ...payload,
          code: "D" + code.slice(1),
          website: "javascript:alert(1)",
        },
      })
    ).status,
    422,
  );
  assert.equal(
    (await call("/airlines")).json.data.some(
      (a) => a.id === created.json.data.id,
    ),
    true,
  );
  assert.equal(
    (await call("/admin/airlines/" + airlineA.id, { method: "DELETE" })).status,
    409,
  );
  assert.equal(
    (
      await call("/admin/airlines/" + created.json.data.id + "/status", {
        method: "PATCH",
        data: { isActive: false },
      })
    ).status,
    200,
  );
  assert.equal(
    (await call("/airlines")).json.data.some(
      (a) => a.id === created.json.data.id,
    ),
    false,
  );
  assert.equal(
    (
      await call("/admin/airlines/" + created.json.data.id, {
        method: "DELETE",
      })
    ).status,
    200,
  );
});
test("logo upload accepts a signed bitmap, rejects SVG and serves a content-addressed image", async () => {
  const invalid = new FormData();
  invalid.append(
    "logo",
    new Blob(['<svg onload="alert(1)"></svg>'], { type: "image/svg+xml" }),
    "logo.svg",
  );
  assert.equal(
    (await call("/admin/airlines/logo", { method: "POST", form: invalid }))
      .status,
    422,
  );
  const valid = new FormData();
  valid.append(
    "logo",
    new Blob(
      [
        Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=",
          "base64",
        ),
      ],
      { type: "image/png" },
    ),
    "logo.png",
  );
  const uploaded = await call("/admin/airlines/logo", {
    method: "POST",
    form: valid,
  });
  assert.equal(uploaded.status, 201);
  assert.match(uploaded.json.data.url, /\/[a-f0-9]{64}\.png$/);
  assert.equal((await fetch(base + uploaded.json.data.url)).status, 200);
  assert.equal(
    (await call("/media/airline-logos/not-an-image.png", { auth: null }))
      .status,
    404,
  );
});
test("unconfigured sync creates no pretend successful run and settings contain no key", async () => {
  const before = await db.providerSyncRun.count();
  const result = await call("/admin/sync/schedule", { method: "POST" });
  assert.equal(result.status, 409);
  assert.equal(await db.providerSyncRun.count(), before);
  const settings = await call("/admin/settings");
  assert.equal(settings.status, 200);
  assert.ok(!settings.text.includes(env.JWT_ACCESS_SECRET));
  assert.ok(!("FLIGHT_PROVIDER_API_KEY" in settings.json.data));
});
test("configured JSON provider validates records, retries transient errors and never echoes raw bodies", async () => {
  const original = env.FLIGHT_SCHEDULE_URL,
    originalKey = env.FLIGHT_PROVIDER_API_KEY;
  env.FLIGHT_SCHEDULE_URL = partnerBase + "/schedule";
  env.FLIGHT_PROVIDER_API_KEY = "fixture-key";
  try {
    const provider = new HttpFlightDataProvider();
    mode = "retry";
    calls = 0;
    body = [];
    assert.deepEqual(await provider.read("schedule"), []);
    assert.equal(calls, 3);
    assert.equal(seenBearer, true);
    mode = "unauthorized";
    calls = 0;
    await assert.rejects(
      provider.read("schedule"),
      (e) => e.message === "HTTP_401" && !e.message.includes("sensitive"),
    );
    assert.equal(calls, 1);
    mode = "rate";
    calls = 0;
    await assert.rejects(
      provider.read("schedule"),
      (e) => e instanceof ProviderRateLimit && +e.retryAt > Date.now() + 60000,
    );
    assert.equal(calls, 1);
    mode = "long-rate";
    await assert.rejects(
      provider.read("schedule"),
      (error) =>
        error instanceof ProviderRateLimit &&
        +error.retryAt > Date.now() + 172799000,
    );
  } finally {
    // Restore process-only provider configuration.
    mode = "ok";
    env.FLIGHT_SCHEDULE_URL = original;
    env.FLIGHT_PROVIDER_API_KEY = originalKey;
  }
});
test("provider schedule, status and fare snapshots are separate, idempotent and read-only", async () => {
  const external = "external-" + tag,
    provider = {
      name: "FIXTURE_FEED",
      configured: () => true,
      read: async () => body,
    };
  const departure = new Date(Date.now() + 5 * 86400000);
  body = [
    {
      externalId: external,
      airlineCode: airlineA.code,
      flightNumber: airlineA.code + "303",
      origin: a.code,
      destination: b.code,
      departureTime: departure.toISOString(),
      arrivalTime: new Date(+departure + 7200000).toISOString(),
      aircraft: "Airbus A321",
    },
    { externalId: "bad" },
  ];
  let run = await syncNow("schedule", admin.id, provider);
  assert.equal(run.processed, 1);
  assert.equal(run.skipped, 1);
  const flight = await db.flight.findUnique({
    where: {
      source_externalId: { source: provider.name, externalId: external },
    },
  });
  assert.equal(flight.operationalStatus, null);
  const observedAt = new Date(Date.now() - 1000).toISOString();
  body = [{ externalFlightId: external, status: "DELAYED", observedAt }];
  await syncNow("status", admin.id, provider);
  assert.equal(
    (await db.flight.findUnique({ where: { id: flight.id } })).status,
    "SCHEDULED",
  );
  assert.equal(
    (await db.flight.findUnique({ where: { id: flight.id } }))
      .operationalStatus,
    "DELAYED",
  );
  body = [
    {
      externalFlightId: external,
      cabinClass: "ECONOMY",
      basePrice: 1200000,
      tax: 100000,
      currency: "VND",
      availableSeats: 2,
      baggageKg: 20,
      cabinBaggageKg: 7,
      refundable: true,
      observedAt,
    },
  ];
  await syncNow("fares", admin.id, provider);
  const fare = await db.flightFare.findUnique({
    where: {
      flightId_cabinClass: { flightId: flight.id, cabinClass: "ECONOMY" },
    },
  });
  assert.equal(
    await db.fareObservation.count({ where: { fareId: fare.id } }),
    1,
  );
  run = await syncNow("fares", admin.id, provider);
  assert.equal(run.processed, 0);
  assert.equal(run.status, "SUCCEEDED");
  assert.equal(
    await db.fareObservation.count({ where: { fareId: fare.id } }),
    1,
  );
  await assert.rejects(
    adminService.updateFare(
      fare.id,
      {
        cabinClass: "ECONOMY",
        basePrice: 1,
        tax: 0,
        totalSeats: 2,
        baggageKg: 0,
        cabinBaggageKg: 7,
        refundable: false,
      },
      admin.id,
    ),
    (e) => e.statusCode === 409,
  );
  await assert.rejects(
    adminService.flightStatus(flight.id, "CANCELLED", admin.id),
    (e) => e.statusCode === 409,
  );
  const held = await createBooking({ ids: [fare.id], pax: 2 });
  body = [
    {
      ...body[0],
      availableSeats: 1,
      basePrice: 1250000,
      observedAt: new Date().toISOString(),
    },
  ];
  await syncNow("fares", admin.id, provider);
  assert.equal(
    (await db.flightFare.findUnique({ where: { id: fare.id } })).availableSeats,
    0,
  );
  await bookingService.cancel(held.id, user.id);
  const released = await db.flightFare.findUnique({ where: { id: fare.id } });
  assert.equal(released.availableSeats, 1);
  assert.equal(released.providerAvailableSeats, 1);
  assert.equal(released.totalSeats, 1);
  const blocked = await createBooking({ ids: [fare.id] });
  body = [
    {
      externalFlightId: external,
      status: "CANCELLED",
      observedAt: new Date().toISOString(),
    },
  ];
  await syncNow("status", admin.id, provider);
  await assert.rejects(
    bookingService.pay(blocked.id, user.id),
    (e) => e.statusCode === 409,
  );
  await assert.rejects(
    createBooking({ ids: [fare.id] }),
    (e) => e.statusCode === 409,
  );
  await bookingService.cancel(blocked.id, user.id);
  const {
    flightRepository,
  } = require("../dist/src/repositories/flight.repository");
  assert.equal((await flightRepository.search({ id: flight.id })).length, 0);
});
test("provider backoff and database lease prevent overlapping calls", async () => {
  await db.providerSyncState.upsert({
    where: { kind: "status" },
    create: { kind: "status", runningUntil: new Date(Date.now() + 60000) },
    update: { runningUntil: new Date(Date.now() + 60000) },
  });
  let attempts = 0;
  const provider = {
    name: "FIXTURE_FEED",
    configured: () => true,
    read: async () => {
      attempts++;
      throw new ProviderRateLimit(new Date(Date.now() + 60000));
    },
  };
  await assert.rejects(
    syncNow("status", admin.id, provider),
    (e) => e.statusCode === 409,
  );
  assert.equal(attempts, 0);
  await db.providerSyncState.update({
    where: { kind: "status" },
    data: { runningUntil: null },
  });
  await assert.rejects(
    syncNow("status", admin.id, provider),
    (e) => e.statusCode === 429,
  );
  await assert.rejects(
    syncNow("status", admin.id, provider),
    (e) => e.statusCode === 429,
  );
  assert.equal(attempts, 1);
});
test("privacy, integer allocation and CSV cells remain safe at boundary values", () => {
  assert.equal(maskCitizenId(citizenId), "*********901");
  assert.equal(maskCitizenId("AB"), "***");
  assert.deepEqual(allocateAmount(10, [1, 1, 1]), [4, 3, 3]);
  assert.deepEqual(
    allocateAmount(2147483647, [100000000, 99999999]),
    [1073741829, 1073741818],
  );
  assert.equal(
    allocateAmount(2147483647, [1, 3]).reduce((a, b) => a + b, 0),
    2147483647,
  );
  assert.match(csvCell(' =HYPERLINK("bad")'), /^"'/);
  assert.equal(csvCell('Nguyen "A"'), '"Nguyen ""A"""');
});

test("manual sync acknowledges a queued run before the provider response finishes", async () => {
  const saved = env.FLIGHT_SCHEDULE_URL;
  env.FLIGHT_SCHEDULE_URL = partnerBase + "/schedule";
  mode = "held";
  releaseFeed = null;
  try {
    const response = await fetch(base + "/api/v1/admin/sync/schedule", {
      method: "POST",
      headers: { Authorization: "Bearer " + token },
      signal: AbortSignal.timeout(2000),
    });
    assert.equal(response.status, 202);
    const json = await response.json();
    for (let n = 0; n < 100 && !releaseFeed; n++)
      await new Promise((r) => setTimeout(r, 10));
    assert.equal(typeof releaseFeed, "function");
    assert.equal(
      (await db.providerSyncRun.findUnique({ where: { id: json.data.id } }))
        .status,
      "RUNNING",
    );
    releaseFeed();
    for (let n = 0; n < 100; n++) {
      const run = await db.providerSyncRun.findUnique({
        where: { id: json.data.id },
      });
      if (
        run.status === "SUCCEEDED" &&
        (await db.adminAuditEvent.count({
          where: { action: "PROVIDER_SYNC", entityId: run.id },
        }))
      )
        return;
      await new Promise((r) => setTimeout(r, 20));
    }
    assert.fail("Queued sync did not finish");
  } finally {
    releaseFeed?.();
    mode = "ok";
    env.FLIGHT_SCHEDULE_URL = saved;
  }
});
test("future finance periods contain no predicted zero points and booking CSV has one row per order", async () => {
  const future = await revenueReport(
    query({ start: "2099-01-01", end: "2099-01-31" }),
  );
  assert.equal(future.series.length, 0);
  assert.equal(future.gross, 0);
  const csv = await call(
    "/admin/booking-management/export.csv?" + new URLSearchParams(january),
  );
  assert.equal(csv.status, 200);
  const count = await db.booking.count({
    where: {
      createdAt: {
        gte: new Date("2025-01-01T00:00:00+07:00"),
        lt: new Date("2025-02-01T00:00:00+07:00"),
      },
    },
  });
  assert.equal(csv.text.trim().split(/\r?\n/).length, count + 1);
  assert.ok(!csv.text.includes(citizenId));
});
test("provider can clear corrected actual times and rejects impossible actual-time records", async () => {
  await db.providerSyncState.update({
    where: { kind: "status" },
    data: { nextAllowedAt: null, runningUntil: null },
  });
  const external = "external-" + tag;
  const provider = {
    name: "FIXTURE_FEED",
    configured: () => true,
    read: async () => body,
  };
  let observedAt = new Date().toISOString();
  body = [
    {
      externalFlightId: external,
      status: "DEPARTED",
      actualDepartureTime: new Date(Date.now() - 600000).toISOString(),
      observedAt,
    },
  ];
  await syncNow("status", admin.id, provider);
  let flight = await db.flight.findUnique({
    where: {
      source_externalId: { source: provider.name, externalId: external },
    },
  });
  assert.ok(flight.actualDepartureTime);
  await new Promise((resolve) => setTimeout(resolve, 5));
  observedAt = new Date().toISOString();
  body = [
    {
      externalFlightId: external,
      status: "ON_TIME",
      actualDepartureTime: null,
      actualArrivalTime: null,
      observedAt,
    },
  ];
  await syncNow("status", admin.id, provider);
  flight = await db.flight.findUnique({ where: { id: flight.id } });
  assert.equal(flight.actualDepartureTime, null);
  assert.equal(flight.actualArrivalTime, null);
  const { statusRecord } = require("../dist/src/admin/provider");
  assert.equal(
    statusRecord.safeParse({
      externalFlightId: external,
      status: "LANDED",
      observedAt,
      actualDepartureTime: observedAt,
      actualArrivalTime: new Date(Date.now() - 3600000).toISOString(),
    }).success,
    false,
  );
});
test("an entirely invalid provider batch does not update last success", async () => {
  const before = await db.providerSyncState.findUnique({
    where: { kind: "schedule" },
  });
  const provider = {
    name: "FIXTURE_FEED",
    configured: () => true,
    read: async () => [{ externalId: "invalid-record" }],
  };
  await assert.rejects(
    syncNow("schedule", admin.id, provider),
    (error) =>
      error.statusCode === 502 &&
      error.message.includes("NO_VALID_PROVIDER_RECORDS"),
  );
  const after = await db.providerSyncState.findUnique({
    where: { kind: "schedule" },
  });
  assert.equal(+after.lastSuccessAt, +before.lastSuccessAt);
  assert.equal(after.lastError, "NO_VALID_PROVIDER_RECORDS");
});
