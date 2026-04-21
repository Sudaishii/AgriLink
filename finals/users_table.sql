-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Apr 15, 2026 at 04:56 PM
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
  `farm_address` text DEFAULT NULL,
  `farm_city` varchar(100) DEFAULT NULL,
  `farm_province` varchar(100) DEFAULT NULL,
  `farm_zip_code` varchar(20) DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `farm_latitude` decimal(10,8) DEFAULT NULL,
  `farm_longitude` decimal(11,8) DEFAULT NULL,
  `farm_address_same_as_home` tinyint(1) DEFAULT 1,
  `role` enum('buyer','farmer','brgy_official','lgu_official','admin') NOT NULL,
  `onboarding_completed` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `last_session_activity_at` datetime DEFAULT NULL COMMENT 'Last authenticated API activity (throttled server-side)',
  `profile_image` varchar(255) DEFAULT NULL,
  `bio` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users_table`
--

INSERT INTO `users_table` (`id`, `auth_id`, `first_name`, `last_name`, `phone`, `address`, `city`, `province`, `zip_code`, `farm_address`, `farm_city`, `farm_province`, `farm_zip_code`, `latitude`, `longitude`, `farm_latitude`, `farm_longitude`, `farm_address_same_as_home`, `role`, `onboarding_completed`, `created_at`, `last_session_activity_at`, `profile_image`, `bio`) VALUES
(1, 1, 'Rasheed', 'Culpa necessitatibus', '+63 912 345 6789', '123 Harvest Lane', 'Minglanilla', 'Cebu', '6046', NULL, NULL, NULL, NULL, 10.24440000, 123.79150000, NULL, NULL, 1, 'farmer', 1, '2026-03-04 04:21:37', NULL, NULL, NULL),
(4, 4, 'Rasheed', 'Tapales', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 'buyer', 1, '2026-04-14 08:05:57', NULL, '/uploads/profile_image-1776262496919-8800440.jpg', NULL),
(5, 5, 'Rasheed', 'Tapales', '09456989966', 'Tinubdan, San Fernando', 'San Fernando', 'Cebu', '6018', NULL, NULL, NULL, NULL, 10.31570000, 123.88540000, NULL, NULL, 1, 'farmer', 1, '2026-04-15 14:50:08', NULL, NULL, NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `users_table`
--
ALTER TABLE `users_table`
  ADD PRIMARY KEY (`id`),
  ADD KEY `auth_id` (`auth_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `users_table`
--
ALTER TABLE `users_table`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `users_table`
--
ALTER TABLE `users_table`
  ADD CONSTRAINT `users_table_ibfk_1` FOREIGN KEY (`auth_id`) REFERENCES `auth_table` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
