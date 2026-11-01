const { test, before, after, mock } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, randomBytes, createHash } = require('node:crypto');
if (process.env.RUN_FLIGHT_INTEGRATION !== '1' || new URL(process.env.DATABASE_URL).searchParams.get('schema') !== 'flight_platform_test') throw new Error('Run via npm run test:integration (isolated test schema)');
const app = require('../dist/src/app').default;
const { prisma: db } = require('../dist/src/config/db');
const { redis } = require('../dist/src/config/redis');
const { env } = require('../dist/src/config/env');
const { releaseExpired } = require('../dist/src/services/booking.service');
const jwt = require('jsonwebtoken');
const mailer = require('nodemailer');
const tag = randomBytes(5).toString('hex');
const users = [];
const password = 'Qa-' + randomUUID();
let server, base, owner, outsider, admin, airline, origin, destination, flight, returnFlight, fare, returnFare;
const hash = value => createHash('sha256').update(value).digest('hex');
const tokenFor = (user, extra = {}) => jwt.sign({ version: user.tokenVersion, ...extra }, env.JWT_ACCESS_SECRET, { subject: String(user.id), expiresIn: '15m', issuer: 'flight-tickets', audience: 'flight-web', algorithm: 'HS256' });

async function call(path, { method = 'GET', auth = owner?.token, body, raw, headers = {}, cookie, origin: requestOrigin = env.FRONTEND_URL } = {}) {
  const response = await fetch(base + '/api/v1' + path, {
    method, headers: { ...(auth ? { Authorization: 'Bearer ' + auth } : {}), ...(body !== undefined || raw !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(requestOrigin ? { Origin: requestOrigin } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers },
    ...(body !== undefined ? { body: JSON.stringify(body) } : raw !== undefined ? { body: raw } : {}), signal: AbortSignal.timeout(15000),
  });
  const text = await response.text();
  let json; try { json = JSON.parse(text); } catch {}
  return { status: response.status, json, text, headers: response.headers, cookie: response.headers.get('set-cookie')?.split(';')[0] };
}

async function account(label, role = 'USER') {
  const bcrypt = require('bcryptjs');
  const user = await db.user.create({ data: { fullName: 'QA ' + label, email: `${tag}-${label}@test.local`, passwordHash: await bcrypt.hash(password, 4), role } });
  users.push(user.id);
  return { ...user, token: tokenFor(user) };
}

function payload(fareIds = [fare.id]) {
  return { fareIds, passengers: [{ fullName: 'QA Fixture', dateOfBirth: '1991-02-03', documentNumber: 'QA-TEST-12345', nationality: 'VN' }], contactEmail: 'qa@example.test', contactPhone: '0901234567', idempotencyKey: randomUUID() };
}

async function booking(input = payload()) {
  const response = await call('/bookings', { method: 'POST', body: input });
  assert.equal(response.status, 201, 'Fixture booking must be created');
  return response.json.data;
}

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
  owner = await account('owner'); outsider = await account('outsider'); admin = await account('admin', 'ADMIN');
  async function airport(prefix) {
    for (;;) {
      const code = prefix + Array.from(randomBytes(2), n => String.fromCharCode(65 + n % 26)).join('');
      if (!await db.airport.findUnique({ where: { code } })) return db.airport.create({ data: { code, name: 'QA Airport', city: 'QA City', latitude: 10, longitude: 106 } });
    }
  }
  origin = await airport('Q'); destination = await airport('W');
  airline = await db.airline.create({ data: { code: 'Q' + tag.slice(0, 2).toUpperCase(), name: 'QA Fixture Airline' } });
  const departure = new Date(new Date(Date.now() + 4 * 86400000 + 7 * 3600000).toISOString().slice(0, 10) + 'T09:00:00+07:00');
  const flightData = { airlineId: airline.id, originId: origin.id, destinationId: destination.id, flightNumber: 'QF' + parseInt(tag.slice(0, 4), 16) % 10000, departureTime: departure, arrivalTime: new Date(+departure + 2 * 3600000) };
  const fareData = { cabinClass: 'ECONOMY', basePrice: 900000, tax: 100000, totalSeats: 60, availableSeats: 60, refundable: true };
  flight = await db.flight.create({ data: { ...flightData, fares: { create: fareData } }, include: { fares: true } }); fare = flight.fares[0];
  returnFlight = await db.flight.create({ data: { ...flightData, flightNumber: 'QR' + parseInt(tag.slice(0, 4), 16) % 10000, originId: destination.id, destinationId: origin.id, departureTime: new Date(+departure + 8 * 3600000), arrivalTime: new Date(+departure + 10 * 3600000), fares: { create: fareData } }, include: { fares: true } }); returnFare = returnFlight.fares[0];
  await redis.del('flight:airports:v1').catch(() => {});
});

