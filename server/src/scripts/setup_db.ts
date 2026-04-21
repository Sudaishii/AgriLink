import { db } from '../database/database';

async function setupDatabase() {
    try {
        console.log('--- Setting up Database: agrilink_db ---');

        // 1. Product Category Table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS product_category (
                cat_id INT AUTO_INCREMENT PRIMARY KEY,
                cat_name VARCHAR(255) NOT NULL UNIQUE
            )
        `);
        console.log('Table "product_category" is ready.');

        // Insert default categories if empty
        const [categories]: any = await db.execute('SELECT COUNT(*) as count FROM product_category');
        if (categories[0].count === 0) {
            await db.execute(`
                INSERT INTO product_category (cat_name) VALUES
                ('Rice & Corn'),
                ('Vegetables'),
                ('Leafy Greens'),
                ('Root Crops'),
                ('Fruits'),
                ('Herbs & Spices'),
                ('Beans & Nuts')
            `);
            console.log('Default categories inserted.');
        } else {
            // Migrate legacy categories to new names if they exist
            const renames = [
                ['Grains', 'Rice & Corn'],
                ['Others', 'Rice & Corn'],
                ['Organic Rice', 'Rice & Corn'],
                ['Cereals & Staples', 'Rice & Corn'],
            ];
            for (const [oldName, newName] of renames) {
                await db.execute(
                    'UPDATE product_category SET cat_name = ? WHERE cat_name = ?',
                    [newName, oldName]
                ).catch(() => {}); // ignore if duplicate
            }
            // Ensure all 7 categories exist
            const newCats = ['Rice & Corn', 'Vegetables', 'Leafy Greens', 'Root Crops', 'Fruits', 'Herbs & Spices', 'Beans & Nuts'];
            await db.execute('UPDATE product_category SET cat_name = ? WHERE cat_name = ?', ['Rice & Corn', 'Legumes']).catch(() => {});
            for (const cat of newCats) {
                await db.execute(
                    'INSERT IGNORE INTO product_category (cat_name) VALUES (?)',
                    [cat]
                );
            }
            console.log('Categories migrated/ensured.');
        }

        // 2. Users Table - Ensure consistency with auth_table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS users_table (
                id INT AUTO_INCREMENT PRIMARY KEY,
                auth_id INT NOT NULL,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                onboarding_completed TINYINT(1) DEFAULT 0,
                KEY auth_id (auth_id),
                CONSTRAINT users_table_ibfk_1 FOREIGN KEY (auth_id) REFERENCES auth_table (id) ON DELETE CASCADE
            )
        `);
        console.log('Table "users_table" is ready.');

        // Ensure profile columns exist for profile editing and onboarding features.
        await db.execute('ALTER TABLE users_table ADD COLUMN IF NOT EXISTS phone VARCHAR(20) DEFAULT NULL');
        await db.execute('ALTER TABLE users_table ADD COLUMN IF NOT EXISTS address TEXT DEFAULT NULL');
        await db.execute('ALTER TABLE users_table ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT NULL');
        await db.execute('ALTER TABLE users_table ADD COLUMN IF NOT EXISTS province VARCHAR(100) DEFAULT NULL');
        await db.execute('ALTER TABLE users_table ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20) DEFAULT NULL');
        await db.execute('ALTER TABLE users_table ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8) DEFAULT NULL');
        await db.execute('ALTER TABLE users_table ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8) DEFAULT NULL');
        await db.execute('ALTER TABLE users_table ADD COLUMN IF NOT EXISTS role ENUM("buyer","farmer","brgy_official","lgu_official","admin") DEFAULT "buyer"');
        await db.execute('ALTER TABLE users_table ADD COLUMN IF NOT EXISTS profile_image VARCHAR(255) DEFAULT NULL');
        await db.execute('ALTER TABLE users_table ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT NULL');

        // Keep compatibility with legacy farm columns when farms_table is absent in older schemas.
        await db.execute('ALTER TABLE users_table ADD COLUMN IF NOT EXISTS farm_address TEXT DEFAULT NULL');
        await db.execute('ALTER TABLE users_table ADD COLUMN IF NOT EXISTS farm_city VARCHAR(100) DEFAULT NULL');
        await db.execute('ALTER TABLE users_table ADD COLUMN IF NOT EXISTS farm_province VARCHAR(100) DEFAULT NULL');
        await db.execute('ALTER TABLE users_table ADD COLUMN IF NOT EXISTS farm_zip_code VARCHAR(20) DEFAULT NULL');
        await db.execute('ALTER TABLE users_table ADD COLUMN IF NOT EXISTS farm_latitude DECIMAL(10,8) DEFAULT NULL');
        await db.execute('ALTER TABLE users_table ADD COLUMN IF NOT EXISTS farm_longitude DECIMAL(11,8) DEFAULT NULL');
        await db.execute('ALTER TABLE users_table ADD COLUMN IF NOT EXISTS farm_address_same_as_home TINYINT(1) DEFAULT 1');
        console.log('users_table profile/farm columns ensured.');

        // 3. Product Table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS product_table (
                p_id INT AUTO_INCREMENT PRIMARY KEY,
                u_id INT NOT NULL,
                p_name VARCHAR(255) NOT NULL,
                p_description TEXT,
                p_price DECIMAL(10, 2) NOT NULL,
                p_unit VARCHAR(50) NOT NULL,
                p_quantity DECIMAL(10, 2) NOT NULL,
                p_original_quantity DECIMAL(10, 2) DEFAULT NULL,
                low_stock_percentage_threshold DECIMAL(5, 4) NOT NULL DEFAULT 0.2000,
                low_stock_minimum_threshold DECIMAL(10, 2) NOT NULL DEFAULT 5.00,
                p_category INT NOT NULL,
                p_image VARCHAR(255),
                p_status ENUM('active', 'archived') DEFAULT 'active',
                harvest_date DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (u_id) REFERENCES users_table(id) ON DELETE CASCADE,
                FOREIGN KEY (p_category) REFERENCES product_category(cat_id)
            )
        `);
        console.log('Table "product_table" is ready.');
        await db.execute('ALTER TABLE product_table ADD COLUMN IF NOT EXISTS p_original_quantity DECIMAL(10, 2) DEFAULT NULL');
        await db.execute('ALTER TABLE product_table ADD COLUMN IF NOT EXISTS low_stock_percentage_threshold DECIMAL(5, 4) NOT NULL DEFAULT 0.2000');
        await db.execute('ALTER TABLE product_table ADD COLUMN IF NOT EXISTS low_stock_minimum_threshold DECIMAL(10, 2) NOT NULL DEFAULT 5.00');
        await db.execute('UPDATE product_table SET p_original_quantity = p_quantity WHERE p_original_quantity IS NULL');

        // 4. User Favorites Table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS user_favorites (
                fav_id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                product_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users_table(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES product_table(p_id) ON DELETE CASCADE,
                UNIQUE KEY uq_user_product (user_id, product_id)
            )
        `);
        console.log('Table "user_favorites" is ready.');

        // 5. Farms Table (normalized farmer profile data)
        await db.execute(`
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
            )
        `);
        console.log('Table "farms_table" is ready.');

        // 6. Purchase Table (Orders)
        await db.execute(`
            CREATE TABLE IF NOT EXISTS purchase_table (
                req_id INT AUTO_INCREMENT PRIMARY KEY,
                buyer_id INT NOT NULL,
                product_id INT NOT NULL,
                quantity DECIMAL(10, 2) NOT NULL,
                req_status ENUM('Pending', 'Confirmed', 'Completed', 'Cancelled') DEFAULT 'Pending',
                req_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                invoice_number VARCHAR(50) DEFAULT NULL,
                completed_at TIMESTAMP NULL DEFAULT NULL,
                FOREIGN KEY (buyer_id) REFERENCES users_table(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES product_table(p_id) ON DELETE CASCADE
            )
        `);
        console.log('Table "purchase_table" is ready.');
        await db.execute('ALTER TABLE purchase_table ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50) DEFAULT NULL');
        await db.execute('ALTER TABLE purchase_table ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP NULL DEFAULT NULL');
        await db.execute(
            `UPDATE purchase_table
             SET invoice_number = CONCAT(
               'ORD-',
               DATE_FORMAT(COALESCE(completed_at, req_date), '%Y%m%d'),
               '-',
               LPAD(req_id, 6, '0')
             )
             WHERE req_status = 'Completed'
               AND (invoice_number IS NULL OR invoice_number = '' OR invoice_number LIKE 'INV-%')`
        );

        // 7. Farmer Service Reviews Table (order-level review independent from product lifecycle)
        await db.execute(`
            CREATE TABLE IF NOT EXISTS farmer_service_reviews (
                fsr_id INT AUTO_INCREMENT PRIMARY KEY,
                req_id INT NOT NULL,
                reviewer_id INT NOT NULL,
                farmer_id INT NOT NULL,
                rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
                comment TEXT,
                product_id INT NULL,
                product_name_snapshot VARCHAR(255) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_review_per_order (req_id),
                KEY idx_farmer_created (farmer_id, created_at),
                FOREIGN KEY (req_id) REFERENCES purchase_table(req_id) ON DELETE CASCADE,
                FOREIGN KEY (reviewer_id) REFERENCES users_table(id) ON DELETE CASCADE,
                FOREIGN KEY (farmer_id) REFERENCES users_table(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES product_table(p_id) ON DELETE SET NULL
            )
        `);
        console.log('Table "farmer_service_reviews" is ready.');

        // 7. Phenotyping Results Table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS phenotyping_results (
                result_id INT AUTO_INCREMENT PRIMARY KEY,
                product_id INT NOT NULL,
                result_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                variety VARCHAR(255),
                health_score DECIMAL(5, 2),
                predicted_yield DECIMAL(10, 2),
                status VARCHAR(100),
                FOREIGN KEY (product_id) REFERENCES product_table(p_id) ON DELETE CASCADE
            )
        `);
        console.log('Table "phenotyping_results" is ready.');

        console.log('\nDatabase setup completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Database setup failed:', error);
        process.exit(1);
    }
}

setupDatabase();
