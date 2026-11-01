export function safeNextPath(next: string | null): string {
  const fallback = '/bookings';
  if (!next?.startsWith('/') || next.startsWith('//')) return fallback;
  const base = 'https://flight-tickets.invalid';
  try {
    const target = new URL(next, base);
    return target.origin === base ? target.pathname + target.search + target.hash : fallback;
  } catch { return fallback; }
}
