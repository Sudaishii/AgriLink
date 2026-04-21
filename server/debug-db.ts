
import { db } from './src/database/database';

async function check() {
  try {
    const [users]: any = await db.execute('SELECT * FROM users_table');
    console.log('Users count:', users.length);
    console.log('Users:', JSON.stringify(users, null, 2));
    const [joined]: any = await db.execute(`
      SELECT u.id, u.first_name, u.last_name, a.email, r.role_name, a.status
      FROM users_table u
      JOIN auth_table a ON u.auth_id = a.id
      JOIN role_table r ON a.role_id = r.id
    `);
    console.log('Joined count:', joined.length);
    console.log('Joined users:', JSON.stringify(joined, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
