const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'server', '.env') });

async function checkTable() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const [rows] = await connection.query("SHOW TABLES LIKE 'user_favorites'");
        if (rows.length > 0) {
            console.log("Table 'user_favorites' exists.");
            const [columns] = await connection.query("DESCRIBE user_favorites");
            console.log("Columns:", columns);
        } else {
            console.log("Table 'user_favorites' does NOT exist.");
        }
    } catch (err) {
        console.error("Error checking table:", err);
    } finally {
        await connection.end();
    }
}

checkTable();
