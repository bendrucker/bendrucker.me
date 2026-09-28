-- The description the rider wrote on the activity, which a ride's row shows
-- under its name and its page shows as a dek. Null where there is none: the
-- hub sends it only for the activities it has one for, and an empty string
-- arrives as null too.
ALTER TABLE activity_feed ADD COLUMN description TEXT;
