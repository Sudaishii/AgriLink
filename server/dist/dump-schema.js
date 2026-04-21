"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("./database/database");
const fs_1 = __importDefault(require("fs"));
async function scan() {
    try {
        const [tables] = await database_1.db.execute('SHOW TABLES');
        const schema = {};
        for (const tableRow of tables) {
            const tableName = Object.values(tableRow)[0];
            const [columns] = await database_1.db.execute(`DESCRIBE ${tableName}`);
            schema[tableName] = columns;
        }
        fs_1.default.writeFileSync('schema_dump.json', JSON.stringify(schema, null, 2));
        console.log('Schema dumped to schema_dump.json');
        process.exit(0);
    }
    catch (error) {
        console.error('Scan failed:', error);
        process.exit(1);
    }
}
scan();
