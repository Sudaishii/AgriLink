import { db } from './database/database';
import fs from 'fs';

async function scan() {
    try {
        const [tables]: any = await db.execute('SHOW TABLES');
        const schema: any = {};

        for (const tableRow of tables) {
            const tableName = Object.values(tableRow)[0] as string;
            const [columns]: any = await db.execute(`DESCRIBE ${tableName}`);
            schema[tableName] = columns;
        }

        fs.writeFileSync('schema_dump.json', JSON.stringify(schema, null, 2));
        console.log('Schema dumped to schema_dump.json');
        process.exit(0);
    } catch (error) {
        console.error('Scan failed:', error);
        process.exit(1);
    }
}

scan();
