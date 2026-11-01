export const money = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
export const clock = (s: string, zone = 'Asia/Ho_Chi_Minh') => new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: zone }).format(new Date(s));
export const dateLabel = (s: string, zone = 'Asia/Ho_Chi_Minh') => new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: zone }).format(new Date(s));
export function dayAfter(offset = 1) { return new Date(Date.now() + offset * 86400000 + 7 * 3600000).toISOString().slice(0, 10); }
export const cabinName = (c: string) => ({ ECONOMY: 'Phổ thông', PREMIUM: 'Phổ thông đặc biệt', BUSINESS: 'Thương gia' }[c] ?? c);
export const statusName = (s: string) => ({ PENDING: 'Chờ thanh toán', CONFIRMED: 'Đã xác nhận', EXPIRED: 'Hết hạn', CANCELLED: 'Đã hủy', SCHEDULED: 'Mở bán', COMPLETED: 'Hoàn tất', PAID: 'Đã thanh toán', REFUNDED: 'Đã hoàn tiền' }[s] ?? s);
export const duration = (a: string, b: string) => { const m = Math.round((+new Date(b) - +new Date(a)) / 60000); return `${Math.floor(m / 60)}h ${m % 60 ? m % 60 + 'p' : ''}`; };