after(async () => {
  mock.restoreAll();
  try {
    const rows = await db.booking.findMany({ where: { userId: { in: users } }, select: { id: true } });
    await db.payment.deleteMany({ where: { bookingId: { in: rows.map(row => row.id) } } });
    await db.booking.deleteMany({ where: { userId: { in: users } } });
    await db.adminAuditEvent.deleteMany({ where: { actorId: { in: users } } });
    await db.user.deleteMany({ where: { id: { in: users } } });
    if (airline) {
      await db.fareObservation.deleteMany({ where: { airlineId: airline.id } });
      await db.flight.deleteMany({ where: { airlineId: airline.id } });
      await db.airline.delete({ where: { id: airline.id } });
    }
    await db.airport.deleteMany({ where: { id: { in: [origin?.id, destination?.id].filter(Boolean) } } });
    await redis.del('flight:airports:v1').catch(() => {});
  } finally { if (server) await new Promise(resolve => server.close(resolve)); await db.$disconnect(); redis.disconnect(); }
});

test('QA: missing refresh cookie is unauthenticated (401)', async () => {
  assert.equal((await call('/auth/refresh', { method: 'POST', auth: null })).status, 401);
});

test('QA: malformed JSON, oversized JSON, and unsupported encodings return safe client errors', async () => {
  assert.equal((await call('/auth/login', { method: 'POST', auth: null, raw: '{' })).status, 400);
  const large = await call('/auth/login', { method: 'POST', auth: null, body: { ignored: 'x'.repeat(110000) } });
  assert.equal(large.status, 413);
  assert.equal(large.json.success, false);
  assert.doesNotMatch(large.text, /stack|SyntaxError|PayloadTooLargeError|SELECT /);
  assert.equal((await call('/auth/login', { method: 'POST', auth: null, raw: '{}', headers: { 'Content-Encoding': 'invalid-qa-encoding' } })).status, 415);
  assert.equal((await call('/auth/login', { method: 'POST', auth: null, raw: '{}', headers: { 'Content-Type': 'application/json; charset=unsupported-qa' } })).status, 415);
});

test('QA: null prices cannot silently create a free fare', async () => {
  const input = { cabinClass: fare.cabinClass, basePrice: null, tax: fare.tax, baggageKg: 0, cabinBaggageKg: 7, refundable: true, totalSeats: 60 };
  try {
    assert.equal((await call('/admin/fares/' + fare.id, { method: 'PATCH', auth: admin.token, body: input })).status, 422);
    assert.equal((await db.flightFare.findUnique({ where: { id: fare.id } })).basePrice, fare.basePrice);
  } finally { await db.flightFare.update({ where: { id: fare.id }, data: { basePrice: fare.basePrice } }); }
});

test('QA: boolean and overflowing integer IDs are validation errors', async () => {
  assert.equal((await call('/bookings', { method: 'POST', body: payload([true]) })).status, 422);
  assert.equal((await call('/fares/2147483648', { auth: null })).status, 422);
});

test('QA: punctuation-only phone numbers cannot create bookings', async () => {
  const input = { ...payload(), contactPhone: '--------' };
  const response = await call('/bookings', { method: 'POST', body: input });
  assert.equal(response.status, 422);
  assert.equal(await db.booking.count({ where: { userId: owner.id, idempotencyKey: input.idempotencyKey } }), 0);
});

