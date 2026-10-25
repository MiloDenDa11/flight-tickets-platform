import { Airline, Airport, Booking, Fare, Flight, User } from "../types";
export type SourceFlight = Flight & {
  source: string;
  externalId: string | null;
  operationalStatus: string | null;
  actualDepartureTime: string | null;
  actualArrivalTime: string | null;
  scheduleObservedAt: string | null;
  statusObservedAt: string | null;
  statusSource: string | null;
};
export type ManagedAirline = Airline & {
  country: string;
  logoUrl: string | null;
  website: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { flights: number };
};
export type FareRow = Fare & {
  source: string;
  priceObservedAt: string;
  flight: SourceFlight;
  historyCount: number;
  previousPrice: number | null;
  minimumPrice: number | null;
  averagePrice: number | null;
  changePercent: number | null;
};
export type SafeBooking = Omit<Booking, "passengers"> & {
  currency: string;
  passengers: {
    id: number;
    fullName: string;
    nationality: string;
    maskedCitizenId: string;
    tickets?: { number: string; status: string }[];
  }[];
  payment:
    | (NonNullable<Booking["payment"]> & {
        paidAt: string;
        refundedAt: string | null;
      })
    | null;
};
export type Customer = User & { _count: { bookings: number } };
export type Pagination = {
  page: number;
  pages: number;
  pageSize: number;
  total: number;
};
export type Page<T> = { items: T[]; pagination: Pagination };
export type RevenuePoint = {
  date: string;
  gross: number;
  refunds: number;
  tickets: number;
};
export type RevenueTransaction = {
  id: string;
  reference: string;
  paidAt: string;
  refundedAt: string | null;
  status: string;
  provider: string;
  gross: number;
  refund: number;
  currency: string;
  flightNumbers: string;
};
export type AirlineRevenue = {
  id: number;
  code: string;
  name: string;
  color: string;
  logoUrl: string | null;
  gross: number;
  refunds: number;
  tickets: number;
};
export type Revenue = {
  currency: string;
  timeZone: string;
  start: string;
  end: string;
  gross: number;
  refunds: number;
  net: number | null;
  unknownRefunds: number;
  tickets: number;
  orders: number;
  averageOrder: number;
  averageTicket: number;
  series: RevenuePoint[];
  byAirline: AirlineRevenue[];
  transactions: RevenueTransaction[];
  pagination?: Pagination;
  note: string;
};
export type Overview = {
  generatedAt: string;
  source: string;
  mockPayments: boolean;
  kpis: {
    flights: number;
    tickets: number;
    revenue: number;
    successful: number;
    pending: number;
    cancelled: number;
    refunds: number;
    net: number | null;
    averageFare: number;
    activeAirlines: number;
    customers: number;
  };
  comparison: { revenue: number | null; tickets: number | null };
  report: Revenue;
  upcoming: SourceFlight[];
  routes: { origin: Airport; destination: Airport; count: number }[];
  regions: { domestic: number; international: number };
};
export type FareHistory = Page<FareRow> & {
  series: {
    date: string;
    average: number;
    min: number;
    max: number;
    count: number;
  }[];
  observations: {
    id: number;
    flightNumber: string;
    cabinClass: string;
    totalPrice: number;
    currency: string;
    source: string;
    recordedAt: string;
    airlineCode: string;
    originCode: string;
    destinationCode: string;
  }[];
  totalObservations: number;
  notice: string;
};
export type SyncKind = "schedule" | "status" | "fares";
export type SyncState = {
  kind: SyncKind;
  configured: boolean;
  runningUntil?: string | null;
  lastAttemptAt?: string | null;
  lastSuccessAt?: string | null;
  lastError?: string | null;
  nextAllowedAt?: string | null;
};
export type SyncRun = {
  id: string;
  kind: SyncKind;
  provider: string;
  status: string;
  processed: number;
  skipped: number;
  errorCode: string | null;
  startedAt: string;
  finishedAt: string | null;
};
export type SyncStatus = {
  provider: string;
  automatic: boolean;
  intervalSeconds: number;
  pollSeconds: number;
  kinds: SyncState[];
  runs: SyncRun[];
  sourceNotice: string;
};
export type Settings = {
  database: boolean;
  cache: boolean;
  timeZone: string;
  currency: string;
  mockPayments: boolean;
  provider: string;
  apiKeyConfigured: boolean;
  syncEnabled: boolean;
  syncInterval: number;
  endpoints: Record<SyncKind, boolean>;
  currencies: string[];
};
export type AuditEvent = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  createdAt: string;
  actor: { fullName: string } | null;
  metadata: Record<string, unknown>;
};
export type FilterUpdate = (
  values: Record<string, string | number | undefined>,
) => void;
