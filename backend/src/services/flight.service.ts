import { z } from 'zod';
import { prisma } from '../config/db';
import { flightRepository } from '../repositories/flight.repository';
import { searchSchema } from '../validators';
import { normalize, rankFlights } from '../utils/flight-ranking';
import { cached } from '../config/redis';
import { AppError } from '../utils/app-error';

export const flightService = {
  async airports(query = '') {
    const all = await cached('flight:airports:v1', () => prisma.airport.findMany({ orderBy: { code: 'asc' } }));
    const term = normalize(query);
    return all.filter(a => normalize(`${a.code} ${a.city} ${a.name}`).includes(term));
  },
  async search(input: z.infer<typeof searchSchema>, userId?: number) {
    // Search dates use Vietnam's UTC+07 day boundaries, timestamps remain UTC in DB.
    const start = new Date(`${input.date}T00:00:00+07:00`);
    const end = new Date(start.getTime() + 86400000);
    const now = new Date();
    if (end <= now) throw new AppError('Vui lòng chọn ngày bay trong tương lai');
    const flights = await flightRepository.search({
      origin: { code: input.origin }, destination: { code: input.destination },
      departureTime: { gte: new Date(Math.max(start.getTime(), now.getTime() + 3600000)), lt: end },
      status: 'SCHEDULED', airline: { isActive: true, ...(input.airline ? { code: input.airline } : {}) },
      fares: { some: { cabinClass: input.cabinClass, availableSeats: { gte: input.passengers } } },
    });
    let rows = flights.map(f => {
      const fare = f.fares.find(p => p.cabinClass === input.cabinClass)!;
      return { ...f, selectedFare: fare, price: fare.basePrice + fare.tax, duration: Math.round((f.arrivalTime.getTime() - f.departureTime.getTime()) / 60000), airlineCode: f.airline.code };
    }).filter(f => !input.maxPrice || f.price <= input.maxPrice);
    if (input.sort === 'RECOMMENDED') {
      const pref = userId ? await prisma.flightPreference.findUnique({ where: { userId } }) : null;
      rows = rankFlights(rows, pref ?? {});
    } else rows.sort((a, b) => input.sort === 'DURATION' ? a.duration - b.duration : input.sort === 'DEPARTURE' ? +a.departureTime - +b.departureTime : a.price - b.price);
    return { flights: rows, total: rows.length, date: input.date, currency: 'VND', passengers: input.passengers };
  },
  async assistant(input: z.infer<typeof searchSchema>, query: string, userId: number) {
    const pref = await prisma.flightPreference.findUnique({ where: { userId } });
    const words = normalize(query);
    const priority = /re|tiet kiem|cheap/.test(words) ? 'PRICE' : /nhanh|som|fast/.test(words) ? 'DURATION' : pref?.prioritize ?? 'BALANCED';
    const result = await this.search({ ...input, sort: 'RECOMMENDED' }, userId);
    const flights = rankFlights(result.flights, { ...pref, prioritize: priority, maxBudget: pref?.maxBudget, preferredAirlines: pref?.preferredAirlines }).slice(0, 3);
    await prisma.searchHistory.create({ data: { userId, query: { ...input, message: query, priority } } });
    return { engine: 'WEIGHTED_RANKING', message: flights.length ? `Tìm được ${result.total} chuyến phù hợp. Gợi ý dựa trên giá đã gồm thuế, thời gian bay và sở thích của bạn. Tồn ghế được kiểm tra lại khi đặt.` : 'Chưa có chuyến phù hợp. Hãy đổi ngày bay hoặc hạng vé.', flights };
  },
};
