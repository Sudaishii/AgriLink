"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewService = exports.ensureFarmerServiceReviewTable = void 0;
const database_1 = require("../database/database");
let ensuredFarmerServiceReviewTable = false;
const ensureFarmerServiceReviewTable = async () => {
    if (ensuredFarmerServiceReviewTable)
        return;
    await database_1.db.execute(`
        CREATE TABLE IF NOT EXISTS farmer_service_reviews (
            fsr_id INT AUTO_INCREMENT PRIMARY KEY,
            req_id INT NOT NULL,
            reviewer_id INT NOT NULL,
            farmer_id INT NOT NULL,
            rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
            comment TEXT,
            product_id INT NULL,
            product_name_snapshot VARCHAR(255) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uq_review_per_order (req_id),
            KEY idx_farmer_created (farmer_id, created_at),
            CONSTRAINT fsr_req_fk FOREIGN KEY (req_id) REFERENCES purchase_table(req_id) ON DELETE CASCADE,
            CONSTRAINT fsr_reviewer_fk FOREIGN KEY (reviewer_id) REFERENCES users_table(id) ON DELETE CASCADE,
            CONSTRAINT fsr_farmer_fk FOREIGN KEY (farmer_id) REFERENCES users_table(id) ON DELETE CASCADE,
            CONSTRAINT fsr_product_fk FOREIGN KEY (product_id) REFERENCES product_table(p_id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);
    ensuredFarmerServiceReviewTable = true;
};
exports.ensureFarmerServiceReviewTable = ensureFarmerServiceReviewTable;
exports.reviewService = {
    getReviewsByProductId: async (productId) => {
        const [rows] = await database_1.db.query(`SELECT 
                r.*, 
                u.first_name, 
                u.last_name,
                u.city
             FROM product_reviews r
             JOIN users_table u ON r.user_id = u.id
             WHERE r.product_id = ?
             ORDER BY r.created_at DESC`, [productId]);
        return rows;
    },
    addReview: async (userId, productId, rating, comment) => {
        const [result] = await database_1.db.query('INSERT INTO product_reviews (user_id, product_id, rating, comment) VALUES (?, ?, ?, ?)', [userId, productId, rating, comment]);
        return result;
    },
    getAverageRating: async (productId) => {
        const [rows] = await database_1.db.query('SELECT AVG(rating) as avgRating, COUNT(*) as reviewCount FROM product_reviews WHERE product_id = ?', [productId]);
        return rows[0] || { avgRating: 0, reviewCount: 0 };
    },
    addFarmerServiceReview: async (reviewerId, reqId, rating, comment) => {
        await (0, exports.ensureFarmerServiceReviewTable)();
        const [result] = await database_1.db.query(`INSERT INTO farmer_service_reviews (req_id, reviewer_id, farmer_id, rating, comment, product_id, product_name_snapshot)
             SELECT
                pt.req_id,
                ?,
                p.u_id AS farmer_id,
                ?,
                ?,
                pt.product_id,
                p.p_name
             FROM purchase_table pt
             JOIN product_table p ON p.p_id = pt.product_id
             WHERE pt.req_id = ?
               AND pt.buyer_id = ?
               AND pt.req_status = 'Completed'`, [reviewerId, rating, comment, reqId, reviewerId]);
        if (!result?.affectedRows) {
            throw new Error('Order is not eligible for farmer service review.');
        }
        return result;
    },
    getFarmerServiceReviewsByFarmerId: async (farmerId) => {
        await (0, exports.ensureFarmerServiceReviewTable)();
        const [rows] = await database_1.db.query(`SELECT
                fsr.fsr_id,
                fsr.req_id,
                fsr.rating,
                fsr.comment,
                fsr.created_at,
                fsr.product_name_snapshot,
                u.first_name,
                u.last_name
             FROM farmer_service_reviews fsr
             JOIN users_table u ON fsr.reviewer_id = u.id
             WHERE fsr.farmer_id = ?
             ORDER BY fsr.created_at DESC`, [farmerId]);
        return rows;
    },
    getFarmerServiceRatingStats: async (farmerId) => {
        await (0, exports.ensureFarmerServiceReviewTable)();
        const [rows] = await database_1.db.query(`SELECT
                COALESCE(AVG(rating), 0) AS avgRating,
                COUNT(*) AS reviewCount
             FROM farmer_service_reviews
             WHERE farmer_id = ?`, [farmerId]);
        return rows[0] || { avgRating: 0, reviewCount: 0 };
    }
};
