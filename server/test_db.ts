import { db } from './src/database/database';

async function test() {
  const [users] = await db.execute('SELECT id, first_name, last_name, role, city, address FROM users_table');
  console.log(users);
  process.exit();
}
test();
