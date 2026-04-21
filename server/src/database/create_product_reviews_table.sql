CREATE TABLE IF NOT EXISTS `product_reviews` (
  `r_id` INT AUTO_INCREMENT PRIMARY KEY,
  `product_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `rating` INT NOT NULL CHECK (`rating` BETWEEN 1 AND 5),
  `comment` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`product_id`) REFERENCES `product_table`(`p_id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users_table`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uq_user_product_review` (`user_id`, `product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
