-- AlterTable
ALTER TABLE "airlines" ADD COLUMN     "country" VARCHAR(100) NOT NULL DEFAULT 'Chưa cập nhật',
ADD COLUMN     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "logo_url" VARCHAR(2048),
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "website" VARCHAR(2048);

-- AlterTable
ALTER TABLE "flights" ADD COLUMN     "actual_arrival_time" TIMESTAMPTZ,
ADD COLUMN     "actual_departure_time" TIMESTAMPTZ,
ADD COLUMN     "external_id" VARCHAR(150),
ADD COLUMN     "operational_status" VARCHAR(24),
ADD COLUMN     "schedule_observed_at" TIMESTAMPTZ,
ADD COLUMN     "source" VARCHAR(60) NOT NULL DEFAULT 'LOCAL_DEMO',
ADD COLUMN     "status_observed_at" TIMESTAMPTZ,
ADD COLUMN     "status_source" VARCHAR(60);

-- AlterTable
ALTER TABLE "flight_fares" ADD COLUMN     "price_observed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "source" VARCHAR(60) NOT NULL DEFAULT 'LOCAL_DEMO';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "refunded_at" TIMESTAMPTZ;

-- CreateTable
CREATE TABLE "fare_observations" (
    "id" SERIAL NOT NULL,
    "fare_id" INTEGER,
    "flight_id" INTEGER,
    "airline_id" INTEGER,
    "airline_code" VARCHAR(3) NOT NULL,
    "airline_name" VARCHAR(100) NOT NULL,
    "flight_number" VARCHAR(10) NOT NULL,
    "origin_code" CHAR(3) NOT NULL,
    "destination_code" CHAR(3) NOT NULL,
    "origin_country" VARCHAR(100) NOT NULL,
    "destination_country" VARCHAR(100) NOT NULL,
    "departure_time" TIMESTAMPTZ NOT NULL,
    "cabin_class" VARCHAR(20) NOT NULL,
    "base_price" INTEGER NOT NULL,
    "tax" INTEGER NOT NULL,
    "total_price" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'VND',
    "source" VARCHAR(60) NOT NULL,
    "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fare_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_events" (
    "id" UUID NOT NULL,
    "actor_id" INTEGER,
    "action" VARCHAR(80) NOT NULL,
    "entity" VARCHAR(40) NOT NULL,
    "entity_id" VARCHAR(150),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_sync_states" (
    "kind" VARCHAR(20) NOT NULL,
    "running_until" TIMESTAMPTZ,
    "last_attempt_at" TIMESTAMPTZ,
    "last_success_at" TIMESTAMPTZ,
    "last_error" VARCHAR(200),
    "next_allowed_at" TIMESTAMPTZ,

    CONSTRAINT "provider_sync_states_pkey" PRIMARY KEY ("kind")
);

-- CreateTable
CREATE TABLE "provider_sync_runs" (
    "id" UUID NOT NULL,
    "kind" VARCHAR(20) NOT NULL,
    "provider" VARCHAR(60) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'RUNNING',
    "actor_id" INTEGER,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "error_code" VARCHAR(200),
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ,

    CONSTRAINT "provider_sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fare_observations_fare_id_recorded_at_idx" ON "fare_observations"("fare_id", "recorded_at");

-- CreateIndex
CREATE INDEX "fare_observations_airline_id_recorded_at_idx" ON "fare_observations"("airline_id", "recorded_at");

-- CreateIndex
CREATE INDEX "fare_observations_recorded_at_idx" ON "fare_observations"("recorded_at");

-- CreateIndex
CREATE INDEX "fare_observations_origin_code_destination_code_recorded_at_idx" ON "fare_observations"("origin_code", "destination_code", "recorded_at");

-- CreateIndex
CREATE INDEX "admin_audit_events_created_at_idx" ON "admin_audit_events"("created_at");

-- CreateIndex
CREATE INDEX "admin_audit_events_actor_id_created_at_idx" ON "admin_audit_events"("actor_id", "created_at");

-- CreateIndex
CREATE INDEX "provider_sync_runs_kind_started_at_idx" ON "provider_sync_runs"("kind", "started_at");

-- CreateIndex
CREATE INDEX "flights_airline_id_departure_time_idx" ON "flights"("airline_id", "departure_time");

-- CreateIndex
CREATE UNIQUE INDEX "flights_source_external_id_key" ON "flights"("source", "external_id");

-- CreateIndex
CREATE INDEX "bookings_created_at_idx" ON "bookings"("created_at");

-- CreateIndex
CREATE INDEX "payments_paid_at_idx" ON "payments"("paid_at");

-- CreateIndex
CREATE INDEX "payments_refunded_at_idx" ON "payments"("refunded_at");

-- AddForeignKey
ALTER TABLE "fare_observations" ADD CONSTRAINT "fare_observations_fare_id_fkey" FOREIGN KEY ("fare_id") REFERENCES "flight_fares"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fare_observations" ADD CONSTRAINT "fare_observations_flight_id_fkey" FOREIGN KEY ("flight_id") REFERENCES "flights"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fare_observations" ADD CONSTRAINT "fare_observations_airline_id_fkey" FOREIGN KEY ("airline_id") REFERENCES "airlines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_events" ADD CONSTRAINT "admin_audit_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_sync_runs" ADD CONSTRAINT "provider_sync_runs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- First observation of existing prices, at migration time; never fabricate historical timestamps.
INSERT INTO "fare_observations" ("fare_id","flight_id","airline_id","airline_code","airline_name","flight_number","origin_code","destination_code","origin_country","destination_country","departure_time","cabin_class","base_price","tax","total_price","currency","source","recorded_at")
SELECT ff.id,f.id,a.id,a.code,a.name,f.flight_number,o.code,d.code,o.country,d.country,f.departure_time,ff.cabin_class,ff.base_price,ff.tax,ff.base_price+ff.tax,'VND','LOCAL_DEMO',CURRENT_TIMESTAMP
FROM flight_fares ff JOIN flights f ON f.id=ff.flight_id JOIN airlines a ON a.id=f.airline_id JOIN airports o ON o.id=f.origin_id JOIN airports d ON d.id=f.destination_id;

-- Existing local catalogue: known brand metadata only; never touch accounts or prices.
UPDATE airlines SET country='Việt Nam',logo_url='/brands/cards/vn.svg',website='https://www.vietnamairlines.com/' WHERE code='VN';
UPDATE airlines SET country='Việt Nam',logo_url='/brands/cards/vj.svg',website='https://www.vietjetair.com/' WHERE code='VJ';
UPDATE airlines SET country='Việt Nam',logo_url='/brands/cards/qh.svg',website='https://www.bambooairways.com/' WHERE code='QH';
