const test = require('node:test');
const assert = require('node:assert/strict');
const { rankFlights, haversineKm, normalize } = require('../dist/src/utils/flight-ranking');
const { bookingSchema, searchSchema, flightSchema, password } = require('../dist/src/validators');
test('Vietnamese airport search normalizes accents and Đ', () => {
  assert.equal(normalize('Đà Nẵng'), 'da nang');
  assert.equal(normalize('TÂN SƠN NHẤT'), 'tan son nhat');
});
test('ranking changes with price/duration priorities and stays deterministic', () => {
  const flights = [{ id: 1, price: 1000000, duration: 150, airlineCode: 'VN' }, { id: 2, price: 2000000, duration: 70, airlineCode: 'VJ' }];
  assert.equal(rankFlights(flights, { prioritize: 'PRICE' })[0].id, 1);
  assert.equal(rankFlights(flights, { prioritize: 'DURATION' })[0].id, 2);
  assert.deepEqual(rankFlights(flights), rankFlights(flights));
  assert.deepEqual(rankFlights([]), []);
  assert.ok(rankFlights([{ id: 3, price: 0, duration: 0, airlineCode: 'VN' }])[0].score >= 0);
});
test('Haversine distance agrees for the same airport and SGN-HAN', () => {
  const sgn = { latitude: 10.8188, longitude: 106.652 }, han = { latitude: 21.2212, longitude: 105.8072 };
  assert.equal(haversineKm(sgn, sgn),0);
  assert.ok(haversineKm(sgn, han)>1100 && haversineKm(sgn, han)<1200);
});
test('search rejects nonexistent calendar dates, same airports, and excessive passengers', () => {
  const base = { origin: 'SGN', destination: 'HAN', date: '2027-01-20' };
  assert.ok(searchSchema.safeParse(base).success);
  assert.equal(searchSchema.safeParse({ ...base, date: '2027-02-30' }).success,false);
  assert.equal(searchSchema.safeParse({ ...base, destination: 'SGN' }).success,false);
  assert.equal(searchSchema.safeParse({ ...base, passengers: 10 }).success,false);
});
test('booking rejects duplicate fares and duplicate passenger documents', () => {
  const p = { fullName: 'Nguyen Van A', dateOfBirth: '1995-02-10', documentNumber: '123456789', nationality: 'VN' };
  const b = { fareIds: [1], passengers: [p], contactEmail: 'demo@example.com', contactPhone: '0901234567', idempotencyKey: '42a2f3ce-72fa-40d8-b37e-eb7c3cd7401a' };
  assert.ok(bookingSchema.safeParse(b).success);
  assert.equal(bookingSchema.safeParse({ ...b, fareIds: [1,1] }).success,false);
  assert.equal(bookingSchema.safeParse({ ...b, passengers: [p,p] }).success,false);
  assert.equal(bookingSchema.safeParse({ ...b, passengers: [{ ...p,dateOfBirth: '2999-01-01' }] }).success,false);
});
test('flight validation rejects reversed arrival, identical airports, and negative fares', () => {
  const base = { airlineId: 1, originId: 1, destinationId: 2, flightNumber: 'VN123', aircraft: 'Airbus A321', departureTime: '2099-01-01T10:00:00Z', arrivalTime: '2099-01-01T12:00:00Z', fares: [{ cabinClass: 'ECONOMY', basePrice: 1, tax: 0, baggageKg: 0, totalSeats: 10 }] };
  assert.ok(flightSchema.safeParse(base).success);
  assert.equal(flightSchema.safeParse({ ...base, arrivalTime: '2099-01-01T08:00:00Z' }).success,false);
  assert.equal(flightSchema.safeParse({ ...base, destinationId: 1 }).success,false);
  assert.equal(flightSchema.safeParse({ ...base, fares: [{ ...base.fares[0], basePrice: -1 }] }).success,false);
});
test('bcrypt password validation rejects multibyte truncation', () => {
  assert.equal(password.safeParse('a'.repeat(72)).success,true);
  assert.equal(password.safeParse('ế'.repeat(30)).success,false);
});

test('numeric inputs reject null, booleans, arrays and empty strings without losing numeric form support', () => {
  const { id, fareSchema, airportSchema } = require('../dist/src/validators');
  for (const invalid of [null, true, false, [], [1], '', '   ']) {
    assert.equal(id.safeParse(invalid).success, false);
    assert.equal(fareSchema.safeParse({ cabinClass: 'ECONOMY', basePrice: invalid, tax: 0, baggageKg: 0, totalSeats: 10 }).success, false);
  }
  assert.equal(id.safeParse('42').success, true);
  assert.equal(id.safeParse(2147483648).success, false);
  assert.equal(fareSchema.safeParse({ cabinClass: 'ECONOMY', basePrice: 0, tax: '0', baggageKg: '0', totalSeats: '10' }).success, true);
  assert.equal(airportSchema.safeParse({ code: 'QAA', name: 'QA Airport', city: 'QA City', latitude: null, longitude: 106 }).success, false);
});
