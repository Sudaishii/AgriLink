import { db } from '../database/database';

export const getPhenotypingResultsByFarmer = async (uId: number) => {
    const [rows]: any = await db.execute(
        `SELECT pr.*, p.p_name, p.p_image 
     FROM phenotyping_results pr
     JOIN product_table p ON pr.product_id = p.p_id
     WHERE p.u_id = ?
     ORDER BY pr.result_date DESC`,
        [uId]
    );
    return rows;
};

export const getPhenotypingResultByProduct = async (pId: number) => {
    const [rows]: any = await db.execute(
        `SELECT * FROM phenotyping_results WHERE product_id = ? ORDER BY result_date DESC LIMIT 1`,
        [pId]
    );
    return rows[0];
};
