const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, 'server', '.env') });

async function check() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const [rows] = await db.execute('SHOW TABLES');
    console.log('Tables:', JSON.stringify(rows));

    const [columns] = await db.execute('DESCRIBE users_table');
    console.log('users_table columns:', JSON.stringify(columns));

    try {
      const [farmColumns] = await db.execute('DESCRIBE farms_table');
      console.log('farms_table columns:', JSON.stringify(farmColumns));
    } catch (e) {
      console.log('farms_table might be missing:', e.message);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await db.end();
  }
}

check();
