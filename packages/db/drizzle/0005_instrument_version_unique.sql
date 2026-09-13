ALTER TABLE "instrument_version" ADD CONSTRAINT "instrument_version_instrument_id_version_unique" UNIQUE ("instrument_id", "version");
