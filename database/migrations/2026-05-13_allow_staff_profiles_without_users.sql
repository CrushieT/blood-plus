-- Manual schema update for optional staff login accounts.
-- Run this once in environments where staff_profiles.user_id was created as NOT NULL.

ALTER TABLE staff_profiles
    MODIFY COLUMN user_id BIGINT NULL;
