
import { db } from './src/database/database';

async function check() {
  try {
    console.log('--- ROLES ---');
    const [roles]: any = await db.execute('SELECT * FROM role_table');
    console.table(roles);

    console.log('--- ALL USERS (users_table) ---');
    const [users]: any = await db.execute('SELECT id, first_name, last_name, role, auth_id FROM users_table');
    console.table(users);

    console.log('--- AUTH RECORDS ---');
    const [auth]: any = await db.execute('SELECT id, email, role_id, status FROM auth_table');
    console.table(auth);

    console.log('--- JOINED DATA (What the app sees) ---');
    const [joined]: any = await db.execute(`
      SELECT u.id, u.first_name, u.last_name, u.role as profile_role, r.role_name as auth_role, a.email
      FROM users_table u
      LEFT JOIN auth_table a ON u.auth_id = a.id
      LEFT JOIN role_table r ON a.role_id = r.id
    `);
    console.table(joined);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
