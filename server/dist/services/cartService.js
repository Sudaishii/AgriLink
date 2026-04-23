"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearCartByUser = exports.removeCartItem = exports.setCartItemQuantity = exports.upsertCartItem = exports.getCartByUser = void 0;
const database_1 = require("../database/database");
let ensuredCartTable = false;
const ensureCartTable = async () => {
    if (ensuredCartTable)
        return;
    await database_1.db.execute(`
    CREATE TABLE IF NOT EXISTS cart_table (
      cart_id INT(11) NOT NULL AUTO_INCREMENT,
      user_id INT(11) NOT NULL,
      product_id INT(11) NOT NULL,
      quantity DECIMAL(10,2) NOT NULL DEFAULT 1.00,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (cart_id),
      UNIQUE KEY uq_cart_user_product (user_id, product_id),
      KEY idx_cart_product (product_id),
      CONSTRAINT cart_table_ibfk_1 FOREIGN KEY (user_id) REFERENCES users_table (id) ON DELETE CASCADE,
      CONSTRAINT cart_table_ibfk_2 FOREIGN KEY (product_id) REFERENCES product_table (p_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);
    ensuredCartTable = true;
};
const mapCartRow = (row) => ({
    id: Number(row.id),
    name: String(row.name || ''),
    price: Number(row.price || 0),
    unit: String(row.unit || 'kg'),
    seller: String(row.seller || 'Farmer'),
    sellerUserId: Number(row.sellerUserId || 0),
    location: String(row.location || 'Local Farm'),
    stock: Number(row.stock || 0),
    image: String(row.image || ''),
    category: String(row.category || 'Uncategorized'),
    isVerified: Number(row.isVerified || 0) === 1,
    quantity: Number(row.quantity || 0),
});
const getCartByUser = async (userId) => {
    await ensureCartTable();
    const [rows] = await database_1.db.execute(`SELECT
        p.p_id AS id,
        p.p_name AS name,
        p.p_price AS price,
        p.p_unit AS unit,
        CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) AS seller,
        u.id AS sellerUserId,
        COALESCE(NULLIF(TRIM(u.farm_city), ''), NULLIF(TRIM(u.city), ''), 'Local Farm') AS location,
        p.p_quantity AS stock,
        p.p_image AS image,
        COALESCE(c.cat_name, 'Uncategorized') AS category,
        EXISTS(
          SELECT 1
          FROM farmer_badges fb
          WHERE fb.farmer_id = p.u_id
            AND fb.revoked_at IS NULL
            AND fb.badge_type = 'verified_farmer'
        ) AS isVerified,
        ct.quantity AS quantity
      FROM cart_table ct
      JOIN product_table p ON p.p_id = ct.product_id
      JOIN users_table u ON u.id = p.u_id
      LEFT JOIN product_category c ON c.cat_id = p.p_category
      WHERE ct.user_id = ?
      ORDER BY ct.updated_at DESC`, [userId]);
    return (rows || []).map(mapCartRow);
};
exports.getCartByUser = getCartByUser;
const upsertCartItem = async (userId, productId, quantityDelta) => {
    await ensureCartTable();
    const [rows] = await database_1.db.execute(`SELECT
        p.p_id AS id,
        p.p_name AS name,
        p.p_price AS price,
        p.p_unit AS unit,
        p.p_quantity AS stock,
        p.p_image AS image,
        p.u_id AS sellerUserId,
        COALESCE(c.cat_name, 'Uncategorized') AS category,
        CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) AS seller,
        COALESCE(NULLIF(TRIM(u.farm_city), ''), NULLIF(TRIM(u.city), ''), 'Local Farm') AS location,
        EXISTS(
          SELECT 1
          FROM farmer_badges fb
          WHERE fb.farmer_id = p.u_id
            AND fb.revoked_at IS NULL
            AND fb.badge_type = 'verified_farmer'
        ) AS isVerified
      FROM product_table p
      JOIN users_table u ON u.id = p.u_id
      LEFT JOIN product_category c ON c.cat_id = p.p_category
      WHERE p.p_id = ? AND p.p_status = 'active'
      LIMIT 1`, [productId]);
    const product = rows?.[0];
    if (!product) {
        throw new Error('Product not found or unavailable.');
    }
    if (Number(product.sellerUserId) === Number(userId)) {
        throw new Error('You cannot add your own listing to cart.');
    }
    const [existing] = await database_1.db.execute('SELECT quantity FROM cart_table WHERE user_id = ? AND product_id = ? LIMIT 1', [userId, productId]);
    const currentQty = Number(existing?.[0]?.quantity || 0);
    const stock = Number(product.stock || 0);
    const requested = currentQty + Number(quantityDelta || 0);
    const nextQty = Math.max(0, Math.min(stock, requested));
    const capped = nextQty !== requested;
    if (nextQty <= 0) {
        await database_1.db.execute('DELETE FROM cart_table WHERE user_id = ? AND product_id = ?', [userId, productId]);
        return { item: mapCartRow({ ...product, quantity: 0 }), capped };
    }
    await database_1.db.execute(`INSERT INTO cart_table (user_id, product_id, quantity)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), updated_at = CURRENT_TIMESTAMP`, [userId, productId, nextQty]);
    return { item: mapCartRow({ ...product, quantity: nextQty }), capped };
};
exports.upsertCartItem = upsertCartItem;
const setCartItemQuantity = async (userId, productId, quantity) => {
    await ensureCartTable();
    const [rows] = await database_1.db.execute(`SELECT
        p.p_id AS id,
        p.p_name AS name,
        p.p_price AS price,
        p.p_unit AS unit,
        p.p_quantity AS stock,
        p.p_image AS image,
        p.u_id AS sellerUserId,
        COALESCE(c.cat_name, 'Uncategorized') AS category,
        CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) AS seller,
        COALESCE(NULLIF(TRIM(u.farm_city), ''), NULLIF(TRIM(u.city), ''), 'Local Farm') AS location,
        EXISTS(
          SELECT 1
          FROM farmer_badges fb
          WHERE fb.farmer_id = p.u_id
            AND fb.revoked_at IS NULL
            AND fb.badge_type = 'verified_farmer'
        ) AS isVerified
      FROM product_table p
      JOIN users_table u ON u.id = p.u_id
      LEFT JOIN product_category c ON c.cat_id = p.p_category
      WHERE p.p_id = ? AND p.p_status = 'active'
      LIMIT 1`, [productId]);
    const product = rows?.[0];
    if (!product) {
        throw new Error('Product not found or unavailable.');
    }
    if (Number(product.sellerUserId) === Number(userId)) {
        throw new Error('You cannot add your own listing to cart.');
    }
    const stock = Number(product.stock || 0);
    const requested = Number(quantity || 0);
    const nextQty = Math.max(0, Math.min(stock, requested));
    const capped = nextQty !== requested;
    if (nextQty <= 0) {
        await database_1.db.execute('DELETE FROM cart_table WHERE user_id = ? AND product_id = ?', [userId, productId]);
        return { item: mapCartRow({ ...product, quantity: 0 }), capped };
    }
    await database_1.db.execute(`INSERT INTO cart_table (user_id, product_id, quantity)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), updated_at = CURRENT_TIMESTAMP`, [userId, productId, nextQty]);
    return { item: mapCartRow({ ...product, quantity: nextQty }), capped };
};
exports.setCartItemQuantity = setCartItemQuantity;
const removeCartItem = async (userId, productId) => {
    await ensureCartTable();
    await database_1.db.execute('DELETE FROM cart_table WHERE user_id = ? AND product_id = ?', [userId, productId]);
};
exports.removeCartItem = removeCartItem;
const clearCartByUser = async (userId) => {
    await ensureCartTable();
    await database_1.db.execute('DELETE FROM cart_table WHERE user_id = ?', [userId]);
};
exports.clearCartByUser = clearCartByUser;
