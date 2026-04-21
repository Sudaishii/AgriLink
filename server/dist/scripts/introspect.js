"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../database/database");
async function introspect() {
    try {
        console.log("--- Tables ---");
        const [tables] = await database_1.db.execute("SHOW TABLES");
        const tableNames = tables.map((t) => Object.values(t)[0]);
        console.log(tableNames.join(", "));
        for (const tableName of tableNames) {
            console.log(`\n--- Structure: ${tableName} ---`);
            const [columns] = await database_1.db.execute(`DESCRIBE ${tableName}`);
            console.table(columns);
            console.log(`--- Foreign Keys: ${tableName} ---`);
            const [fks] = await database_1.db.execute(`
        SELECT 
          COLUMN_NAME, 
          REFERENCED_TABLE_NAME, 
          REFERENCED_COLUMN_NAME 
        FROM 
          INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE 
          TABLE_NAME = ? AND 
          REFERENCED_TABLE_NAME IS NOT NULL
      `, [tableName]);
            console.table(fks);
        }
    }
    catch (error) {
        console.error("Introspection failed:", error);
    }
    finally {
        process.exit(0);
    }
}
introspect();
