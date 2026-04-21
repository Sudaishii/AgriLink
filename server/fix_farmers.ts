import { db } from './src/database/database';
async function run() {
    try {
        const [rows]: any = await db.execute("UPDATE users_table SET onboarding_completed = 1 WHERE role = 'farmer'");
        console.log('Fixed farmers onboarding status');
        process.exit(0);
    } catch(e) {
        process.exit(1);
    }
}
run();
