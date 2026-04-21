"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../database/database");
async function testConnection() {
    try {
        const [rows] = await database_1.db.execute("SELECT 1 + 1 AS result;");
        console.log("Database connection successful. Result:", rows[0].result);
        const [tables] = await database_1.db.execute("SHOW TABLES;");
        console.log("Tables in database:", tables);
    }
    catch (error) {
        console.error("Database connection failed:", error);
    }
    finally {
        process.exit(0);
    }
}
testConnection();
