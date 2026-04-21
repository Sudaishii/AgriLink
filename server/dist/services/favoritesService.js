"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.favoritesService = void 0;
const database_1 = require("../database/database");
exports.favoritesService = {
    addFavorite: async (userId, productId) => {
        await database_1.db.query('INSERT INTO user_favorites (user_id, product_id) VALUES (?, ?)', [userId, productId]);
    },
    removeFavorite: async (userId, productId) => {
        await database_1.db.query('DELETE FROM user_favorites WHERE user_id = ? AND product_id = ?', [userId, productId]);
    },
    getFavoritesByUserId: async (userId) => {
        const [rows] = await database_1.db.query(`SELECT 
         pt.p_id,
         uf.product_id,
         pt.p_name,
         pt.p_price,
         pt.p_unit,
         pt.p_image,
         pc.cat_name,
         pt.p_status,
         pt.p_quantity,
         pt.u_id AS sellerUserId,
         u.first_name AS seller_first_name,
         u.last_name AS seller_last_name,
         u.city AS seller_city
       FROM user_favorites uf
       JOIN product_table pt ON uf.product_id = pt.p_id
       LEFT JOIN product_category pc ON pt.p_category = pc.cat_id
       LEFT JOIN users_table u ON pt.u_id = u.id
       WHERE uf.user_id = ?`, [userId]);
        return rows;
    },
    isFavorite: async (userId, productId) => {
        const [rows] = await database_1.db.query('SELECT 1 FROM user_favorites WHERE user_id = ? AND product_id = ?', [userId, productId]);
        return rows.length > 0;
    }
};
