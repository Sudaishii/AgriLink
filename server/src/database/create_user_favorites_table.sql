CREATE TABLE IF NOT EXISTS `user_favorites` (
  `fav_id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users_table`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `product_table`(`p_id`) ON DELETE CASCADE,
  UNIQUE KEY `uq_user_product` (`user_id`, `product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;