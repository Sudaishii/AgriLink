import { db } from './src/database/database';
import { hashPassword } from './src/utils/hash';

async function setupAdmin() {
    try {
        const username = 'AgriLink';
        const password = 'AgriLink123';
        
        console.log('--- AgriLink Admin Setup ---');

        // 1. Ensure admin role exists
        const [roles]: any = await db.execute('SELECT id FROM role_table WHERE LOWER(role_name) = "admin"');
        let adminRoleId: number;
        
        if (roles.length === 0) {
            console.log('Creating admin role...');
            const [insertRole]: any = await db.execute('INSERT INTO role_table (role_name) VALUES ("admin")');
            adminRoleId = insertRole.insertId;
        } else {
            adminRoleId = roles[0].id;
        }
        
        console.log('Admin Role ID:', adminRoleId);

        // 2. Hash password
        const passwordHash = await hashPassword(password);

        // 3. Check if admin user exists in auth_table
        const [existingAuth]: any = await db.execute('SELECT id FROM auth_table WHERE email = ?', [username]);
        
        let authId: number;
        if (existingAuth.length === 0) {
            console.log('Creating admin auth record...');
            const [insertAuth]: any = await db.execute(
                'INSERT INTO auth_table (email, password_hash, role_id, is_verified) VALUES (?, ?, ?, 1)',
                [username, passwordHash, adminRoleId]
            );
            authId = insertAuth.insertId;
        } else {
            console.log('Updating admin password...');
            authId = existingAuth[0].id;
            await db.execute(
                'UPDATE auth_table SET password_hash = ?, role_id = ?, is_verified = 1 WHERE id = ?',
                [passwordHash, adminRoleId, authId]
            );
        }

        // 4. Check if admin exists in users_table
        const [existingUser]: any = await db.execute('SELECT id FROM users_table WHERE auth_id = ?', [authId]);
        
        if (existingUser.length === 0) {
            console.log('Creating admin user record...');
            await db.execute(
                'INSERT INTO users_table (auth_id, first_name, last_name, role) VALUES (?, "AgriLink", "Admin", "admin")',
                [authId]
            );
        } else {
            console.log('Updating admin user record...');
            await db.execute(
                'UPDATE users_table SET first_name = "AgriLink", last_name = "Admin", role = "admin" WHERE auth_id = ?',
                [authId]
            );
        }

        console.log('SUCCESS: Admin user created/updated.');
        console.log('Username:', username);
        console.log('Password:', password);
        
    } catch (err) {
        console.error('ERROR during admin setup:', err);
    } finally {
        process.exit();
    }
}

setupAdmin();
