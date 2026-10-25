-- Preserve the last external inventory ceiling separately from locally held seats.
ALTER TABLE "flight_fares" ADD COLUMN "provider_available_seats" INTEGER;
ALTER TABLE "flight_fares" ADD CONSTRAINT "provider_available_seats_range"
CHECK ("provider_available_seats" IS NULL OR "provider_available_seats" BETWEEN 0 AND 600);