test('QA: changing a password invalidates older unused reset links', async () => {
  const user = await account('password-change');
  const oldReset = randomBytes(32).toString('hex');
  await db.passwordResetToken.create({ data: { userId: user.id, tokenHash: hash(oldReset), expiresAt: new Date(Date.now() + 600000) } });
  const replacement = 'Replacement-' + randomUUID();
  assert.equal((await call('/users/password', { method: 'POST', auth: user.token, body: { currentPassword: password, password: replacement } })).status, 200);
  assert.equal((await call('/auth/me', { auth: user.token })).status, 401);
  assert.equal((await call('/auth/reset-password', { method: 'POST', auth: null, body: { token: oldReset, password: 'Unused-' + randomUUID() } })).status, 400);
  assert.equal((await call('/auth/login', { method: 'POST', auth: null, body: { email: user.email, password: replacement } })).status, 200);
});

test('QA: reset tokens expire, are consumed once, and revoke existing access and refresh sessions', async () => {
  const user = await account('reset');
  const login = await call('/auth/login', { method: 'POST', auth: null, body: { email: user.email, password } });
  const expired = randomBytes(32).toString('hex'), valid = randomBytes(32).toString('hex');
  await db.passwordResetToken.createMany({ data: [{ userId: user.id, tokenHash: hash(expired), expiresAt: new Date(Date.now() - 1000) }, { userId: user.id, tokenHash: hash(valid), expiresAt: new Date(Date.now() + 600000) }] });
  const replacement = 'Reset-' + randomUUID();
  assert.equal((await call('/auth/reset-password', { method: 'POST', auth: null, body: { token: expired, password: replacement } })).status, 400);
  assert.equal((await call('/auth/reset-password', { method: 'POST', auth: null, body: { token: valid, password: replacement } })).status, 200);
  assert.equal((await call('/auth/reset-password', { method: 'POST', auth: null, body: { token: valid, password: replacement } })).status, 400);
  assert.equal((await call('/auth/me', { auth: login.json.data.accessToken })).status, 401);
  assert.equal((await call('/auth/refresh', { method: 'POST', auth: null, cookie: login.cookie })).status, 401);
});

test('QA: eight simultaneous booking retries reserve one seat and reject changed content', async () => {
  const input = payload();
  const before = (await db.flightFare.findUnique({ where: { id: fare.id } })).availableSeats;
  const results = await Promise.all(Array.from({ length: 8 }, () => call('/bookings', { method: 'POST', body: input })));
  assert.ok(results.every(result => result.status === 201));
  assert.equal(new Set(results.map(result => result.json.data.id)).size, 1);
  assert.equal((await db.flightFare.findUnique({ where: { id: fare.id } })).availableSeats, before - 1);
  assert.equal((await call('/bookings', { method: 'POST', body: { ...input, contactPhone: '0909876543' } })).status, 409);
});

test('QA: server ignores injected ownership, price, currency, and payment state', async () => {
  const value = await booking({ ...payload(), userId: outsider.id, totalAmount: 1, currency: 'USD', status: 'CONFIRMED', role: 'ADMIN' });
  assert.equal(value.userId, owner.id); assert.equal(value.totalAmount, fare.basePrice + fare.tax); assert.equal(value.currency, 'VND'); assert.equal(value.status, 'PENDING'); assert.equal(value.payment, null);
  for (const suffix of ['', '/tickets', '/pay', '/cancel']) {
    assert.equal((await call('/bookings/' + value.id + suffix, { method: ['/pay', '/cancel'].includes(suffix) ? 'POST' : 'GET', auth: outsider.token })).status, 404);
  }
  assert.equal((await call('/bookings/' + value.id, { auth: null })).status, 401);
  const expired = jwt.sign({ version: owner.tokenVersion }, env.JWT_ACCESS_SECRET, { subject: String(owner.id), expiresIn: -1, issuer: 'flight-tickets', audience: 'flight-web', algorithm: 'HS256' });
  assert.equal((await call('/auth/me', { auth: expired })).status, 401);
});

