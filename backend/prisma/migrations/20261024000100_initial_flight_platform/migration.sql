-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" VARCHAR(20) NOT NULL DEFAULT 'USER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "token_version" INTEGER NOT NULL DEFAULT 0,
    "phone" VARCHAR(30),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "airlines" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(3) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "color" VARCHAR(7) NOT NULL DEFAULT '#086c72',
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "airlines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "airports" (
    "id" SERIAL NOT NULL,
    "code" CHAR(3) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "country" VARCHAR(100) NOT NULL DEFAULT 'Việt Nam',
    "timezone" VARCHAR(60) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,

    CONSTRAINT "airports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flights" (
    "id" SERIAL NOT NULL,
    "airline_id" INTEGER NOT NULL,
    "origin_id" INTEGER NOT NULL,
    "destination_id" INTEGER NOT NULL,
    "flight_number" VARCHAR(10) NOT NULL,
    "aircraft" VARCHAR(60) NOT NULL DEFAULT 'Airbus A321',
    "departure_time" TIMESTAMPTZ NOT NULL,
    "arrival_time" TIMESTAMPTZ NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "flights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flight_fares" (
    "id" SERIAL NOT NULL,
    "flight_id" INTEGER NOT NULL,
    "cabin_class" VARCHAR(20) NOT NULL,
    "base_price" INTEGER NOT NULL,
    "tax" INTEGER NOT NULL DEFAULT 0,
    "baggage_kg" INTEGER NOT NULL DEFAULT 0,
    "cabin_baggage_kg" INTEGER NOT NULL DEFAULT 7,
    "refundable" BOOLEAN NOT NULL DEFAULT false,
    "total_seats" INTEGER NOT NULL,
    "available_seats" INTEGER NOT NULL,

    CONSTRAINT "flight_fares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "reference" VARCHAR(12) NOT NULL,
    "user_id" INTEGER NOT NULL,
    "idempotency_key" VARCHAR(100) NOT NULL,
    "request_hash" CHAR(64) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "contact_email" VARCHAR(255) NOT NULL,
    "contact_phone" VARCHAR(30) NOT NULL,
    "total_amount" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'VND',
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_segments" (
    "id" SERIAL NOT NULL,
    "booking_id" UUID NOT NULL,
    "fare_id" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "unit_price" INTEGER NOT NULL,
    "cabin_class" VARCHAR(20) NOT NULL,
    "baggage_kg" INTEGER NOT NULL,
    "cabin_baggage_kg" INTEGER NOT NULL,
    "refundable" BOOLEAN NOT NULL,

    CONSTRAINT "booking_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "passengers" (
    "id" SERIAL NOT NULL,
    "booking_id" UUID NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "document_number" VARCHAR(30) NOT NULL,
    "nationality" CHAR(2) NOT NULL DEFAULT 'VN',

    CONSTRAINT "passengers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" UUID NOT NULL,
    "number" VARCHAR(24) NOT NULL,
    "passenger_id" INTEGER NOT NULL,
    "segment_id" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ISSUED',
    "issued_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "provider" VARCHAR(20) NOT NULL DEFAULT 'MOCK',
    "transaction_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PAID',
    "paid_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorite_routes" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "origin_id" INTEGER NOT NULL,
    "destination_id" INTEGER NOT NULL,

    CONSTRAINT "favorite_routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flight_preferences" (
    "user_id" INTEGER NOT NULL,
    "cabin_class" VARCHAR(20) NOT NULL DEFAULT 'ECONOMY',
    "max_budget" INTEGER NOT NULL DEFAULT 3000000,
    "preferred_airlines" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "prioritize" VARCHAR(20) NOT NULL DEFAULT 'BALANCED',

    CONSTRAINT "flight_preferences_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "airline_id" INTEGER NOT NULL,
    "rating" SMALLINT NOT NULL,
    "comment" VARCHAR(2000) NOT NULL,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_history" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "query" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "airlines_code_key" ON "airlines"("code");

-- CreateIndex
CREATE UNIQUE INDEX "airports_code_key" ON "airports"("code");

-- CreateIndex
CREATE INDEX "flights_origin_id_destination_id_departure_time_idx" ON "flights"("origin_id", "destination_id", "departure_time");

-- CreateIndex
CREATE UNIQUE INDEX "flights_flight_number_departure_time_key" ON "flights"("flight_number", "departure_time");

-- CreateIndex
CREATE UNIQUE INDEX "flight_fares_flight_id_cabin_class_key" ON "flight_fares"("flight_id", "cabin_class");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_reference_key" ON "bookings"("reference");

-- CreateIndex
CREATE INDEX "bookings_status_expires_at_idx" ON "bookings"("status", "expires_at");

-- CreateIndex
CREATE INDEX "bookings_user_id_created_at_idx" ON "bookings"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_user_id_idempotency_key_key" ON "bookings"("user_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "booking_segments_booking_id_sequence_key" ON "booking_segments"("booking_id", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_number_key" ON "tickets"("number");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_passenger_id_segment_id_key" ON "tickets"("passenger_id", "segment_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_booking_id_key" ON "payments"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_transaction_id_key" ON "payments"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "favorite_routes_user_id_origin_id_destination_id_key" ON "favorite_routes"("user_id", "origin_id", "destination_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_user_id_airline_id_key" ON "reviews"("user_id", "airline_id");

-- CreateIndex
CREATE INDEX "search_history_user_id_created_at_idx" ON "search_history"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flights" ADD CONSTRAINT "flights_airline_id_fkey" FOREIGN KEY ("airline_id") REFERENCES "airlines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flights" ADD CONSTRAINT "flights_origin_id_fkey" FOREIGN KEY ("origin_id") REFERENCES "airports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flights" ADD CONSTRAINT "flights_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "airports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_fares" ADD CONSTRAINT "flight_fares_flight_id_fkey" FOREIGN KEY ("flight_id") REFERENCES "flights"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_segments" ADD CONSTRAINT "booking_segments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_segments" ADD CONSTRAINT "booking_segments_fare_id_fkey" FOREIGN KEY ("fare_id") REFERENCES "flight_fares"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passengers" ADD CONSTRAINT "passengers_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "passengers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "booking_segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_routes" ADD CONSTRAINT "favorite_routes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_routes" ADD CONSTRAINT "favorite_routes_origin_id_fkey" FOREIGN KEY ("origin_id") REFERENCES "airports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_routes" ADD CONSTRAINT "favorite_routes_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "airports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_preferences" ADD CONSTRAINT "flight_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_airline_id_fkey" FOREIGN KEY ("airline_id") REFERENCES "airlines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_history" ADD CONSTRAINT "search_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
