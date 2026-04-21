CREATE TABLE IF NOT EXISTS `farmer_service_reviews` (
  `fsr_id` INT AUTO_INCREMENT PRIMARY KEY,
  `req_id` INT NOT NULL,
  `reviewer_id` INT NOT NULL,
  `farmer_id` INT NOT NULL,
  `rating` INT NOT NULL CHECK (`rating` BETWEEN 1 AND 5),
  `comment` TEXT,
  `product_id` INT NULL,
  `product_name_snapshot` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_review_per_order` (`req_id`),
  KEY `idx_farmer_created` (`farmer_id`, `created_at`),
  CONSTRAINT `fsr_req_fk` FOREIGN KEY (`req_id`) REFERENCES `purchase_table`(`req_id`) ON DELETE CASCADE,
  CONSTRAINT `fsr_reviewer_fk` FOREIGN KEY (`reviewer_id`) REFERENCES `users_table`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fsr_farmer_fk` FOREIGN KEY (`farmer_id`) REFERENCES `users_table`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fsr_product_fk` FOREIGN KEY (`product_id`) REFERENCES `product_table`(`p_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