test('QA: concurrent payment and refund issue and restore exactly once', async () => {
  const value = await booking();
  const held = (await db.flightFare.findUnique({ where: { id: fare.id } })).availableSeats;
  const paid = await Promise.all(Array.from({ length: 8 }, () => call(`/bookings/${value.id}/pay`, { method: 'POST', body: { amount: 1, currency: 'USD' } })));
  assert.ok(paid.every(result => result.status === 200));
  assert.equal(await db.payment.count({ where: { bookingId: value.id } }), 1);
  assert.equal(await db.ticket.count({ where: { passenger: { bookingId: value.id } } }), 1);
  assert.equal((await db.payment.findUnique({ where: { bookingId: value.id } })).amount, value.totalAmount);
  const cancelled = await Promise.all(Array.from({ length: 8 }, () => call(`/bookings/${value.id}/cancel`, { method: 'POST' })));
  assert.ok(cancelled.every(result => result.status === 200));
  assert.equal((await db.flightFare.findUnique({ where: { id: fare.id } })).availableSeats, held + 1);
  assert.equal((await db.payment.findUnique({ where: { bookingId: value.id } })).status, 'REFUNDED');
  assert.equal(await db.ticket.count({ where: { passenger: { bookingId: value.id }, status: 'VOID' } }), 1);
  assert.equal((await call(`/bookings/${value.id}/pay`, { method: 'POST' })).status, 409);
});

test('QA: sold-out return leg rolls back the outbound reservation', async () => {
  const outboundBefore = (await db.flightFare.findUnique({ where: { id: fare.id } })).availableSeats;
  await db.flightFare.update({ where: { id: returnFare.id }, data: { availableSeats: 0 } });
  const input = payload([fare.id, returnFare.id]);
  try {
    assert.equal((await call('/bookings', { method: 'POST', body: input })).status, 409);
    assert.equal((await db.flightFare.findUnique({ where: { id: fare.id } })).availableSeats, outboundBefore);
    assert.equal(await db.booking.count({ where: { userId: owner.id, idempotencyKey: input.idempotencyKey } }), 0);
  } finally { await db.flightFare.update({ where: { id: returnFare.id }, data: { availableSeats: 60 } }); }
});

test('QA: payment racing expiry leaves one consistent booking, inventory, and ticket state', async () => {
  const value = await booking();
  const held = (await db.flightFare.findUnique({ where: { id: fare.id } })).availableSeats;
  await db.booking.update({ where: { id: value.id }, data: { expiresAt: new Date(Date.now() + 50) } });
  await Promise.all([call(`/bookings/${value.id}/pay`, { method: 'POST' }), ...Array.from({ length: 4 }, () => releaseExpired())]);
  await new Promise(resolve => setTimeout(resolve, 80)); await releaseExpired();
  const stored = await db.booking.findUnique({ where: { id: value.id }, include: { payment: true } });
  assert.ok(['CONFIRMED', 'EXPIRED'].includes(stored.status));
  const confirmed = stored.status === 'CONFIRMED';
  assert.equal(await db.payment.count({ where: { bookingId: value.id } }), confirmed ? 1 : 0);
  assert.equal(await db.ticket.count({ where: { passenger: { bookingId: value.id } } }), confirmed ? 1 : 0);
  assert.equal((await db.flightFare.findUnique({ where: { id: fare.id } })).availableSeats, held + (confirmed ? 0 : 1));
});

test('QA: cancelled operational flights do not grant review eligibility', async () => {
  const value = await booking(); await call(`/bookings/${value.id}/pay`, { method: 'POST' });
  await db.flight.update({ where: { id: flight.id }, data: { departureTime: new Date(Date.now() - 7200000), arrivalTime: new Date(Date.now() - 3600000), operationalStatus: 'CANCELLED' } });
  try { assert.equal((await call('/users/reviews', { method: 'POST', body: { airlineId: airline.id, rating: 5, comment: 'QA fixture review' } })).status, 403); }
  finally { await db.flight.update({ where: { id: flight.id }, data: { departureTime: flight.departureTime, arrivalTime: flight.arrivalTime, operationalStatus: null } }); }
});

