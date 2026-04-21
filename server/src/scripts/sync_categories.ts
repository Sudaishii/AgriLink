import { db } from '../database/database';

async function syncCategories() {
    try {
        console.log('--- Synchronizing Product Categories ---');
        
        // Disable checks to allow truncation
        await db.execute('SET FOREIGN_KEY_CHECKS = 0');
        await db.execute('TRUNCATE TABLE product_category');
        
        // Insert officially aligned categories in the requested order
        const categories = [
            [1, 'Rice & Corn'],
            [2, 'Vegetables'],
            [3, 'Leafy Greens'],
            [4, 'Root Crops'],
            [5, 'Fruits'],
            [6, 'Herbs & Spices'],
            [7, 'Beans & Nuts'],
            [8, 'Others (Default)']
        ];

        for (const [id, name] of categories) {
            await db.execute('INSERT INTO product_category (cat_id, cat_name) VALUES (?, ?)', [id, name]);
        }

        await db.execute('SET FOREIGN_KEY_CHECKS = 1');
        
        console.log('Successfully aligned categories with IDs 1-8.');
        process.exit(0);
    } catch (err) {
        console.error('Categorization sync failed:', err);
        process.exit(1);
    }
}

syncCategories();
