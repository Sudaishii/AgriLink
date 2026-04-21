import { db } from './database/database';

async function inspectSchema() {
    try {
        console.log('--- Database Schema Inspection ---');
        const [tables]: any = await db.execute('SHOW TABLES');
        console.log('Tables:', tables);

        for (const tableRow of tables) {
            const tableName = Object.values(tableRow)[0] as string;
            console.log(`\nColumns for ${tableName}:`);
            const [columns]: any = await db.execute(`DESCRIBE ${tableName}`);
            console.log(columns);
        }

        process.exit(0);
    } catch (error) {
        console.error('Inspection failed:', error);
        process.exit(1);
    }
}

inspectSchema();
