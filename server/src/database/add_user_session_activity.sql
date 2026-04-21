-- Tracks last time the user made an authenticated API request (JWT session activity).
-- Run once on existing databases: mysql ... < add_user_session_activity.sql

ALTER TABLE users_table
  ADD COLUMN last_session_activity_at DATETIME NULL DEFAULT NULL
  COMMENT 'Last authenticated API activity (throttled server-side)';
