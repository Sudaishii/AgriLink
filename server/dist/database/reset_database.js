"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("./database");
async function reset() {
    console.log('--- STARTING GLOBAL DATABASE RESET ---');
    try {
        await database_1.db.execute('SET FOREIGN_KEY_CHECKS = 0');
        const tables = [
            'system_logs', 'purchase_table', 'product_table', 'farmer_badges',
            'farmer_service_reviews', 'farm_gallery', 'farms_table', 'message_table',
            'notification_table', 'users_table', 'auth_table', 'role_table'
        ];
        for (const table of tables) {
            console.log(`Dropping table: ${table}...`);
            await database_1.db.execute(`DROP TABLE IF EXISTS ${table}`);
        }
        console.log('Rebuilding base schema...');
        await database_1.db.execute('CREATE TABLE role_table (id INT AUTO_INCREMENT PRIMARY KEY, role_name VARCHAR(50) NOT NULL UNIQUE)');
        await database_1.db.execute("INSERT INTO role_table (role_name) VALUES ('admin'), ('farmer'), ('buyer'), ('brgy_official')");
        await database_1.db.execute(`
            CREATE TABLE auth_table (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(150) NOT NULL UNIQUE,
                password VARCHAR(255) NULL,
                role_id INT NOT NULL,
                is_verified TINYINT(1) DEFAULT 0,
                status VARCHAR(20) DEFAULT 'active',
                FOREIGN KEY (role_id) REFERENCES role_table(id)
            )
        `);
        await database_1.db.execute(`
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
            )
        `);
        await database_1.db.execute('SET FOREIGN_KEY_CHECKS = 1');
        console.log('--- DATABASE RESET SUCCESSFUL ---');
        console.log('Server will auto-generate remaining tables on next start.');
        process.exit(0);
    }
    catch (error) {
        console.error('--- RESET FAILED ---');
        console.error(error);
        process.exit(1);
    }
}
reset();
