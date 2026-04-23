"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProduct = exports.archiveProduct = exports.unarchiveProduct = exports.updateProduct = exports.createProduct = exports.getProductById = exports.getFarmerProducts = exports.getLandingSnapshot = exports.getAllProducts = void 0;
const database_1 = require("../database/database");
const reviewService_1 = require("./reviewService");
const DEFAULT_LOW_STOCK_PERCENTAGE_THRESHOLD = 0.2;
const DEFAULT_LOW_STOCK_MINIMUM_THRESHOLD = 5;
let ensuredStockThresholdColumns = false;
const ensureStockThresholdColumns = async () => {
    if (ensuredStockThresholdColumns)
        return;
    await database_1.db.execute('ALTER TABLE product_table ADD COLUMN IF NOT EXISTS p_original_quantity DECIMAL(10, 2) DEFAULT NULL');
    await database_1.db.execute('ALTER TABLE product_table ADD COLUMN IF NOT EXISTS low_stock_percentage_threshold DECIMAL(5, 4) NOT NULL DEFAULT 0.2000');
    await database_1.db.execute('ALTER TABLE product_table ADD COLUMN IF NOT EXISTS low_stock_minimum_threshold DECIMAL(10, 2) NOT NULL DEFAULT 5.00');
    await database_1.db.execute('UPDATE product_table SET p_original_quantity = p_quantity WHERE p_original_quantity IS NULL');
    ensuredStockThresholdColumns = true;
};
const getAllProducts = async (brgy) => {
    await ensureStockThresholdColumns();
    await (0, reviewService_1.ensureFarmerServiceReviewTable)();
    let query = `
        SELECT p.*, c.cat_name, u.first_name, u.last_name, u.city, u.address, u.farm_address, u.farm_city,
               (SELECT AVG(rating) FROM farmer_service_reviews fsr WHERE fsr.farmer_id = p.u_id) as sellerAvgRating,
               (SELECT COUNT(*) FROM farmer_service_reviews fsr WHERE fsr.farmer_id = p.u_id) as sellerReviewCount,
               EXISTS(SELECT 1 FROM farmer_badges fb WHERE fb.farmer_id = p.u_id AND fb.revoked_at IS NULL AND fb.badge_type = 'verified_farmer') as isVerified
        FROM product_table p
        LEFT JOIN product_category c ON p.p_category = c.cat_id
        LEFT JOIN users_table u ON p.u_id = u.id
        WHERE p.p_status = 'active'
    `;
    const params = [];
    if (brgy) {
        query += ` AND (u.city LIKE ? OR u.address LIKE ? OR u.farm_address LIKE ? OR u.farm_city LIKE ?)`;
        const wrappedBrgy = `%${brgy}%`;
        params.push(wrappedBrgy, wrappedBrgy, wrappedBrgy, wrappedBrgy);
    }
    const [rows] = await database_1.db.execute(query, params);
    return rows;
};
exports.getAllProducts = getAllProducts;
const getLandingSnapshot = async () => {
    await ensureStockThresholdColumns();
    await (0, reviewService_1.ensureFarmerServiceReviewTable)();
    const [statsRows] = await database_1.db.execute(`
        SELECT
            (
                SELECT COUNT(*)
                FROM users_table u
                LEFT JOIN auth_table a ON a.id = u.auth_id
                LEFT JOIN role_table r ON r.id = a.role_id
                WHERE LOWER(COALESCE(u.role, r.role_name, '')) = 'farmer'
            ) AS farmersCount,
            (
                SELECT COUNT(*)
                FROM product_table p
                WHERE p.p_status = 'active'
            ) AS productsCount,
            (
                SELECT COUNT(*)
                FROM users_table u
                LEFT JOIN auth_table a ON a.id = u.auth_id
                LEFT JOIN role_table r ON r.id = a.role_id
                WHERE LOWER(COALESCE(u.role, r.role_name, '')) = 'buyer'
            ) AS buyersCount
    `);
    const [featuredRows] = await database_1.db.execute(`
        SELECT p.*, c.cat_name, u.first_name, u.last_name, u.city, u.address, u.farm_address, u.farm_city,
               (SELECT AVG(rating) FROM farmer_service_reviews fsr WHERE fsr.farmer_id = p.u_id) as sellerAvgRating,
               (SELECT COUNT(*) FROM farmer_service_reviews fsr WHERE fsr.farmer_id = p.u_id) as sellerReviewCount,
               EXISTS(SELECT 1 FROM farmer_badges fb WHERE fb.farmer_id = p.u_id AND fb.revoked_at IS NULL AND fb.badge_type = 'verified_farmer') as isVerified
        FROM product_table p
        LEFT JOIN product_category c ON p.p_category = c.cat_id
        LEFT JOIN users_table u ON p.u_id = u.id
        WHERE p.p_status = 'active' AND COALESCE(p.p_quantity, 0) > 0
        ORDER BY p.p_id DESC
        LIMIT 3
    `);
    const stats = statsRows?.[0] || {};
    return {
        stats: {
            farmersCount: Number(stats.farmersCount || 0),
            productsCount: Number(stats.productsCount || 0),
            buyersCount: Number(stats.buyersCount || 0)
        },
        featuredProducts: featuredRows || []
    };
};
exports.getLandingSnapshot = getLandingSnapshot;
const getFarmerProducts = async (uId) => {
    await ensureStockThresholdColumns();
    const [rows] = await database_1.db.execute(`SELECT p.*, c.cat_name, u.first_name, u.last_name, u.city,
                EXISTS(SELECT 1 FROM farmer_badges fb WHERE fb.farmer_id = p.u_id AND fb.revoked_at IS NULL AND fb.badge_type = 'verified_farmer') as isVerified
     FROM product_table p
     LEFT JOIN product_category c ON p.p_category = c.cat_id
     LEFT JOIN users_table u ON p.u_id = u.id
     WHERE p.u_id = ?`, [uId]);
    return rows;
};
exports.getFarmerProducts = getFarmerProducts;
const getProductById = async (pId) => {
    await ensureStockThresholdColumns();
    await (0, reviewService_1.ensureFarmerServiceReviewTable)();
    const [rows] = await database_1.db.execute(`
        SELECT p.*, c.cat_name, u.first_name, u.last_name, u.city,
               (SELECT AVG(rating) FROM farmer_service_reviews fsr WHERE fsr.farmer_id = p.u_id) as sellerAvgRating,
               (SELECT COUNT(*) FROM farmer_service_reviews fsr WHERE fsr.farmer_id = p.u_id) as sellerReviewCount,
               EXISTS(SELECT 1 FROM farmer_badges fb WHERE fb.farmer_id = p.u_id AND fb.revoked_at IS NULL AND fb.badge_type = 'verified_farmer') as isVerified,
               (SELECT COALESCE(SUM(pt.quantity), 0) FROM purchase_table pt WHERE pt.product_id = p.p_id AND pt.req_status = 'Completed' AND COALESCE(pt.completed_at, pt.req_date) >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as sold7d,
               (SELECT COALESCE(SUM(pt.quantity), 0) FROM purchase_table pt WHERE pt.product_id = p.p_id AND pt.req_status = 'Completed' AND COALESCE(pt.completed_at, pt.req_date) >= DATE_SUB(NOW(), INTERVAL 14 DAY)) as sold14d,
               (SELECT COALESCE(SUM(pt.quantity), 0) FROM purchase_table pt WHERE pt.product_id = p.p_id AND pt.req_status = 'Completed' AND COALESCE(pt.completed_at, pt.req_date) >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as sold30d,
               (SELECT COUNT(*) FROM purchase_table pt WHERE pt.product_id = p.p_id AND pt.req_status = 'Completed' AND COALESCE(pt.completed_at, pt.req_date) >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as completedOrders30d
        FROM product_table p
        LEFT JOIN product_category c ON p.p_category = c.cat_id
        LEFT JOIN users_table u ON p.u_id = u.id
        WHERE p.p_id = ?
    `, [pId]);
    return rows[0];
};
exports.getProductById = getProductById;
const createProduct = async (productData) => {
    const { u_id, p_name, p_description, p_price, p_unit, p_quantity, p_category, p_image, harvest_date } = productData;
    await ensureStockThresholdColumns();
    if (!u_id)
        throw new Error('User identification is missing.');
    if (!p_name || p_name.trim() === '')
        throw new Error('Product name is required.');
    if (!p_category || isNaN(parseInt(p_category)))
        throw new Error('A valid product category is required.');
    if (!p_price || isNaN(parseFloat(p_price)) || parseFloat(p_price) <= 0)
        throw new Error('A valid positive price is required.');
    if (!p_quantity || isNaN(parseFloat(p_quantity)) || parseFloat(p_quantity) < 0)
        throw new Error('A valid quantity is required.');
    if (!p_unit || p_unit.trim() === '')
        throw new Error('Unit valuation (e.g., kg, kg, pc) is required.');
    if (!harvest_date)
        throw new Error('Harvest date is required.');
    if (!p_image)
        throw new Error('A product image is required. Please upload an image for your listing.');
    // Verify if farmer has set their farm address
    const [farmCheck] = await database_1.db.execute(`SELECT u.farm_address, f.farm_address as formal_farm_address, u.address as home_address
         FROM users_table u
         LEFT JOIN farms_table f ON u.id = f.user_id
         WHERE u.id = ?`, [u_id]);
    if (farmCheck.length === 0) {
        throw new Error('Seller profile not found. Please complete your registration.');
    }
    const { farm_address, formal_farm_address, home_address } = farmCheck[0];
    const hasAddress = (formal_farm_address && formal_farm_address.trim() !== '') ||
        (farm_address && farm_address.trim() !== '') ||
        (home_address && home_address.trim() !== '');
    if (!hasAddress) {
        throw new Error('Your farm address is not set. Please update your profile with a farm or home address before posting a listing.');
    }
    const [existing] = await database_1.db.execute('SELECT p_id FROM product_table WHERE u_id = ? AND p_name = ? AND p_status = "active"', [u_id, p_name]);
    if (existing.length > 0) {
        throw new Error(`You already have an active listing for "${p_name}". Archive it first to create a new one.`);
    }
    const parsedQuantity = parseFloat(p_quantity);
    const [result] = await database_1.db.execute(`INSERT INTO product_table
            (u_id, p_name, p_description, p_price, p_unit, p_quantity, p_original_quantity, p_category, p_image, p_status, harvest_date, low_stock_percentage_threshold, low_stock_minimum_threshold)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, "active", ?, ?, ?)`, [
        u_id,
        p_name,
        p_description,
        p_price,
        p_unit,
        parsedQuantity,
        parsedQuantity,
        p_category,
        p_image,
        harvest_date,
        DEFAULT_LOW_STOCK_PERCENTAGE_THRESHOLD,
        DEFAULT_LOW_STOCK_MINIMUM_THRESHOLD
    ]);
    return result.insertId;
};
exports.createProduct = createProduct;
const updateProduct = async (pId, productData) => {
    const { p_name, p_description, p_price, p_unit, p_quantity, p_category, p_image, p_status, harvest_date } = productData;
    await ensureStockThresholdColumns();
    await database_1.db.execute(`UPDATE product_table
         SET p_name = ?,
             p_description = ?,
             p_price = ?,
             p_unit = ?,
             p_quantity = ?,
             p_original_quantity = ?,
             p_category = ?,
             p_image = ?,
             p_status = ?,
             harvest_date = ?
         WHERE p_id = ?`, [p_name, p_description, p_price, p_unit, p_quantity, p_quantity, p_category, p_image, p_status, harvest_date, pId]);
};
exports.updateProduct = updateProduct;
const unarchiveProduct = async (pId, uId) => {
    await ensureStockThresholdColumns();
    await database_1.db.execute('UPDATE product_table SET p_status = "active" WHERE p_id = ? AND u_id = ?', [pId, uId]);
};
exports.unarchiveProduct = unarchiveProduct;
const archiveProduct = async (pId, uId) => {
    await ensureStockThresholdColumns();
    const [orders] = await database_1.db.execute('SELECT req_id FROM purchase_table WHERE product_id = ? AND req_status IN ("Pending", "Confirmed", "Processing")', [pId]);
    if (orders.length > 0) {
        throw new Error('Cannot archive product with active or reserved orders. Please fulfill or cancel orders first.');
    }
    await database_1.db.execute('UPDATE product_table SET p_status = "archived" WHERE p_id = ? AND u_id = ?', [pId, uId]);
};
exports.archiveProduct = archiveProduct;
const deleteProduct = async (pId, uId) => {
    await ensureStockThresholdColumns();
    const [orders] = await database_1.db.execute('SELECT req_id FROM purchase_table WHERE product_id = ? AND req_status IN ("Pending", "Confirmed", "Processing")', [pId]);
    if (orders.length > 0) {
        throw new Error('Cannot delete product with active or reserved orders. Please fulfill or cancel orders first.');
    }
    await database_1.db.execute('DELETE FROM product_table WHERE p_id = ? AND u_id = ?', [pId, uId]);
};
exports.deleteProduct = deleteProduct;
