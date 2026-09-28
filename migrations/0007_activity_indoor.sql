-- Whether the ride was on a trainer or in Zwift. Null is a ride published
-- before the hub sent the flag, and reads as outdoor.
ALTER TABLE activity_feed ADD COLUMN indoor INTEGER;
