import { db } from '../database/database';

export const favoritesService = {
  addFavorite: async (userId: number, productId: number) => {
    await db.query(
      'INSERT INTO user_favorites (user_id, product_id) VALUES (?, ?)',
      [userId, productId]
    );
  },

  removeFavorite: async (userId: number, productId: number) => {
    await db.query(
      'DELETE FROM user_favorites WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );
  },

  getFavoritesByUserId: async (userId: number) => {
    const [rows]: any = await db.query(
      `SELECT 
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
       WHERE uf.user_id = ?`,
      [userId]
    );
    return rows;
  },

  isFavorite: async (userId: number, productId: number) => {
    const [rows]: any = await db.query(
      'SELECT 1 FROM user_favorites WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );
    return rows.length > 0;
  }
};
