// Isolated browser fixtures only. Never imported by application code.
import { Page } from '@playwright/test';
export const airports = [
  { id: 1, code: 'SGN', name: 'Tân Sơn Nhất', city: 'Hồ Chí Minh', country: 'Việt Nam', timezone: 'Asia/Ho_Chi_Minh', latitude: 10.82, longitude: 106.65 },
  { id: 2, code: 'HAN', name: 'Nội Bài', city: 'Hà Nội', country: 'Việt Nam', timezone: 'Asia/Ho_Chi_Minh', latitude: 21.22, longitude: 105.8 },
  { id: 3, code: 'DAD', name: 'Đà Nẵng', city: 'Đà Nẵng', country: 'Việt Nam', timezone: 'Asia/Ho_Chi_Minh', latitude: 16.04, longitude: 108.2 },
  { id: 4, code: 'SIN', name: 'Changi', city: 'Singapore', country: 'Singapore', timezone: 'Asia/Singapore', latitude: 1.36, longitude: 103.99 },
];
export const user = { id: 1, fullName: 'Người kiểm thử', email: 'browser-test@example.test', phone: '0900000000', role: 'USER' };
export const airline = { id: 1, code: 'VN', name: 'Vietnam Airlines', color: '#087ca7', isActive: true };
const tomorrow = new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10);
export const fare = { id: 11, cabinClass: 'ECONOMY', basePrice: 1000000, tax: 200000, baggageKg: 23, cabinBaggageKg: 7, refundable: true, totalSeats: 100, availableSeats: 70 };
export const flight = { id: 1, flightNumber: 'VN101', aircraft: 'Airbus A321', departureTime: `${tomorrow}T03:00:00Z`, arrivalTime: `${tomorrow}T05:00:00Z`, status: 'SCHEDULED', origin: airports[0], destination: airports[1], airline, fares: [fare], selectedFare: fare, price: 1200000, duration: 120, source: 'INTERNAL', operationalStatus: null };
const returnFare = { ...fare, id: 12 };
const returnFlight = { ...flight, id: 2, flightNumber: 'VN102', origin: airports[1], destination: airports[0], departureTime: new Date(Date.parse(flight.departureTime) + 2 * 86400000).toISOString(), arrivalTime: new Date(Date.parse(flight.arrivalTime) + 2 * 86400000).toISOString(), fares: [returnFare], selectedFare: returnFare };
export const booking = {
  id: 'browser-booking', reference: 'UITEST', status: 'PENDING', contactEmail: user.email, contactPhone: user.phone,
  totalAmount: 1200000, expiresAt: new Date(Date.now() + 15 * 60000).toISOString(), createdAt: new Date().toISOString(),
  passengers: [{ id: 1, fullName: 'NGUOI KIEM THU', dateOfBirth: '1995-01-01', nationality: 'VN', documentNumber: 'TEST123456', tickets: [] }],
  segments: [{ id: 1, sequence: 1, unitPrice: 1200000, cabinClass: 'ECONOMY', baggageKg: 23, cabinBaggageKg: 7, refundable: true, fare: { ...fare, flight }, tickets: [] }], payment: null,
};
export const pagination = { page: 1, pages: 1, total: 1, pageSize: 15 };
export const report = { currency: 'VND', timeZone: 'Asia/Ho_Chi_Minh', start: tomorrow, end: tomorrow, gross: 0, refunds: 0, net: 0, unknownRefunds: 0, tickets: 0, orders: 0, averageOrder: 0, averageTicket: 0, series: [], byAirline: [], transactions: [], pagination: { ...pagination, total: 0 }, note: 'Dữ liệu kiểm thử cô lập' };
export const overview = { generatedAt: new Date().toISOString(), source: 'INTERNAL', mockPayments: true, kpis: { flights: 0, tickets: 0, revenue: 0, successful: 0, pending: 0, cancelled: 0, refunds: 0, net: 0, averageFare: 0, activeAirlines: 0, customers: 0 }, comparison: { revenue: null, tickets: null }, report, upcoming: [], routes: [], regions: { domestic: 0, international: 0 } };
export const sync = { provider: 'NONE', automatic: false, intervalSeconds: 300, pollSeconds: 30, kinds: ['schedule','status','fares'].map(kind => ({ kind, configured: false })), runs: [], sourceNotice: 'Nguồn đối tác chưa được cấu hình' };
export type FixtureOptions = { role?: 'USER' | 'ADMIN' | 'GUEST'; flightError?: boolean; airportError?: boolean; emptyFlights?: boolean };
export async function fixtureApi(page: Page, options: FixtureOptions = {}) {
  const requests: { method: string; path: string; body: unknown; search: string }[] = [];
  const sessionUser = { ...user, role: options.role === 'ADMIN' ? 'ADMIN' : 'USER' };
  let currentBooking = structuredClone(booking);
  await page.route('**/api/v1/**', async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname.replace('/api/v1', '');
    requests.push({ method: request.method(), path, body: request.postDataJSON(), search: url.search });
    const send = (data: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ success: status < 400, ...(status < 400 ? { data } : { message: data }) }) });
    if (path === '/auth/refresh') return options.role === 'GUEST' ? send('Chưa đăng nhập', 401) : send({ user: sessionUser, accessToken: 'browser-fixture-token' });
    if (path === '/auth/login' || path === '/auth/register') return send({ user: sessionUser, accessToken: 'browser-fixture-token' });
    if (path === '/auth/logout' || path === '/auth/forgot-password' || path === '/auth/reset-password') return send(null);
    if (path === '/airports' || path === '/admin/airports') return options.airportError ? send('Không kết nối được danh mục sân bay', 503) : send(airports);
    if (path === '/airlines' || path === '/admin/airlines') return send([airline]);
    if (path === '/flights') return options.flightError ? send('Máy chủ tìm kiếm đang bận', 503) : send({ flights: options.emptyFlights ? [] : [url.searchParams.get('origin') === 'HAN' ? returnFlight : flight], total: options.emptyFlights ? 0 : 1, currency: 'VND' });
    if (path === '/flights/1') return send(flight);
    if (path === '/fares/11') return send({ ...fare, flight });
    if (path === '/fares/12') return send({ ...returnFare, flight: returnFlight });
    if (path === '/airlines/1/reviews') return send([]);
    if (path === '/bookings' && request.method() === 'POST') return send(currentBooking);
    if (path === '/bookings') return send([currentBooking]);
    if (path.endsWith('/pay')) { currentBooking = { ...currentBooking, status: 'CONFIRMED' }; return send(currentBooking); }
    if (path.endsWith('/cancel')) { currentBooking = { ...currentBooking, status: 'CANCELLED' }; return send(currentBooking); }
    if (path === '/bookings/browser-booking/tickets') return route.fulfill({ contentType: 'text/plain', body: 'BROWSER FIXTURE TICKET — NOT VALID FOR TRAVEL' });
    if (path === '/bookings/browser-booking') return send(currentBooking);
    if (path === '/users/preferences') return send({ cabinClass: 'ECONOMY', maxBudget: 3000000, preferredAirlines: [], prioritize: 'BALANCED' });
    if (path === '/users/favorites') return send([]);
    if (path === '/admin/sync/status') return send(sync);
    if (path === '/admin/analytics/overview') return send(overview);
    if (path === '/admin/monitoring') return send({ items: [flight], pagination });
    if (path === '/admin/fares/history') return send({ items: [], pagination: { ...pagination, total: 0 }, series: [], observations: [], totalObservations: 0, notice: 'Chưa có lịch sử' });
    if (path === '/admin/revenue') return send(report);
    if (path === '/admin/settings') return send({ database: true, cache: false, timeZone: 'Asia/Ho_Chi_Minh', currency: 'VND', mockPayments: true, provider: 'NONE', apiKeyConfigured: false, syncEnabled: false, syncInterval: 300, endpoints: { schedule: false, status: false, fares: false }, currencies: ['VND'] });
    if (path === '/admin/reviews') return send([]);
    if (path === '/admin/search') return send({ flights: [flight], bookings: [], airlines: [] });
    if (path.startsWith('/admin/')) return send({ items: [], pagination: { ...pagination, total: 0 } });
    return send(null);
  });
  return requests;
}
