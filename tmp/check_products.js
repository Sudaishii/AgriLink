const mysql = require('mysql2/promise');
require('dotenv').config({ path: './server/.env' });

async function checkProducts() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const [rows] = await connection.execute('SELECT p_id, p_name, p_image FROM products LIMIT 10');
        console.log('Products in DB:');
        console.log(JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error('Error querying products:', err);
    } finally {
        await connection.end();
    }
}

checkProducts();
