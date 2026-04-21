-- Optional: add image attachment path for messages. Safe to re-run if column exists (run manually if needed).
-- MySQL 8+ / MariaDB: skip if you get "Duplicate column".

ALTER TABLE `messages_table`
  ADD COLUMN `image_path` VARCHAR(512) DEFAULT NULL AFTER `content`;
