-- Migration: Move farm data to a separate farms_table
-- Run this against your database to normalize farm data

CREATE TABLE IF NOT EXISTS farms_table (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    farm_name VARCHAR(255) DEFAULT NULL,
    farm_address TEXT DEFAULT NULL,
    farm_city VARCHAR(100) DEFAULT NULL,
    farm_province VARCHAR(100) DEFAULT NULL,
    farm_zip_code VARCHAR(20) DEFAULT NULL,
    farm_latitude DECIMAL(10,8) DEFAULT NULL,
    farm_longitude DECIMAL(11,8) DEFAULT NULL,
    is_same_as_home TINYINT(1) DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users_table(id) ON DELETE CASCADE
);

-- Migrate existing farmer data if any
INSERT IGNORE INTO farms_table (user_id, farm_address, farm_city, farm_province, farm_zip_code, farm_latitude, farm_longitude, is_same_as_home)
SELECT id, farm_address, farm_city, farm_province, farm_zip_code, farm_latitude, farm_longitude, farm_address_same_as_home
FROM users_table
WHERE role = 'farmer';

-- Note: We'll keep the columns in users_table for a while to avoid breaking queries 
-- until the backend is fully updated. After updating backend, you can drop them:
-- ALTER TABLE users_table DROP COLUMN farm_address, DROP COLUMN farm_city, DROP COLUMN farm_province, DROP COLUMN farm_zip_code, DROP COLUMN farm_latitude, DROP COLUMN farm_longitude, DROP COLUMN farm_address_same_as_home;
