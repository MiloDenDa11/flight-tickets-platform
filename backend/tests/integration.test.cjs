const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID, randomBytes } = require('node:crypto');
if (process.env.RUN_FLIGHT_INTEGRATION !== '1' || new URL(process.env.DATABASE_URL).searchParams.get('schema') !== 'flight_platform_test') throw new Error('Run via npm run test:integration (isolated test schema)');
const app = require('../dist/src/app').default;
const { prisma: db } = require('../dist/src/config/db');
const { redis } = require('../dist/src/config/redis');
const { releaseExpired } = require('../dist/src/services/booking.service');
const { env } = require('../dist/src/config/env');
let server, base, token, cookie, otherToken, userId, otherId, airportA, airportB, airline, fare, fare2, returnFare, fixtureFlight;
const tag = randomBytes(4).toString('hex');
const airportCodes = ['X'+randomBytes(1).toString('hex').slice(0,2).toUpperCase(), 'Z'+randomBytes(1).toString('hex').slice(0,2).toUpperCase()].map(s => s.replace(/[0-9]/g,c => String.fromCharCode(65+Number(c))));
const date = new Date(Date.now() + 3*86400000 + 7*3600000).toISOString().slice(0,10);
async function call(path, { method = 'GET', body, auth = token, sessionCookie, origin = env.FRONTEND_URL } = {}) {
  const res = await fetch(base+'/api/v1'+path, { method, headers: { ...(auth ? { Authorization: 'Bearer '+auth } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}), ...(sessionCookie ? { Cookie: sessionCookie } : {}), ...(origin ? { Origin: origin } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const text = await res.text(); let json; try { json=JSON.parse(text); } catch {}
  return { status: res.status, json, text, cookie: res.headers.get('set-cookie')?.split(';')[0] };
}
const payload = (fid = fare.id, key = randomUUID()) => ({ fareIds: [fid], passengers: [{ fullName: 'Nguyen Test', dateOfBirth: '1992-01-01', documentNumber: 'TEST123456', nationality: 'VN' }], contactEmail: 'test@example.com', contactPhone: '0901234567', idempotencyKey: key });
before(async () => {
  server = app.listen(0,'127.0.0.1'); await new Promise(r => server.once('listening',r)); base = 'http://127.0.0.1:'+server.address().port;
  const password = 'Test-' + randomUUID();
  const a = await call('/auth/register',{ method: 'POST', auth: null, body: { fullName: 'Test User', email: tag+'@test.local', password, role: 'ADMIN' } });
  assert.equal(a.status,200); token=a.json.data.accessToken; cookie=a.cookie; userId=a.json.data.user.id;
  const b = await call('/auth/register',{ method: 'POST', auth: null, body: { fullName: 'Other User', email: tag+'-other@test.local', password } });
  otherToken=b.json.data.accessToken; otherId=b.json.data.user.id;
  airportA = await db.airport.create({ data: { code: airportCodes[0], name: 'Đà Test '+tag, city: 'Đà Test', latitude: 10, longitude: 106 } });
  airportB = await db.airport.create({ data: { code: airportCodes[1], name: 'Test Arrival '+tag, city: 'Test City', latitude: 20, longitude: 105 } });
  airline = await db.airline.create({ data: { code: tag.slice(0,3).toUpperCase(), name: 'Fixture Airline '+tag } });
  fixtureFlight = await db.flight.create({ data: { airlineId: airline.id, originId: airportA.id, destinationId: airportB.id, flightNumber: 'XT'+tag, departureTime: new Date(date+'T09:00:00+07:00'), arrivalTime: new Date(date+'T11:00:00+07:00'), fares: { create: [{ cabinClass: 'ECONOMY', basePrice: 900000, tax: 100000, totalSeats: 1, availableSeats: 1 }, { cabinClass: 'PREMIUM', basePrice: 2000000, tax: 100000, totalSeats: 20, availableSeats: 20, refundable: true }] } }, include: { fares: true } });
  fare=fixtureFlight.fares.find(f => f.cabinClass==='ECONOMY'); fare2=fixtureFlight.fares.find(f => f.cabinClass==='PREMIUM');
  const ret = await db.flight.create({ data: { airlineId: airline.id, originId: airportB.id, destinationId: airportA.id, flightNumber: 'XR'+tag, departureTime: new Date(date+'T18:00:00+07:00'), arrivalTime: new Date(date+'T20:00:00+07:00'), fares: { create: { cabinClass: 'PREMIUM', basePrice: 2000000, tax: 100000, totalSeats: 20, availableSeats: 20, refundable: true } } }, include: { fares: true } });
  returnFare=ret.fares[0];
});
after(async () => {
  try {
    const ids = [userId,otherId].filter(Boolean); const bookings=await db.booking.findMany({ where: { userId: { in: ids } }, select: { id: true } });
    await db.payment.deleteMany({ where: { bookingId: { in: bookings.map(b => b.id) } } });
    await db.booking.deleteMany({ where: { id: { in: bookings.map(b => b.id) } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
    if (airline) await db.flight.deleteMany({ where: { airlineId: airline.id } });
    if (airline) await db.airline.delete({ where: { id: airline.id } });
    await db.airport.deleteMany({ where: { id: { in: [airportA?.id,airportB?.id].filter(Boolean) } } });
  } finally { await new Promise(r => server.close(r)); await db.$disconnect(); redis.disconnect(); }
});
test('database health, airport normalization and public search', async () => {
  assert.equal((await call('/health')).status,200);
  assert.equal((await call('/airports?q=da%20test')).json.data.some(a => a.id===airportA.id),true);
  const res = await call(`/flights?origin=${airportA.code}&destination=${airportB.code}&date=${date}&passengers=1&cabinClass=ECONOMY`);
  assert.equal(res.status,200); assert.equal(res.json.data.flights[0].price,1000000);
});
test('registration cannot elevate privileges; protected endpoints reject anonymous and normal users', async () => {
  assert.equal((await call('/auth/me')).json.data.role,'USER');
  assert.equal((await call('/bookings',{ auth:null })).status,401);
  assert.equal((await call('/admin/dashboard')).status,403);
  assert.equal((await call('/auth/refresh',{ method:'POST',auth:null,sessionCookie:cookie,origin:'https://evil.example' })).status,403);
});
test('refresh token is single-use and rotates securely', async () => {
  const res=await call('/auth/refresh',{ method:'POST',auth:null,sessionCookie:cookie });
  assert.equal(res.status,200); assert.ok(res.cookie); assert.notEqual(res.cookie,cookie);
  assert.equal((await call('/auth/refresh',{ method:'POST',auth:null,sessionCookie:cookie })).status,401);
  cookie=res.cookie; token=res.json.data.accessToken;
});
test('last seat cannot be sold twice under concurrent requests', async () => {
  const results=await Promise.all([call('/bookings',{ method:'POST',body:payload() }),call('/bookings',{ method:'POST',auth:otherToken,body:payload() })]);
  assert.deepEqual(results.map(r => r.status).sort(),[201,409]);
  assert.equal((await db.flightFare.findUnique({ where:{ id:fare.id } })).availableSeats,0);
  const winner=results.find(r => r.status===201).json.data;
  const winnerToken=winner.userId===userId?token:otherToken;
  assert.equal((await call('/bookings/'+winner.id+'/cancel',{ method:'POST',auth:winnerToken })).status,200);
  assert.equal((await db.flightFare.findUnique({ where:{ id:fare.id } })).availableSeats,1);
});
test('booking retries are idempotent and reject changed payload under same key', async () => {
  const input=payload(fare2.id); const before=await db.flightFare.findUnique({ where:{ id:fare2.id } });
  const a=await call('/bookings',{ method:'POST',body:input }),b=await call('/bookings',{ method:'POST',body:input });
  assert.equal(a.status,201); assert.equal(a.json.data.id,b.json.data.id);
  assert.equal((await db.flightFare.findUnique({ where:{ id:fare2.id } })).availableSeats,before.availableSeats-1);
  assert.equal((await call('/bookings',{ method:'POST',body:{ ...input,contactPhone:'0909876543' } })).status,409);
});
test('payment issues one ticket set, blocks ownership abuse and supports refund cancellation', async () => {
  const b=(await call('/bookings',{ method:'POST',body:payload(fare2.id) })).json.data;
  assert.equal((await call(`/bookings/${b.id}`,{ auth:otherToken })).status,404);
  assert.equal((await call(`/bookings/${b.id}/pay`,{ method:'POST',auth:otherToken })).status,404);
  const paid=await Promise.all([call(`/bookings/${b.id}/pay`,{ method:'POST' }),call(`/bookings/${b.id}/pay`,{ method:'POST' })]);
  assert.deepEqual(paid.map(p => p.status),[200,200]);
  assert.equal(await db.payment.count({ where:{ bookingId:b.id } }),1);
  assert.equal(await db.ticket.count({ where:{ passenger:{ bookingId:b.id } } }),1);
  assert.match((await call(`/bookings/${b.id}/tickets`)).text,/FT-/);
  const cancelled=await call(`/bookings/${b.id}/cancel`,{ method:'POST' }); assert.equal(cancelled.json.data.payment.status,'REFUNDED');
  assert.equal(cancelled.json.data.passengers[0].tickets[0].status,'VOID');
  const seats=(await db.flightFare.findUnique({ where:{ id:fare2.id } })).availableSeats;
  await call(`/bookings/${b.id}/cancel`,{ method:'POST' });
  assert.equal((await db.flightFare.findUnique({ where:{ id:fare2.id } })).availableSeats,seats);
});
test('expired hold releases seats exactly once and cannot be paid', async () => {
  const b=(await call('/bookings',{ method:'POST',body:payload(fare2.id) })).json.data;
  const held=(await db.flightFare.findUnique({ where:{ id:fare2.id } })).availableSeats;
  await db.booking.update({ where:{ id:b.id },data:{ expiresAt:new Date(Date.now()-1000) } });
  await Promise.all([releaseExpired(),releaseExpired()]);
  assert.equal((await db.flightFare.findUnique({ where:{ id:fare2.id } })).availableSeats,held+1);
  assert.equal((await call(`/bookings/${b.id}/pay`,{ method:'POST' })).status,409);
});
test('nonrefundable confirmed tickets cannot be cancelled', async () => {
  const b=(await call('/bookings',{ method:'POST',body:payload(fare.id) })).json.data;
  assert.equal((await call(`/bookings/${b.id}/pay`,{ method:'POST' })).status,200);
  assert.equal((await call(`/bookings/${b.id}/cancel`,{ method:'POST' })).status,409);
});
test('round trip creates one ticket for each passenger on each segment', async () => {
  const input=payload(fare2.id); input.fareIds.push(returnFare.id); input.passengers.push({ ...input.passengers[0],fullName:'Other Passenger',documentNumber:'TEST987654' });
  const b=await call('/bookings',{ method:'POST',body:input }); assert.equal(b.status,201);
  assert.equal(b.json.data.totalAmount,8400000);
  const paid=await call(`/bookings/${b.json.data.id}/pay`,{ method:'POST' }); assert.equal(paid.status,200);
  assert.equal(paid.json.data.passengers.flatMap(p => p.tickets).length,4);
});
test('fare repricing preserves existing booking totals', async () => {
  const input=payload(fare2.id), b=(await call('/bookings',{ method:'POST',body:input })).json.data;
  const oldTotal=b.totalAmount;
  await db.flightFare.update({ where:{ id:fare2.id },data:{ basePrice:{ increment:500000 } } });
  const r=(await call(`/bookings/${b.id}/pay`,{ method:'POST' })).json.data;
  assert.equal(r.totalAmount,oldTotal); assert.equal(r.payment.amount,oldTotal);
});
test('reviews require a completed booked flight; preferences and favorites are user scoped', async () => {
  assert.equal((await call('/users/reviews',{ method:'POST',body:{ airlineId:airline.id,rating:5,comment:'Good flight' } })).status,403);
  assert.equal((await call('/users/favorites',{ method:'POST',body:{ originId:airportA.id,destinationId:airportB.id } })).status,200);
  assert.equal((await call('/users/favorites',{ auth:otherToken })).json.data.length,0);
});
test('database rejects negative inventory even outside the application', async () => {
  await assert.rejects(db.flightFare.update({ where:{ id:fare2.id },data:{ availableSeats:-1 } }));
});
test('fare policy changes do not remove refund rights or baggage already booked', async () => {
  const b=(await call('/bookings',{ method:'POST',body:payload(fare2.id) })).json.data;
  await db.flightFare.update({ where:{ id:fare2.id },data:{ refundable:false,baggageKg:32 } });
  const paid=(await call(`/bookings/${b.id}/pay`,{ method:'POST' })).json.data;
  assert.equal(paid.segments[0].refundable,true); assert.equal(paid.segments[0].baggageKg,0);
  assert.equal((await call(`/bookings/${b.id}/cancel`,{ method:'POST' })).status,200);
  await db.flightFare.update({ where:{ id:fare2.id },data:{ refundable:true,baggageKg:0 } });
});
test('admin can create flights but cannot invalidate active bookings, overshrink inventory or lock itself', async () => {
  await db.user.update({ where:{ id:userId },data:{ role:'ADMIN',tokenVersion:{ increment:1 } } });
  assert.equal((await call('/admin/dashboard')).status,401);
  const refreshed=await call('/auth/refresh',{ method:'POST',sessionCookie:cookie }); token=refreshed.json.data.accessToken;
  assert.equal((await call('/admin/dashboard')).status,200);
  assert.equal((await call('/admin/users/'+userId,{ method:'PATCH',body:{ isActive:false } })).status,400);
  assert.equal((await call('/admin/flights/'+fixtureFlight.id+'/status',{ method:'PATCH',body:{ status:'CANCELLED' } })).status,409);
  const edit={ cabinClass:'PREMIUM',basePrice:2100000,tax:100000,baggageKg:0,cabinBaggageKg:7,refundable:true,totalSeats:1 };
  assert.equal((await call('/admin/fares/'+fare2.id,{ method:'PATCH',body:edit })).status,400);
  const flight={ airlineId:airline.id,originId:airportA.id,destinationId:airportB.id,flightNumber:'XT9999',aircraft:'Airbus A321',departureTime:new Date(date+'T15:00:00+07:00').toISOString(),arrivalTime:new Date(date+'T17:00:00+07:00').toISOString(),fares:[{...edit,cabinClass:'ECONOMY',totalSeats:25}] };
  const result=await call('/admin/flights',{ method:'POST',body:flight }); assert.equal(result.status,201); assert.equal(result.json.data.fares[0].availableSeats,25);
  assert.equal((await call('/admin/airports/'+airportA.id,{ method:'DELETE' })).status,409);
});
