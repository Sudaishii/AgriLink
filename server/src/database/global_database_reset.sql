-- AgriLink GLOBAL DATABASE RESET
-- WARNING: This will permanently DELETE all platform data.

SET FOREIGN_KEY_CHECKS = 0;

-- Drop all known tables
DROP TABLE IF EXISTS system_logs;
DROP TABLE IF EXISTS purchase_table;
DROP TABLE IF EXISTS product_table;
DROP TABLE IF EXISTS farmer_badges;
DROP TABLE IF EXISTS farmer_service_reviews;
DROP TABLE IF EXISTS farm_gallery;
DROP TABLE IF EXISTS farms_table;
DROP TABLE IF EXISTS message_table;
DROP TABLE IF EXISTS notification_table;
DROP TABLE IF EXISTS users_table;
DROP TABLE IF EXISTS auth_table;
DROP TABLE IF EXISTS role_table;

SET FOREIGN_KEY_CHECKS = 1;

-- Re-setup schema will happen automatically on next server start via the services,
-- but let's re-create the base requirements for immediate use.

CREATE TABLE role_table (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO role_table (role_name) VALUES ('admin'), ('farmer'), ('buyer'), ('brgy_official');

CREATE TABLE auth_table (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NULL,
    role_id INT NOT NULL,
    is_verified TINYINT(1) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    FOREIGN KEY (role_id) REFERENCES role_table(id)
);

CREATE TABLE users_table (
    id INT AUTO_INCREMENT PRIMARY KEY,
    auth_id INT NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    province VARCHAR(100),
    zip_code VARCHAR(20),
    profile_image VARCHAR(255),
    role VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (auth_id) REFERENCES auth_table(id) ON DELETE CASCADE
);

-- Note: Other tables (products, orders, logs) will auto-create on first access.
