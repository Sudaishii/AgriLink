import { db } from '../database/database';

async function testConnection() {
    try {
        const [rows]: any = await db.execute("SELECT 1 + 1 AS result;");
        console.log("Database connection successful. Result:", rows[0].result);

        const [tables]: any = await db.execute("SHOW TABLES;");
        console.log("Tables in database:", tables);
    } catch (error) {
        console.error("Database connection failed:", error);
    } finally {
        process.exit(0);
    }
}

testConnection();