test('QA: SMTP is disabled by default; a mocked transport verifies reset delivery and failure rollback', async () => {
  assert.equal(env.SMTP_HOST, '');
  assert.equal((await call('/auth/forgot-password', { method: 'POST', auth: null, body: { email: owner.email } })).status, 503);
  let sent;
  const transport = mock.method(mailer, 'createTransport', () => ({ sendMail: async message => { sent = message; } }));
  env.SMTP_HOST = '127.0.0.1';
  try {
    const known = await call('/auth/forgot-password', { method: 'POST', auth: null, body: { email: owner.email } });
    const unknown = await call('/auth/forgot-password', { method: 'POST', auth: null, body: { email: 'missing-' + tag + '@test.local' } });
    assert.equal(known.status, 200); assert.deepEqual(known.json, unknown.json);
    const token = sent.text.match(/token=([a-f0-9]{64})/)[1];
    assert.equal(await db.passwordResetToken.count({ where: { userId: owner.id, tokenHash: hash(token) } }), 1);
    const before = await db.passwordResetToken.count({ where: { userId: owner.id } });
    transport.mock.mockImplementation(() => ({ sendMail: async () => { throw new Error('QA transport failure'); } }));
    assert.equal((await call('/auth/forgot-password', { method: 'POST', auth: null, body: { email: owner.email } })).status, 503);
    assert.equal(await db.passwordResetToken.count({ where: { userId: owner.id } }), before);
  } finally { env.SMTP_HOST = ''; transport.mock.restore(); }
});

test('QA: Redis outage falls back to PostgreSQL and database errors reveal no internals', async () => {
  const get = mock.method(redis, 'get', async () => { throw new Error('QA unavailable'); });
  const set = mock.method(redis, 'set', async () => { throw new Error('QA unavailable'); });
  try {
    assert.equal((await call('/airports?q=' + origin.code)).json.data.some(item => item.id === origin.id), true);
    const dbModule = require('../dist/src/config/db');
    const { PrismaClient } = require('@prisma/client');
    const unavailableUrl = new URL(process.env.DATABASE_URL);
    unavailableUrl.hostname = '127.0.0.1'; unavailableUrl.port = '1'; unavailableUrl.searchParams.set('connect_timeout', '1');
    const unavailableDb = new PrismaClient({ datasources: { db: { url: unavailableUrl.toString() } } });
    dbModule.prisma = unavailableDb;
    try {
      const response = await call('/airports'); assert.equal(response.status, 500); assert.equal(response.json.success, false); assert.doesNotMatch(response.text, /INTERNAL|SQL|stack|password|database_url/i);
    } finally { dbModule.prisma = db; await unavailableDb.$disconnect(); }
  } finally { get.mock.restore(); set.mock.restore(); }
});

