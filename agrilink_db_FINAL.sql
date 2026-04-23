-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Apr 21, 2026 at 02:02 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `agrilink_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `auth_table`
--

CREATE TABLE `auth_table` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role_id` int(11) NOT NULL,
  `is_verified` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `status` varchar(20) DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `auth_table`
--

INSERT INTO `auth_table` (`id`, `email`, `password_hash`, `role_id`, `is_verified`, `created_at`, `updated_at`, `status`) VALUES
(2, 'AgriLink', '$2b$10$uL1fxTrQZJjrxDByHcIcFu0EcLDWUz6oUfRjuNXiDqMKaveHDhhtW', 4, 1, '2026-04-18 02:41:15', '2026-04-18 02:41:15', 'active'),
(10, 'tapalesrasheed123@gmail.com', '$2b$10$6alJT26WqC/Eg5RdSja.Kum8nYnGDO.n5TdHVuswm1fdFrFmsRVIu', 1, 1, '2026-04-21 09:22:36', '2026-04-21 09:23:09', 'active'),
(11, 'tapalesrasheed123+1@gmail.com', '$2b$10$hHeFjCgdaHj.Iqq9iw0JVONh0xDmFtki8lxeDqdsWhASHll1VrxeO', 2, 1, '2026-04-21 09:24:46', '2026-04-21 09:24:58', 'active');

-- --------------------------------------------------------

--
-- Table structure for table `cart_table`
--

