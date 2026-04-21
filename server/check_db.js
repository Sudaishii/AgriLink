
const mysql = require('mysql2/promise');
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'agrilink_db'
};

async function test() {
  const connection = await mysql.createConnection(dbConfig);
  const [rows] = await connection.execute("SELECT id, first_name, last_name, role FROM users_table WHERE role='brgy_official'");
  console.log(JSON.stringify(rows, null, 2));
  await connection.end();
}
test();
