-- The figures a ride's page shows beyond distance and climbing. Null where
-- the device recorded nothing to derive them from, which for heart rate is
-- most rides. Temperature is the moving range in degrees Celsius, already
-- trimmed of the readings a sensor gives while parked in the sun (see
-- `src/activity/temperature.ts`), so a reader never sees the raw extremes.
ALTER TABLE activity_feed ADD COLUMN normalized_watts REAL;
ALTER TABLE activity_feed ADD COLUMN average_heart_rate REAL;
ALTER TABLE activity_feed ADD COLUMN temperature_low_c REAL;
ALTER TABLE activity_feed ADD COLUMN temperature_high_c REAL;
