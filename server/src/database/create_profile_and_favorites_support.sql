-- Safe migration for environments missing profile/favorites/farm support.
-- This script is idempotent and can be run multiple times.

ALTER TABLE users_table ADD COLUMN IF NOT EXISTS phone VARCHAR(20) DEFAULT NULL;
ALTER TABLE users_table ADD COLUMN IF NOT EXISTS address TEXT DEFAULT NULL;
ALTER TABLE users_table ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT NULL;
ALTER TABLE users_table ADD COLUMN IF NOT EXISTS province VARCHAR(100) DEFAULT NULL;
ALTER TABLE users_table ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20) DEFAULT NULL;
ALTER TABLE users_table ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8) DEFAULT NULL;
ALTER TABLE users_table ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8) DEFAULT NULL;
ALTER TABLE users_table ADD COLUMN IF NOT EXISTS role ENUM('buyer','farmer','brgy_official','lgu_official','admin') DEFAULT 'buyer';
ALTER TABLE users_table ADD COLUMN IF NOT EXISTS profile_image VARCHAR(255) DEFAULT NULL;
ALTER TABLE users_table ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT NULL;

-- Legacy farm columns kept for backward compatibility.
ALTER TABLE users_table ADD COLUMN IF NOT EXISTS farm_address TEXT DEFAULT NULL;
ALTER TABLE users_table ADD COLUMN IF NOT EXISTS farm_city VARCHAR(100) DEFAULT NULL;
ALTER TABLE users_table ADD COLUMN IF NOT EXISTS farm_province VARCHAR(100) DEFAULT NULL;
ALTER TABLE users_table ADD COLUMN IF NOT EXISTS farm_zip_code VARCHAR(20) DEFAULT NULL;
ALTER TABLE users_table ADD COLUMN IF NOT EXISTS farm_latitude DECIMAL(10,8) DEFAULT NULL;
ALTER TABLE users_table ADD COLUMN IF NOT EXISTS farm_longitude DECIMAL(11,8) DEFAULT NULL;
ALTER TABLE users_table ADD COLUMN IF NOT EXISTS farm_address_same_as_home TINYINT(1) DEFAULT 1;

CREATE TABLE IF NOT EXISTS farms_table (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  farm_name VARCHAR(255) DEFAULT NULL,
  farm_image VARCHAR(255) DEFAULT NULL,
  farm_address TEXT DEFAULT NULL,
  farm_city VARCHAR(100) DEFAULT NULL,
  farm_province VARCHAR(100) DEFAULT NULL,
  farm_zip_code VARCHAR(20) DEFAULT NULL,
  farm_latitude DECIMAL(10,8) DEFAULT NULL,
  farm_longitude DECIMAL(11,8) DEFAULT NULL,
  is_same_as_home TINYINT(1) DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users_table(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_favorites (
  fav_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users_table(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES product_table(p_id) ON DELETE CASCADE,
  UNIQUE KEY uq_user_product (user_id, product_id)
);