CREATE TABLE `cart_table` (
  `cart_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` decimal(10,2) NOT NULL DEFAULT 1.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `farmer_badges`
--

CREATE TABLE `farmer_badges` (
  `id` int(11) NOT NULL,
  `farmer_id` int(11) NOT NULL,
  `badge_type` varchar(50) NOT NULL,
  `badge_label` varchar(100) NOT NULL,
  `notes` text DEFAULT NULL,
  `issued_by` int(11) NOT NULL,
  `issued_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `revoked_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `farmer_service_reviews`
--

CREATE TABLE `farmer_service_reviews` (
  `fsr_id` int(11) NOT NULL,
  `req_id` int(11) NOT NULL,
  `reviewer_id` int(11) NOT NULL,
  `farmer_id` int(11) NOT NULL,
  `rating` int(11) NOT NULL CHECK (`rating` between 1 and 5),
  `comment` text DEFAULT NULL,
  `product_id` int(11) DEFAULT NULL,
  `product_name_snapshot` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `farms_table`
--

CREATE TABLE `farms_table` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `farm_name` varchar(255) DEFAULT NULL,
  `farm_image` varchar(255) DEFAULT NULL,
  `farm_address` text DEFAULT NULL,
  `farm_city` varchar(100) DEFAULT NULL,
  `farm_province` varchar(100) DEFAULT NULL,
  `farm_zip_code` varchar(20) DEFAULT NULL,
  `farm_latitude` decimal(10,8) DEFAULT NULL,
  `farm_longitude` decimal(11,8) DEFAULT NULL,
  `is_same_as_home` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `farm_gallery_images`
--

CREATE TABLE `farm_gallery_images` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `image_path` varchar(255) NOT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `messages_table`
--

CREATE TABLE `messages_table` (
  `m_id` int(11) NOT NULL,
  `sender_id` int(11) NOT NULL,
  `receiver_id` int(11) NOT NULL,
  `content` text NOT NULL,
  `image_path` varchar(512) DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notifications_table`
--

CREATE TABLE `notifications_table` (
  `n_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(100) NOT NULL,
  `message` varchar(255) NOT NULL,
  `type` enum('order','message','system') NOT NULL,
  `status` enum('unread','read') DEFAULT 'unread',
  `link` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_category`
--

CREATE TABLE `product_category` (
  `cat_id` int(11) NOT NULL,
  `cat_name` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `product_category`
--

INSERT INTO `product_category` (`cat_id`, `cat_name`) VALUES
(7, 'Beans & Nuts'),
(5, 'Fruits'),
(6, 'Herbs & Spices'),
(3, 'Leafy Greens'),
(8, 'Others (Default)'),
(1, 'Rice & Corn'),
(4, 'Root Crops'),
(2, 'Vegetables');

-- --------------------------------------------------------

--
-- Table structure for table `product_reviews`
--

CREATE TABLE `product_reviews` (
  `r_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `rating` int(11) NOT NULL CHECK (`rating` between 1 and 5),
  `comment` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_table`
--

CREATE TABLE `product_table` (
  `p_id` int(11) NOT NULL,
  `u_id` int(11) NOT NULL,
  `p_name` varchar(255) NOT NULL,
  `p_description` text DEFAULT NULL,
  `p_price` decimal(10,2) NOT NULL,
  `p_unit` varchar(50) NOT NULL,
  `p_quantity` decimal(10,2) NOT NULL,
  `p_category` int(11) NOT NULL,
  `p_image` varchar(255) DEFAULT NULL,
  `p_status` enum('active','archived') DEFAULT 'active',
  `harvest_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `p_original_quantity` decimal(10,2) DEFAULT NULL,
  `low_stock_percentage_threshold` decimal(5,4) NOT NULL DEFAULT 0.2000,
  `low_stock_minimum_threshold` decimal(10,2) NOT NULL DEFAULT 5.00,
  `p_image_embedding` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `purchase_table`
--

CREATE TABLE `purchase_table` (
  `req_id` int(11) NOT NULL,
  `buyer_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `req_status` enum('Pending','Confirmed','Completed','Cancelled') DEFAULT 'Pending',
  `req_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `invoice_number` varchar(50) DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `role_table`
--

CREATE TABLE `role_table` (
  `id` int(11) NOT NULL,
  `role_name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `role_table`
--

INSERT INTO `role_table` (`id`, `role_name`) VALUES
(4, 'admin'),
(3, 'brgy_official'),
(1, 'buyer'),
(2, 'farmer');

-- --------------------------------------------------------

--
-- Table structure for table `system_logs`
--

CREATE TABLE `system_logs` (
  `log_id` int(11) NOT NULL,
  `correlation_id` varchar(64) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `user_name` varchar(150) DEFAULT NULL,
  `user_role` varchar(80) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `event_type` varchar(80) DEFAULT NULL,
  `module` varchar(80) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `severity` varchar(50) DEFAULT NULL,
  `method` varchar(10) DEFAULT NULL,
  `endpoint` varchar(255) DEFAULT NULL,
  `http_status` int(11) DEFAULT NULL,
  `error_code` varchar(100) DEFAULT NULL,
  `error_message` text DEFAULT NULL,
  `ip_address` varchar(64) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `duration_ms` int(11) DEFAULT NULL,
  `before_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`before_data`)),
  `after_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`after_data`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `system_logs`
--

INSERT INTO `system_logs` (`log_id`, `correlation_id`, `user_id`, `user_name`, `user_role`, `action`, `event_type`, `module`, `description`, `category`, `severity`, `method`, `endpoint`, `http_status`, `error_code`, `error_message`, `ip_address`, `user_agent`, `duration_ms`, `before_data`, `after_data`, `created_at`) VALUES
(1, NULL, NULL, 'Rasheed Tapales', 'buyer', 'New User Registered', 'register', 'Authentication', 'Account created for tapalesrasheed123@gmail.com with role \"buyer\"', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-21 09:22:37'),
(5, NULL, 2, 'AgriLink Admin', 'admin', 'User Login', 'login', 'Authentication', 'Successful login for AgriLink', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-21 09:33:21'),
(6, NULL, 11, 'Rasheed Ni', 'farmer', 'User Login', 'login', 'Authentication', 'Successful login for tapalesrasheed123+1@gmail.com', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-21 09:25:11'),
(9, NULL, 11, 'Rasheed Ni', 'farmer', 'User Logout', 'logout', 'Authentication', 'Successful logout for Rasheed Ni', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-21 09:33:12'),
(606, NULL, 10, 'Rasheed Tapales', 'buyer', 'User Logout', 'logout', 'Authentication', 'Successful logout for Rasheed Tapales', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-21 09:23:58'),
(661, NULL, 2, 'AgriLink Admin', 'admin', 'User Login', 'login', 'Authentication', 'Successful login for AgriLink', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-21 09:34:07'),
(4388, NULL, 2, 'AgriLink Admin', 'admin', 'User Logout', 'logout', 'Authentication', 'Successful logout for AgriLink Admin', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-21 05:13:51'),
(81028, NULL, 10, 'Rasheed Tapales', 'buyer', 'User Login', 'login', 'Authentication', 'Successful login for tapalesrasheed123@gmail.com', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-21 09:23:16'),
(81029, NULL, NULL, 'Rasheed Ni', 'farmer', 'New User Registered', 'register', 'Authentication', 'Account created for tapalesrasheed123+1@gmail.com with role \"farmer\"', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-21 09:24:46');

-- --------------------------------------------------------

--
-- Table structure for table `users_table`
--

CREATE TABLE `users_table` (
  `id` int(11) NOT NULL,
  `auth_id` int(11) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `province` varchar(100) DEFAULT NULL,
  `zip_code` varchar(20) DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `role` enum('buyer','farmer','brgy_official','lgu_official','admin') NOT NULL DEFAULT 'buyer',
  `onboarding_completed` tinyint(1) DEFAULT 0,
  `profile_image` varchar(255) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `last_session_activity_at` datetime DEFAULT NULL COMMENT 'Last authenticated API activity',
  `farm_address` text DEFAULT NULL,
  `farm_city` varchar(100) DEFAULT NULL,
  `farm_province` varchar(100) DEFAULT NULL,
  `farm_zip_code` varchar(20) DEFAULT NULL,
  `farm_latitude` decimal(10,8) DEFAULT NULL,
  `farm_longitude` decimal(11,8) DEFAULT NULL,
  `farm_address_same_as_home` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users_table`
--

INSERT INTO `users_table` (`id`, `auth_id`, `first_name`, `last_name`, `phone`, `address`, `city`, `province`, `zip_code`, `latitude`, `longitude`, `role`, `onboarding_completed`, `profile_image`, `bio`, `last_session_activity_at`, `farm_address`, `farm_city`, `farm_province`, `farm_zip_code`, `farm_latitude`, `farm_longitude`, `farm_address_same_as_home`, `created_at`) VALUES
(2, 2, 'AgriLink', 'Admin', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'admin', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-18 02:41:15');

-- --------------------------------------------------------

--
-- Table structure for table `user_favorites`
--

CREATE TABLE `user_favorites` (
  `fav_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `auth_table`
--
ALTER TABLE `auth_table`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `role_id` (`role_id`);

--
-- Indexes for table `cart_table`
--
ALTER TABLE `cart_table`
  ADD PRIMARY KEY (`cart_id`),
  ADD UNIQUE KEY `uq_cart_user_product` (`user_id`,`product_id`),
  ADD KEY `idx_cart_product` (`product_id`);

--
-- Indexes for table `farmer_badges`
--
ALTER TABLE `farmer_badges`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_farmer` (`farmer_id`),
  ADD KEY `idx_issued_by` (`issued_by`);

--
-- Indexes for table `farmer_service_reviews`
--
ALTER TABLE `farmer_service_reviews`
  ADD PRIMARY KEY (`fsr_id`),
  ADD UNIQUE KEY `uq_review_per_order` (`req_id`),
  ADD KEY `idx_farmer_created` (`farmer_id`,`created_at`),
  ADD KEY `fsr_reviewer_fk` (`reviewer_id`),
  ADD KEY `fsr_product_fk` (`product_id`);

--
-- Indexes for table `farms_table`
--
ALTER TABLE `farms_table`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`);

--
-- Indexes for table `farm_gallery_images`
--
ALTER TABLE `farm_gallery_images`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_farm_gallery_user_id` (`user_id`);

--
-- Indexes for table `messages_table`
--
ALTER TABLE `messages_table`
  ADD PRIMARY KEY (`m_id`),
  ADD KEY `sender_id` (`sender_id`),
  ADD KEY `receiver_id` (`receiver_id`);

--
-- Indexes for table `notifications_table`
--
ALTER TABLE `notifications_table`
  ADD PRIMARY KEY (`n_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `product_category`
--
ALTER TABLE `product_category`
  ADD PRIMARY KEY (`cat_id`),
  ADD UNIQUE KEY `cat_name` (`cat_name`);

--
-- Indexes for table `product_reviews`
--
ALTER TABLE `product_reviews`
  ADD PRIMARY KEY (`r_id`),
  ADD UNIQUE KEY `uq_user_product_review` (`user_id`,`product_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `product_table`
--
ALTER TABLE `product_table`
  ADD PRIMARY KEY (`p_id`),
  ADD KEY `p_category` (`p_category`),
  ADD KEY `u_id` (`u_id`);

--
-- Indexes for table `purchase_table`
--
ALTER TABLE `purchase_table`
  ADD PRIMARY KEY (`req_id`),
  ADD KEY `buyer_id` (`buyer_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `role_table`
--
ALTER TABLE `role_table`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `role_name` (`role_name`);

--
-- Indexes for table `system_logs`
--
ALTER TABLE `system_logs`
  ADD PRIMARY KEY (`log_id`);

--
-- Indexes for table `users_table`
--
ALTER TABLE `users_table`
  ADD PRIMARY KEY (`id`),
  ADD KEY `auth_id` (`auth_id`);

--
-- Indexes for table `user_favorites`
--
ALTER TABLE `user_favorites`
  ADD PRIMARY KEY (`fav_id`),
  ADD UNIQUE KEY `uq_user_product` (`user_id`,`product_id`),
  ADD KEY `product_id` (`product_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `auth_table`
--
ALTER TABLE `auth_table`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `cart_table`
--
ALTER TABLE `cart_table`
  MODIFY `cart_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `farmer_badges`
--
ALTER TABLE `farmer_badges`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `farmer_service_reviews`
--
ALTER TABLE `farmer_service_reviews`
  MODIFY `fsr_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `farms_table`
--
ALTER TABLE `farms_table`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `farm_gallery_images`
--
ALTER TABLE `farm_gallery_images`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `messages_table`
--
ALTER TABLE `messages_table`
  MODIFY `m_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `notifications_table`
--
ALTER TABLE `notifications_table`
  MODIFY `n_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `product_category`
--
ALTER TABLE `product_category`
  MODIFY `cat_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `product_reviews`
--
ALTER TABLE `product_reviews`
  MODIFY `r_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `product_table`
--
ALTER TABLE `product_table`
  MODIFY `p_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `purchase_table`
--
ALTER TABLE `purchase_table`
  MODIFY `req_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `role_table`
--
ALTER TABLE `role_table`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `system_logs`
--
ALTER TABLE `system_logs`
  MODIFY `log_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=81030;

--
-- AUTO_INCREMENT for table `users_table`
--
ALTER TABLE `users_table`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `user_favorites`
--
ALTER TABLE `user_favorites`
  MODIFY `fav_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `auth_table`
--
ALTER TABLE `auth_table`
  ADD CONSTRAINT `auth_table_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `role_table` (`id`);

--
-- Constraints for table `cart_table`
--
ALTER TABLE `cart_table`
  ADD CONSTRAINT `cart_table_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users_table` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `cart_table_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `product_table` (`p_id`) ON DELETE CASCADE;

--
-- Constraints for table `farmer_service_reviews`
--
ALTER TABLE `farmer_service_reviews`
  ADD CONSTRAINT `fsr_farmer_fk` FOREIGN KEY (`farmer_id`) REFERENCES `users_table` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fsr_product_fk` FOREIGN KEY (`product_id`) REFERENCES `product_table` (`p_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fsr_req_fk` FOREIGN KEY (`req_id`) REFERENCES `purchase_table` (`req_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fsr_reviewer_fk` FOREIGN KEY (`reviewer_id`) REFERENCES `users_table` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `farms_table`
--
ALTER TABLE `farms_table`
  ADD CONSTRAINT `farms_table_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users_table` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `farm_gallery_images`
--
ALTER TABLE `farm_gallery_images`
  ADD CONSTRAINT `fk_farm_gallery_user` FOREIGN KEY (`user_id`) REFERENCES `users_table` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `messages_table`
--
ALTER TABLE `messages_table`
  ADD CONSTRAINT `messages_table_ibfk_1` FOREIGN KEY (`sender_id`) REFERENCES `users_table` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `messages_table_ibfk_2` FOREIGN KEY (`receiver_id`) REFERENCES `users_table` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `notifications_table`
--
ALTER TABLE `notifications_table`
  ADD CONSTRAINT `notifications_table_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users_table` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `product_reviews`
--
ALTER TABLE `product_reviews`
  ADD CONSTRAINT `product_reviews_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `product_table` (`p_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `product_reviews_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users_table` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `product_table`
--
ALTER TABLE `product_table`
  ADD CONSTRAINT `product_table_ibfk_1` FOREIGN KEY (`u_id`) REFERENCES `users_table` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `product_table_ibfk_2` FOREIGN KEY (`p_category`) REFERENCES `product_category` (`cat_id`);

--
-- Constraints for table `purchase_table`
--
ALTER TABLE `purchase_table`
  ADD CONSTRAINT `purchase_table_ibfk_1` FOREIGN KEY (`buyer_id`) REFERENCES `users_table` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `purchase_table_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `product_table` (`p_id`) ON DELETE CASCADE;

--
-- Constraints for table `users_table`
--
ALTER TABLE `users_table`
  ADD CONSTRAINT `users_table_ibfk_1` FOREIGN KEY (`auth_id`) REFERENCES `auth_table` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_favorites`
--
ALTER TABLE `user_favorites`
  ADD CONSTRAINT `user_favorites_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users_table` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_favorites_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `product_table` (`p_id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
