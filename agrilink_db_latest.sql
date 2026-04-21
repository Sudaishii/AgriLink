-- AgriLink Comprehensive Database Restoration Script
-- This script reconstructs the latest version of the agrilink_db database
-- Combining the base schema with all known migrations and updates.

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
CREATE DATABASE IF NOT EXISTS `agrilink_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `agrilink_db`;

-- --------------------------------------------------------

--
-- Table structure for table `role_table`
--

CREATE TABLE IF NOT EXISTS `role_table` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `role_name` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_name` (`role_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `role_table`
--

INSERT IGNORE INTO `role_table` (`id`, `role_name`) VALUES
(1, 'buyer'),
(2, 'farmer'),
(3, 'brgy_official'),
(4, 'admin');

-- --------------------------------------------------------

--
-- Table structure for table `auth_table`
--

CREATE TABLE IF NOT EXISTS `auth_table` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role_id` int(11) NOT NULL,
  `is_verified` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `role_id` (`role_id`),
  CONSTRAINT `auth_table_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `role_table` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users_table`
--

CREATE TABLE IF NOT EXISTS `users_table` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
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
  -- Legacy farm columns kept for backward compatibility
  `farm_address` text DEFAULT NULL,
  `farm_city` varchar(100) DEFAULT NULL,
  `farm_province` varchar(100) DEFAULT NULL,
  `farm_zip_code` varchar(20) DEFAULT NULL,
  `farm_latitude` decimal(10,8) DEFAULT NULL,
  `farm_longitude` decimal(11,8) DEFAULT NULL,
  `farm_address_same_as_home` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `auth_id` (`auth_id`),
  CONSTRAINT `users_table_ibfk_1` FOREIGN KEY (`auth_id`) REFERENCES `auth_table` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_category`
--

CREATE TABLE IF NOT EXISTS `product_category` (
  `cat_id` int(11) NOT NULL AUTO_INCREMENT,
  `cat_name` varchar(255) NOT NULL,
  PRIMARY KEY (`cat_id`),
  UNIQUE KEY `cat_name` (`cat_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `product_category`
--

INSERT IGNORE INTO `product_category` (`cat_id`, `cat_name`) VALUES
(1, 'Vegetables'),
(2, 'Fruits'),
(3, 'Grains'),
(4, 'Root Crops'),
(5, 'Others');

-- --------------------------------------------------------

--
-- Table structure for table `product_table`
--

CREATE TABLE IF NOT EXISTS `product_table` (
  `p_id` int(11) NOT NULL AUTO_INCREMENT,
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
  PRIMARY KEY (`p_id`),
  KEY `p_category` (`p_category`),
  KEY `u_id` (`u_id`),
  CONSTRAINT `product_table_ibfk_1` FOREIGN KEY (`u_id`) REFERENCES `users_table` (`id`) ON DELETE CASCADE,
  CONSTRAINT `product_table_ibfk_2` FOREIGN KEY (`p_category`) REFERENCES `product_category` (`cat_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `purchase_table`
--

CREATE TABLE IF NOT EXISTS `purchase_table` (
  `req_id` int(11) NOT NULL AUTO_INCREMENT,
  `buyer_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `req_status` enum('Pending','Confirmed','Completed','Cancelled') DEFAULT 'Pending',
  `req_date` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`req_id`),
  KEY `buyer_id` (`buyer_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `purchase_table_ibfk_1` FOREIGN KEY (`buyer_id`) REFERENCES `users_table` (`id`) ON DELETE CASCADE,
  CONSTRAINT `purchase_table_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `product_table` (`p_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `phenotyping_results`
--

CREATE TABLE IF NOT EXISTS `phenotyping_results` (
  `result_id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` int(11) NOT NULL,
  `result_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `variety` varchar(255) DEFAULT NULL,
  `health_score` decimal(5,2) DEFAULT NULL,
  `predicted_yield` decimal(10,2) DEFAULT NULL,
  `status` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`result_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `phenotyping_results_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `product_table` (`p_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `farms_table`
--

CREATE TABLE IF NOT EXISTS `farms_table` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `farm_name` varchar(255) DEFAULT NULL,
  `farm_image` varchar(255) DEFAULT NULL,
  `farm_address` text DEFAULT NULL,
  `farm_city` varchar(100) DEFAULT NULL,
  `farm_province` varchar(100) DEFAULT NULL,
  `farm_zip_code` varchar(20) DEFAULT NULL,
  `farm_latitude` decimal(10,8) DEFAULT NULL,
  `farm_longitude` decimal(11,8) DEFAULT NULL,
  `is_same_as_home` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `farms_table_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users_table` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_favorites`
--

CREATE TABLE IF NOT EXISTS `user_favorites` (
  `fav_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`fav_id`),
  UNIQUE KEY `uq_user_product` (`user_id`,`product_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `user_favorites_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users_table` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_favorites_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `product_table` (`p_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_reviews`
--

CREATE TABLE IF NOT EXISTS `product_reviews` (
  `r_id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `rating` int(11) NOT NULL CHECK (`rating` between 1 and 5),
  `comment` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`r_id`),
  UNIQUE KEY `uq_user_product_review` (`user_id`,`product_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `product_reviews_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `product_table` (`p_id`) ON DELETE CASCADE,
  CONSTRAINT `product_reviews_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users_table` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `farmer_service_reviews`
--

CREATE TABLE IF NOT EXISTS `farmer_service_reviews` (
  `fsr_id` int(11) NOT NULL AUTO_INCREMENT,
  `req_id` int(11) NOT NULL,
  `reviewer_id` int(11) NOT NULL,
  `farmer_id` int(11) NOT NULL,
  `rating` int(11) NOT NULL CHECK (`rating` between 1 and 5),
  `comment` text DEFAULT NULL,
  `product_id` int(11) DEFAULT NULL,
  `product_name_snapshot` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`fsr_id`),
  UNIQUE KEY `uq_review_per_order` (`req_id`),
  KEY `idx_farmer_created` (`farmer_id`,`created_at`),
  KEY `fsr_reviewer_fk` (`reviewer_id`),
  KEY `fsr_product_fk` (`product_id`),
  CONSTRAINT `fsr_farmer_fk` FOREIGN KEY (`farmer_id`) REFERENCES `users_table` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fsr_product_fk` FOREIGN KEY (`product_id`) REFERENCES `product_table` (`p_id`) ON DELETE SET NULL,
  CONSTRAINT `fsr_req_fk` FOREIGN KEY (`req_id`) REFERENCES `purchase_table` (`req_id`) ON DELETE CASCADE,
  CONSTRAINT `fsr_reviewer_fk` FOREIGN KEY (`reviewer_id`) REFERENCES `users_table` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `messages_table`
--

CREATE TABLE IF NOT EXISTS `messages_table` (
  `m_id` int(11) NOT NULL AUTO_INCREMENT,
  `sender_id` int(11) NOT NULL,
  `receiver_id` int(11) NOT NULL,
  `content` text NOT NULL,
  `image_path` varchar(512) DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`m_id`),
  KEY `sender_id` (`sender_id`),
  KEY `receiver_id` (`receiver_id`),
  CONSTRAINT `messages_table_ibfk_1` FOREIGN KEY (`sender_id`) REFERENCES `users_table` (`id`) ON DELETE CASCADE,
  CONSTRAINT `messages_table_ibfk_2` FOREIGN KEY (`receiver_id`) REFERENCES `users_table` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notifications_table`
--

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
  KEY `user_id` (`user_id`),
  CONSTRAINT `notifications_table_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users_table` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Sample data and initial setup
--

-- Default Roles (already handled by INSERT IGNORE above)

-- Sample Auth User
INSERT IGNORE INTO `auth_table` (`id`, `email`, `password_hash`, `role_id`, `is_verified`, `created_at`, `updated_at`) VALUES
(1, 'tapalesrasheed123@gmail.com', '$2b$10$kKFplTLmXRwWPc4oupflcubUzMzP39m4oTSognmokOc4aq263yqou', 2, 1, '2026-03-04 04:21:37', '2026-03-04 04:22:51');

-- Sample User Profile
INSERT IGNORE INTO `users_table` (`id`, `auth_id`, `first_name`, `last_name`, `phone`, `address`, `city`, `province`, `zip_code`, `latitude`, `longitude`, `role`, `onboarding_completed`, `created_at`) VALUES
(1, 1, 'Rasheed', 'Culpa necessitatibus', '+63 912 345 6789', '123 Harvest Lane', 'Minglanilla', 'Cebu', '6046', 10.24440000, 123.79150000, 'farmer', 1, '2026-03-04 04:21:37');

-- Sample Products
INSERT IGNORE INTO `product_table` (`p_id`, `u_id`, `p_name`, `p_description`, `p_price`, `p_unit`, `p_quantity`, `p_category`, `p_image`, `p_status`, `harvest_date`, `created_at`, `updated_at`) VALUES
(2, 1, 'Carrots Ni', 'D3p3nd3 sa b1BiL1', 50.00, 'tray', 5.00, 1, '/uploads/p_image-1772675851855-815199775.webp', 'active', '2026-03-29', '2026-03-04 05:41:52', '2026-03-05 02:26:31'),
(3, 1, 'Mani (Peanut)', 'Processed peanuts', 35.00, 'kg', 12.00, 2, '/uploads/p_image-1772675843519-18929579.webp', 'active', '2026-03-23', '2026-03-04 06:49:43', '2026-03-05 01:57:23'),
(4, 1, 'Eggplant', '', 56.00, 'kg', 5.00, 1, '/uploads/p_image-1772675834927-553203057.webp', 'active', '2026-03-19', '2026-03-04 17:02:41', '2026-03-05 01:57:14'),
(5, 1, 'Meow', '6 each siopao', 5.00, 'piece', 6.00, 5, '/uploads/p_image-1772644274188-969557272.webp', 'active', '2026-03-20', '2026-03-04 17:11:14', '2026-03-04 17:11:14'),
(6, 1, 'Anim mollitia volupt', 'Consectetur iusto e', 45.00, 'tray', 16.00, 1, '/uploads/p_image-1772651165771-9105311.webp', 'active', '2026-04-03', '2026-03-04 19:06:05', '2026-03-04 19:06:05'),
(7, 1, 'Nihil architecto in ', 'Illo et Nam sit dol', 53.00, 'sack', 49.00, 5, '/uploads/p_image-1772652075378-128266556.webp', 'active', '2026-03-26', '2026-03-04 19:21:15', '2026-03-04 19:21:15'),
(8, 1, 'Aliquid voluptatibus', 'Totam ea ab ut nihil', 85.00, 'piece', 18.00, 3, '/uploads/p_image-1772655070335-805204144.webp', 'active', '2026-03-25', '2026-03-04 20:11:10', '2026-03-04 20:11:10');

-- Migrate farm data if not already done
INSERT IGNORE INTO `farms_table` (user_id, farm_address, farm_city, farm_province, farm_zip_code, farm_latitude, farm_longitude, is_same_as_home)
SELECT id, farm_address, farm_city, farm_province, farm_zip_code, farm_latitude, farm_longitude, farm_address_same_as_home
FROM users_table
WHERE role = 'farmer';

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
