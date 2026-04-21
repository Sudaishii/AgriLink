"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("./database/database");
async function checkUsers() {
    try {
        console.log('--- Checking users_table data ---');
        const [users] = await database_1.db.execute('SELECT * FROM users_table');
        console.log('Users found:', users.length);
        console.log(JSON.stringify(users, null, 2));
        const [auth] = await database_1.db.execute('SELECT id, email, role_id, status FROM auth_table');
        console.log('\n--- Checking auth_table data ---');
        console.log(JSON.stringify(auth, null, 2));
        process.exit(0);
    }
    catch (error) {
        console.error('Check failed:', error);
        process.exit(1);
    }
}
checkUsers();
