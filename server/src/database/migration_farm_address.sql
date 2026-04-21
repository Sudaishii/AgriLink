-- Migration: Add farm address columns to users_table
-- Run this against your agrilink_db database

ALTER TABLE users_table
  ADD COLUMN farm_address TEXT DEFAULT NULL AFTER zip_code,
  ADD COLUMN farm_city VARCHAR(100) DEFAULT NULL AFTER farm_address,
  ADD COLUMN farm_province VARCHAR(100) DEFAULT NULL AFTER farm_city,
  ADD COLUMN farm_zip_code VARCHAR(20) DEFAULT NULL AFTER farm_province,
  ADD COLUMN farm_latitude DECIMAL(10,8) DEFAULT NULL AFTER longitude,
  ADD COLUMN farm_longitude DECIMAL(11,8) DEFAULT NULL AFTER farm_latitude,
  ADD COLUMN farm_address_same_as_home TINYINT(1) DEFAULT 1 AFTER farm_longitude;

-- For existing farmers: copy their current home address to farm address
UPDATE users_table
SET
  farm_address = address,
  farm_city = city,
  farm_province = province,
  farm_zip_code = zip_code,
  farm_latitude = latitude,
  farm_longitude = longitude,
  farm_address_same_as_home = 1
WHERE role = 'farmer';
