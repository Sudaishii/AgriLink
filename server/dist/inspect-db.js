"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("./database/database");
async function inspectSchema() {
    try {
        console.log('--- Database Schema Inspection ---');
        const [tables] = await database_1.db.execute('SHOW TABLES');
        console.log('Tables:', tables);
        for (const tableRow of tables) {
            const tableName = Object.values(tableRow)[0];
            console.log(`\nColumns for ${tableName}:`);
            const [columns] = await database_1.db.execute(`DESCRIBE ${tableName}`);
            console.log(columns);
        }
        process.exit(0);
    }
    catch (error) {
        console.error('Inspection failed:', error);
        process.exit(1);
    }
}
inspectSchema();
