// Additional guard for imported operational data. Local demo flights keep their existing lifecycle.
export const closedOperationalStatuses = [
  "CANCELLED",
  "DIVERTED",
  "DEPARTED",
  "LANDED",
];
export function canSellOperationally(status: string | null) {
  return !status || !closedOperationalStatuses.includes(status);
}
