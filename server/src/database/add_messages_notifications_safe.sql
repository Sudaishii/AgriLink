-- Run once in phpMyAdmin (agrilink_db) if messages/notifications tables are missing.
-- Safe to re-run: uses IF NOT EXISTS only (no DROP).

CREATE TABLE IF NOT EXISTS `messages_table` (
  `m_id` int(11) NOT NULL AUTO_INCREMENT,
  `sender_id` int(11) NOT NULL,
  `receiver_id` int(11) NOT NULL,
  `content` text NOT NULL,
  `image_path` varchar(512) DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`m_id`),
  KEY `idx_sender` (`sender_id`),
  KEY `idx_receiver` (`receiver_id`),
  CONSTRAINT `messages_table_sender_fk` FOREIGN KEY (`sender_id`) REFERENCES `users_table` (`id`) ON DELETE CASCADE,
  CONSTRAINT `messages_table_receiver_fk` FOREIGN KEY (`receiver_id`) REFERENCES `users_table` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `notifications_table` (
  `n_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `title` varchar(100) NOT NULL,
  `message` varchar(255) NOT NULL,
  `type` enum('order','message','system') NOT NULL,
  `status` enum('unread','read') DEFAULT 'unread',
  `link` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`n_id`),
  KEY `idx_notif_user` (`user_id`),
  CONSTRAINT `notifications_table_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users_table` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
