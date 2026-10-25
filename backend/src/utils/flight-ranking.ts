export type Rankable = { id: number; price: number; duration: number; airlineCode: string };
export type RankingPreference = { prioritize?: string; maxBudget?: number; preferredAirlines?: string[] };
// Weighted normalized scoring, adapted from Travel Platform's personalized ranking.
export function rankFlights<T extends Rankable>(flights: T[], preference: RankingPreference = {}) {
  const maxPrice = Math.max(1, ...flights.map(f => f.price));
  const maxDuration = Math.max(1, ...flights.map(f => f.duration));
  const priceWeight = preference.prioritize === 'PRICE' ? .8 : preference.prioritize === 'DURATION' ? .2 : .5;
  return flights.map(f => ({ ...f,
    score: Math.round(100 * (priceWeight * (1 - f.price / maxPrice)
      + (1 - priceWeight) * (1 - f.duration / maxDuration)
      + (preference.preferredAirlines?.includes(f.airlineCode) ? .15 : 0)
      + (preference.maxBudget && f.price <= preference.maxBudget ? .1 : 0))),
  })).sort((a, b) => b.score - a.score || a.price - b.price || a.id - b.id);
}
export function haversineKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const r = (d: number) => d * Math.PI / 180;
  const x = Math.sin(r(b.latitude - a.latitude) / 2) ** 2
    + Math.cos(r(a.latitude)) * Math.cos(r(b.latitude)) * Math.sin(r(b.longitude - a.longitude) / 2) ** 2;
  return Math.round(6371 * 2 * Math.asin(Math.min(1, Math.sqrt(x))));
}
export const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
