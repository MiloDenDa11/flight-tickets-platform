import { z } from 'zod';
export const id = z.coerce.number().int().positive();
export const cabin = z.enum(['ECONOMY', 'PREMIUM', 'BUSINESS']);
export const password = z.string().min(8).max(72).refine(s => Buffer.byteLength(s, 'utf8') <= 72, 'Mật khẩu tối đa 72 byte');
export const registerSchema = z.object({ fullName: z.string().trim().min(2).max(100), email: z.string().trim().email().max(255).transform(s => s.toLowerCase()), password });
export const loginSchema = registerSchema.pick({ email: true }).extend({ password: z.string().min(1).max(200) });
export const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s => !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s, 'Ngày không hợp lệ');
export const searchSchema = z.object({
  origin: z.string().length(3).transform(s => s.toUpperCase()), destination: z.string().length(3).transform(s => s.toUpperCase()),
  date: day, passengers: z.coerce.number().int().min(1).max(9).default(1),
  cabinClass: cabin.default('ECONOMY'), sort: z.enum(['PRICE', 'DURATION', 'DEPARTURE', 'RECOMMENDED']).default('PRICE'),
  airline: z.string().max(3).optional(), maxPrice: z.coerce.number().int().positive().max(100000000).optional(),
}).refine(s => s.origin !== s.destination, 'Điểm đi và điểm đến phải khác nhau');
export const passengerSchema = z.object({ fullName: z.string().trim().min(2).max(100), dateOfBirth: day.refine(s => new Date(s) <= new Date(), 'Ngày sinh phải trong quá khứ'), documentNumber: z.string().trim().regex(/^[A-Za-z0-9-]{5,30}$/), nationality: z.string().regex(/^[A-Z]{2}$/).default('VN') });
export const bookingSchema = z.object({
  fareIds: z.array(id).min(1).max(2).refine(v => new Set(v).size === v.length),
  passengers: z.array(passengerSchema).min(1).max(9),
  contactEmail: z.string().trim().email().max(255), contactPhone: z.string().trim().regex(/^\+?[0-9 ()-]{8,25}$/),
  idempotencyKey: z.string().uuid(),
}).refine(v => new Set(v.passengers.map(p => p.documentNumber.toUpperCase())).size === v.passengers.length, 'Giấy tờ hành khách bị trùng');
export const airportSchema = z.object({ code: z.string().regex(/^[A-Z]{3}$/), name: z.string().trim().min(2).max(150), city: z.string().trim().min(2).max(100), country: z.string().max(100).default('Việt Nam'), timezone: z.string().max(60).default('Asia/Ho_Chi_Minh').refine(v => { try { new Intl.DateTimeFormat('en', { timeZone: v }); return true; } catch { return false; } }), latitude: z.coerce.number().min(-90).max(90), longitude: z.coerce.number().min(-180).max(180) });
export const airlineSchema = z.object({ code: z.string().regex(/^[A-Z0-9]{2,3}$/), name: z.string().trim().min(2).max(100), color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#086c72'), isActive: z.boolean().default(true) });
export const fareSchema = z.object({ cabinClass: cabin, basePrice: z.coerce.number().int().min(0).max(100000000), tax: z.coerce.number().int().min(0).max(10000000), baggageKg: z.coerce.number().int().min(0).max(60), cabinBaggageKg: z.coerce.number().int().min(0).max(20).default(7), refundable: z.boolean().default(false), totalSeats: z.coerce.number().int().min(1).max(600) });
export const flightSchema = z.object({ airlineId: id, originId: id, destinationId: id, flightNumber: z.string().regex(/^[A-Z0-9]{2,3}\d{1,4}$/), aircraft: z.string().min(2).max(60), departureTime: z.string().datetime({ offset: true }), arrivalTime: z.string().datetime({ offset: true }), fares: z.array(fareSchema).min(1).max(3).refine(v => new Set(v.map(f => f.cabinClass)).size === v.length) }).refine(v => v.originId !== v.destinationId && new Date(v.arrivalTime) > new Date(v.departureTime) && new Date(v.departureTime) > new Date(), 'Sân bay hoặc giờ bay không hợp lệ');
export const preferenceSchema = z.object({ cabinClass: cabin, maxBudget: z.coerce.number().int().min(100000).max(100000000), preferredAirlines: z.array(z.string().regex(/^[A-Z0-9]{2,3}$/)).max(10), prioritize: z.enum(['PRICE', 'DURATION', 'BALANCED']) });
