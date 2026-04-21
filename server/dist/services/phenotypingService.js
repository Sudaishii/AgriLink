"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPhenotypingResultByProduct = exports.getPhenotypingResultsByFarmer = void 0;
const database_1 = require("../database/database");
const getPhenotypingResultsByFarmer = async (uId) => {
    const [rows] = await database_1.db.execute(`SELECT pr.*, p.p_name, p.p_image 
     FROM phenotyping_results pr
     JOIN product_table p ON pr.product_id = p.p_id
     WHERE p.u_id = ?
     ORDER BY pr.result_date DESC`, [uId]);
    return rows;
};
exports.getPhenotypingResultsByFarmer = getPhenotypingResultsByFarmer;
const getPhenotypingResultByProduct = async (pId) => {
    const [rows] = await database_1.db.execute(`SELECT * FROM phenotyping_results WHERE product_id = ? ORDER BY result_date DESC LIMIT 1`, [pId]);
    return rows[0];
};
exports.getPhenotypingResultByProduct = getPhenotypingResultByProduct;
