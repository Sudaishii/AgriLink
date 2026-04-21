const mysql = require('mysql2/promise');
require('dotenv').config({ path: './server/.env' });

async function checkRoles() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'agrilink_db'
        });
        
        const [roles] = await connection.execute('SELECT * FROM role_table');
        console.log('Roles:', roles);
        
        const [admins] = await connection.execute(`
            SELECT a.email, r.role_name 
            FROM auth_table a 
            JOIN role_table r ON a.role_id = r.id 
            WHERE r.role_name = 'admin'
        `);
        console.log('Admins:', admins);
        await connection.end();
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkRoles();
