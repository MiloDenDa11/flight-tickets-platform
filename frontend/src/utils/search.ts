export function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().trim();
}

export function hasReturnConnection(outboundArrival: string, returnDeparture: string) {
  return Date.parse(returnDeparture) >= Date.parse(outboundArrival) + 3600000;
}