test('QA: a compressed request with trailing data cannot crash the API process', async () => {
  const { fork } = require('node:child_process');
  const http = require('node:http');
  const { gzipSync } = require('node:zlib');
  const child = fork(require.resolve('./fixtures/transport-server.cjs'), [], { stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
  try {
    const port = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Transport fixture did not start')), 10000);
      child.once('message', value => { clearTimeout(timer); resolve(value.port); });
      child.once('exit', () => { clearTimeout(timer); reject(new Error('Transport fixture exited before startup')); });
    });
    const compressed = Buffer.concat([gzipSync(Buffer.from('{}')), Buffer.from([0]), Buffer.alloc(102400, 88)]);
    await new Promise(resolve => {
      const request = http.request({ host: '127.0.0.1', port, path: '/api/v1/qa-probe', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Encoding': 'gzip', 'Content-Length': compressed.length } }, response => { response.resume(); response.on('end', resolve); });
      request.on('error', resolve); request.setTimeout(3000, () => { request.destroy(); resolve(); }); request.end(compressed);
    });
    await new Promise(resolve => setTimeout(resolve, 300));
    assert.equal(child.exitCode, null, 'An unauthenticated compressed request must not terminate the API');
    const response = await fetch(`http://127.0.0.1:${port}/api/v1/qa-probe`, { signal: AbortSignal.timeout(3000) });
    assert.equal(response.status, 404);
  } finally {
    if (child.exitCode === null) { const exited = new Promise(resolve => child.once('exit', resolve)); child.kill(); await exited; }
  }
});

test('QA: disabled mock payments cannot confirm a booking', async () => {
  const value = await booking(); env.ENABLE_MOCK_PAYMENTS = 'false';
  try { assert.equal((await call(`/bookings/${value.id}/pay`, { method: 'POST' })).status, 503); assert.equal(await db.payment.count({ where: { bookingId: value.id } }), 0); }
  finally { env.ENABLE_MOCK_PAYMENTS = 'true'; }
});

test('QA: search sorts, filters, empty states, invalid dates and inactive airlines follow the API contract', async () => {
  const variants = [
    { flightNumber: 'QA901', offset: 1, duration: 1, basePrice: 1900000 },
    { flightNumber: 'QA902', offset: 2, duration: 3, basePrice: 400000 },
    { flightNumber: 'QA903', offset: 3, duration: 2, basePrice: 1, operationalStatus: 'CANCELLED' },
  ];
  for (const value of variants) await db.flight.create({ data: { airlineId: airline.id, originId: origin.id, destinationId: destination.id, flightNumber: value.flightNumber, departureTime: new Date(+flight.departureTime + value.offset * 3600000), arrivalTime: new Date(+flight.departureTime + (value.offset + value.duration) * 3600000), operationalStatus: value.operationalStatus, fares: { create: { cabinClass: 'ECONOMY', basePrice: value.basePrice, tax: 100000, totalSeats: 30, availableSeats: 30, refundable: true } } } });
  const date = new Date(+flight.departureTime + 7 * 3600000).toISOString().slice(0, 10);
  const query = `/flights?origin=${origin.code}&destination=${destination.code}&date=${date}`;
  for (const [sort, property] of [['PRICE', 'price'], ['DURATION', 'duration'], ['DEPARTURE', 'departureTime']]) {
    const response = await call(query + '&sort=' + sort, { auth: null }); assert.equal(response.status, 200);
    assert.equal(response.json.data.flights.length, 3);
    assert.equal(response.json.data.flights.some(row => row.flightNumber === 'QA903'), false);
    const values = response.json.data.flights.map(row => property === 'departureTime' ? Date.parse(row[property]) : row[property]);
    assert.deepEqual(values, [...values].sort((a, b) => a - b));
  }
  assert.equal((await call(query + '&maxPrice=600000')).json.data.total, 1);
  assert.equal((await call(query + '&cabinClass=BUSINESS')).json.data.total, 0);
  assert.equal((await call(query + '&passengers=10')).status, 422);
  assert.equal((await call(query.replace(date, '2027-02-30'))).status, 422);
  assert.equal((await call(query.replace(date, '2000-01-01'))).status, 400);
  assert.equal((await call('/flights?origin=SGN&destination=SGN&date=' + date)).status, 422);
  assert.equal((await call('/fares/1%27%20OR%201%3D1')).status, 422);
  await db.airline.update({ where: { id: airline.id }, data: { isActive: false } });
  try { assert.equal((await call(query)).json.data.total, 0); assert.equal((await call('/bookings', { method: 'POST', body: payload() })).status, 409); }
  finally { await db.airline.update({ where: { id: airline.id }, data: { isActive: true } }); }
});

test('QA: profile, preferences, favorites and assistant history remain user-scoped', async () => {
  const profile = await call('/users/profile', { method: 'PATCH', body: { fullName: 'QA Updated', phone: '0901234567', role: 'ADMIN', id: outsider.id, tokenVersion: 100 } });
  assert.equal(profile.status, 200); assert.equal(profile.json.data.id, owner.id); assert.equal(profile.json.data.role, 'USER'); assert.doesNotMatch(profile.text, /passwordHash|tokenVersion/);
  const preference = { cabinClass: 'ECONOMY', maxBudget: 1500000, preferredAirlines: [airline.code], prioritize: 'PRICE' };
  assert.equal((await call('/users/preferences', { method: 'PUT', body: preference })).status, 200);
  assert.equal((await call('/users/preferences')).json.data.maxBudget, 1500000);
  assert.equal((await call('/users/preferences', { auth: outsider.token })).json.data, null);
  assert.equal((await call('/users/preferences', { method: 'PUT', body: { ...preference, prioritize: 'INVALID' } })).status, 422);
  const route = { originId: origin.id, destinationId: destination.id };
  const favorite = (await call('/users/favorites', { method: 'POST', body: route })).json.data;
  assert.equal((await call('/users/favorites', { method: 'POST', body: route })).json.data.id, favorite.id);
  assert.equal((await call('/users/favorites', { auth: outsider.token })).json.data.length, 0);
  await call('/users/favorites/' + favorite.id, { method: 'DELETE', auth: outsider.token });
  assert.ok(await db.favoriteRoute.findUnique({ where: { id: favorite.id } }));
  await call('/users/favorites/' + favorite.id, { method: 'DELETE' });
  assert.equal(await db.favoriteRoute.findUnique({ where: { id: favorite.id } }), null);
  const search = { origin: origin.code, destination: destination.code, date: new Date(+flight.departureTime + 7 * 3600000).toISOString().slice(0, 10), passengers: 1, cabinClass: 'ECONOMY' };
  const recommendation = await call('/assistant/recommend', { method: 'POST', body: { query: 'tiet kiem', search } });
  assert.equal(recommendation.status, 200); assert.equal(recommendation.json.data.engine, 'WEIGHTED_RANKING'); assert.ok(recommendation.json.data.flights.length <= 3);
  assert.equal((await call('/users/search-history')).json.data.length, 1);
  assert.equal((await call('/users/search-history', { auth: outsider.token })).json.data.length, 0);
});

test('QA: completed travel permits one review; moderation and deletion affect public reviews', async () => {
  const value = await booking(); await call(`/bookings/${value.id}/pay`, { method: 'POST' });
  await db.flight.update({ where: { id: flight.id }, data: { departureTime: new Date(Date.now() - 7200000), arrivalTime: new Date(Date.now() - 3600000), operationalStatus: 'LANDED' } });
  try {
    const first = await call('/users/reviews', { method: 'POST', body: { airlineId: airline.id, rating: 4, comment: 'QA review <script>literal text</script>' } });
    assert.equal(first.status, 200);
    assert.equal((await call('/users/reviews', { method: 'POST', body: { airlineId: airline.id, rating: 5, comment: 'QA edited review' } })).json.data.id, first.json.data.id);
    assert.equal((await call('/airlines/' + airline.id + '/reviews', { auth: null })).json.data.length, 1);
    assert.equal((await call('/admin/reviews/' + first.json.data.id, { method: 'PATCH', auth: admin.token, body: { isVisible: false } })).status, 200);
    assert.equal((await call('/airlines/' + airline.id + '/reviews', { auth: null })).json.data.length, 0);
    assert.equal((await call('/admin/reviews/' + first.json.data.id, { method: 'DELETE', auth: admin.token })).status, 200);
    assert.equal(await db.review.count({ where: { userId: owner.id, airlineId: airline.id } }), 0);
  } finally { await db.flight.update({ where: { id: flight.id }, data: { departureTime: flight.departureTime, arrivalTime: flight.arrivalTime, operationalStatus: null } }); }
});

test('QA: airport CRUD validates duplicates, coordinates, timezone, and referenced deletion', async () => {
  let code;
  do { code = 'J' + Array.from(randomBytes(2), n => String.fromCharCode(65 + n % 26)).join(''); } while (await db.airport.findUnique({ where: { code } }));
  const input = { code, name: 'QA Temporary Airport', city: 'QA City', country: 'QA', timezone: 'Asia/Ho_Chi_Minh', latitude: 10, longitude: 106 };
  const created = await call('/admin/airports', { method: 'POST', auth: admin.token, body: input }); assert.equal(created.status, 201);
  try {
    assert.equal((await call('/admin/airports', { method: 'POST', auth: admin.token, body: input })).status, 409);
    assert.equal((await call('/admin/airports/' + created.json.data.id, { method: 'PUT', auth: admin.token, body: { ...input, city: 'QA Updated City' } })).status, 200);
    assert.equal((await call('/admin/airports', { method: 'POST', auth: admin.token, body: { ...input, latitude: 91 } })).status, 422);
    assert.equal((await call('/admin/airports', { method: 'POST', auth: admin.token, body: { ...input, timezone: 'Invalid/QA' } })).status, 422);
    assert.equal((await call('/admin/airports/' + origin.id, { method: 'DELETE', auth: admin.token })).status, 409);
  } finally { assert.equal((await call('/admin/airports/' + created.json.data.id, { method: 'DELETE', auth: admin.token })).status, 200); }
});

test('QA: administrative role and lock changes revoke access and refresh tokens', async () => {
  const user = await account('role-change');
  const login = await call('/auth/login', { method: 'POST', auth: null, body: { email: user.email, password } });
  assert.match(login.headers.get('set-cookie'), /HttpOnly/i); assert.match(login.headers.get('set-cookie'), /SameSite=Lax/i);
  assert.equal((await call('/admin/users/' + user.id, { method: 'PATCH', auth: admin.token, body: { role: 'ADMIN' } })).status, 200);
  assert.equal((await call('/auth/me', { auth: login.json.data.accessToken })).status, 401);
  assert.equal((await call('/auth/refresh', { method: 'POST', auth: null, cookie: login.cookie })).status, 401);
  const elevated = await call('/auth/login', { method: 'POST', auth: null, body: { email: user.email, password } });
  assert.equal(elevated.json.data.user.role, 'ADMIN');
  assert.equal((await call('/admin/users/' + user.id, { method: 'PATCH', auth: admin.token, body: { isActive: false } })).status, 200);
  assert.equal((await call('/admin/dashboard', { auth: elevated.json.data.accessToken })).status, 401);
  assert.equal((await call('/auth/login', { method: 'POST', auth: null, body: { email: user.email, password } })).status, 401);
});

test('QA: logout requires the correct origin and revokes its refresh cookie', async () => {
  const login = await call('/auth/login', { method: 'POST', auth: null, body: { email: owner.email, password } });
  assert.equal((await call('/auth/logout', { method: 'POST', auth: null, cookie: login.cookie, origin: 'https://qa-untrusted.invalid' })).status, 403);
  const logout = await call('/auth/logout', { method: 'POST', auth: null, cookie: login.cookie });
  assert.equal(logout.status, 200); assert.match(logout.headers.get('set-cookie'), /flight_refresh=;/);
  assert.equal((await call('/auth/refresh', { method: 'POST', auth: null, cookie: login.cookie })).status, 401);
  const headers = (await call('/health', { auth: null })).headers;
  assert.equal(headers.get('x-powered-by'), null); assert.equal(headers.get('x-content-type-options'), 'nosniff'); assert.equal(headers.get('access-control-allow-origin'), env.FRONTEND_URL);
});

test('QA: authentication rate limiting cannot be bypassed with spoofed forwarding headers', async () => {
  let response;
  for (let index = 0; index < 22; index++) response = await call('/auth/login', { method: 'POST', auth: null, body: {}, headers: { 'X-Forwarded-For': `198.51.100.${index + 1}` } });
  assert.equal(response.status, 429); assert.equal(response.json.success, false); assert.ok(response.headers.get('ratelimit'));
});
