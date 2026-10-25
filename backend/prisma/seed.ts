import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { haversineKm } from '../src/utils/flight-ranking';
const db = new PrismaClient();
async function main() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const userPassword = process.env.SEED_USER_PASSWORD;
  if (!adminPassword || !userPassword || adminPassword.length < 8 || userPassword.length < 8) throw new Error('Run npm run setup, or set SEED_ADMIN_PASSWORD and SEED_USER_PASSWORD (8+ characters)');
  for (const u of [{ email: 'admin@flight.local', fullName: 'Quản trị Flight Tickets', role: 'ADMIN', password: adminPassword }, { email: 'demo@flight.local', fullName: 'Nguyễn Minh Anh', role: 'USER', password: userPassword }]) {
    await db.user.upsert({ where: { email: u.email }, create: { email: u.email, fullName: u.fullName, role: u.role, passwordHash: await bcrypt.hash(u.password, 12) }, update: {} });
  }
  const airportData = [
    { code: 'SGN', name: 'Tân Sơn Nhất', city: 'TP. Hồ Chí Minh', latitude: 10.8188, longitude: 106.6520 },
    { code: 'HAN', name: 'Nội Bài', city: 'Hà Nội', latitude: 21.2212, longitude: 105.8072 },
    { code: 'DAD', name: 'Đà Nẵng', city: 'Đà Nẵng', latitude: 16.0439, longitude: 108.1993 },
    { code: 'CXR', name: 'Cam Ranh', city: 'Nha Trang', latitude: 11.9982, longitude: 109.2194 },
    { code: 'PQC', name: 'Phú Quốc', city: 'Phú Quốc', latitude: 10.1698, longitude: 103.9931 },
    { code: 'DLI', name: 'Liên Khương', city: 'Đà Lạt', latitude: 11.7500, longitude: 108.3670 },
    { code: 'HPH', name: 'Cát Bi', city: 'Hải Phòng', latitude: 20.8194, longitude: 106.7249 },
    { code: 'SIN', name: 'Changi', city: 'Singapore', country: 'Singapore', timezone: 'Asia/Singapore', latitude: 1.3644, longitude: 103.9915 },
    { code: 'BKK', name: 'Suvarnabhumi', city: 'Bangkok', country: 'Thái Lan', timezone: 'Asia/Bangkok', latitude: 13.6900, longitude: 100.7501 },
  ];
  for (const a of airportData) await db.airport.upsert({ where: { code: a.code }, create: a, update: {} });
  for (const a of [{ code: 'VN', name: 'Vietnam Airlines', color: '#08747b' }, { code: 'VJ', name: 'Vietjet Air', color: '#d43743' }, { code: 'QH', name: 'Bamboo Airways', color: '#39846c' }]) await db.airline.upsert({ where: { code: a.code }, create: {...a,country:'Việt Nam',logoUrl:'/brands/cards/'+a.code.toLowerCase()+'.svg',website:({VN:'https://www.vietnamairlines.com/',VJ:'https://www.vietjetair.com/',QH:'https://www.bambooairways.com/'} as Record<string,string>)[a.code]}, update: {} });
  const airports = await db.airport.findMany();
  const airlines = await db.airline.findMany({ orderBy: { code: 'asc' } });
  const routes = [['SGN', 'HAN'], ['SGN', 'DAD'], ['SGN', 'CXR'], ['SGN', 'PQC'], ['SGN', 'DLI'], ['HAN', 'DAD'], ['HAN', 'PQC'], ['HAN', 'HPH'], ['SGN', 'SIN'], ['SGN', 'BKK']].flatMap(([a,b]) => [[a,b], [b,a]]);
  const startDay = new Date(Date.now() + 7 * 3600000).toISOString().slice(0,10);
  const midnight = new Date(startDay + 'T00:00:00+07:00');
  const flights = [];
  for (let day = 1; day <= 35; day++) for (let r = 0; r < routes.length; r++) for (let slot = 0; slot < 3; slot++) {
    const [from, to] = routes[r];
    const origin = airports.find(a => a.code === from)!;
    const destination = airports.find(a => a.code === to)!;
    const airline = airlines[slot % airlines.length];
    const duration = Math.round((haversineKm({ latitude: +origin.latitude, longitude: +origin.longitude }, { latitude: +destination.latitude, longitude: +destination.longitude }) / 720 * 60 + 30) / 5) * 5;
    const departureTime = new Date(+midnight + day * 86400000 + (7 + slot * 5) * 3600000 + (r % 3) * 20 * 60000);
    flights.push({ airlineId: airline.id, originId: origin.id, destinationId: destination.id, flightNumber: airline.code + String(100 + r * 3 + slot), aircraft: slot === 1 ? 'Airbus A320' : 'Airbus A321', departureTime, arrivalTime: new Date(+departureTime + duration * 60000) });
  }
  await db.flight.createMany({ data: flights, skipDuplicates: true });
  const all = await db.flight.findMany({ where: { departureTime: { gte: midnight } } });
  await db.flightFare.createMany({ skipDuplicates: true, data: all.flatMap(f => ['ECONOMY', 'PREMIUM', 'BUSINESS'].map((cabinClass, index) => ({
    flightId: f.id, cabinClass, basePrice: 490000 + (f.originId + f.destinationId) * 40000 + (f.id % 7) * 70000 + index * 1600000,
    tax: 385000, baggageKg: index === 0 ? 0 : index === 1 ? 20 : 32, cabinBaggageKg: index === 2 ? 12 : 7,
    refundable: index > 0, totalSeats: index === 0 ? 120 : 16, availableSeats: index === 0 ? 120 : 16,
  }))) });
  await db.$executeRaw`INSERT INTO fare_observations (fare_id,flight_id,airline_id,airline_code,airline_name,flight_number,origin_code,destination_code,origin_country,destination_country,departure_time,cabin_class,base_price,tax,total_price,currency,source,recorded_at) SELECT ff.id,f.id,a.id,a.code,a.name,f.flight_number,o.code,d.code,o.country,d.country,f.departure_time,ff.cabin_class,ff.base_price,ff.tax,ff.base_price+ff.tax,'VND',ff.source,CURRENT_TIMESTAMP FROM flight_fares ff JOIN flights f ON f.id=ff.flight_id JOIN airlines a ON a.id=f.airline_id JOIN airports o ON o.id=f.origin_id JOIN airports d ON d.id=f.destination_id WHERE NOT EXISTS (SELECT 1 FROM fare_observations observed WHERE observed.fare_id=ff.id)`;
  console.log(`Seed complete: ${airports.length} airports, ${airlines.length} airlines, ${all.length} upcoming demo flights. Existing bookings, fares and passwords preserved.`);
}
main().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => db.$disconnect());
