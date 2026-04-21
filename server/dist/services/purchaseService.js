"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrderNotifyContext = exports.getProductForOrderNotify = exports.getEarningSummary = exports.removeCancelledOrder = exports.deletePurchase = exports.cancelPurchase = exports.updateOrderStatus = exports.getBuyerOrders = exports.getAllTransactions = exports.getFarmerOrders = exports.createPurchaseRequest = void 0;
const database_1 = require("../database/database");
const reviewService_1 = require("./reviewService");
let ensuredPurchaseColumns = false;
const ensurePurchaseColumns = async () => {
    if (ensuredPurchaseColumns)
        return;
    await database_1.db.execute('ALTER TABLE purchase_table ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50) DEFAULT NULL');
    await database_1.db.execute('ALTER TABLE purchase_table ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP NULL DEFAULT NULL');
    await database_1.db.execute(`UPDATE purchase_table
         SET invoice_number = CONCAT(
           'ORD-',
           DATE_FORMAT(COALESCE(completed_at, req_date), '%Y%m%d'),
           '-',
           LPAD(req_id, 6, '0')
         )
         WHERE req_status = 'Completed'
           AND (invoice_number IS NULL OR invoice_number = '' OR invoice_number LIKE 'INV-%')`);
    ensuredPurchaseColumns = true;
};
const buildInvoiceNumber = (reqId, when = new Date()) => {
    const yyyy = when.getFullYear();
    const mm = String(when.getMonth() + 1).padStart(2, '0');
    const dd = String(when.getDate()).padStart(2, '0');
    return `ORD-${yyyy}${mm}${dd}-${String(reqId).padStart(6, '0')}`;
};
const createPurchaseRequest = async (purchaseData) => {
    await ensurePurchaseColumns();
    const { buyer_id, product_id, quantity } = purchaseData;
    const [result] = await database_1.db.execute('INSERT INTO purchase_table (buyer_id, product_id, quantity, req_status) VALUES (?, ?, ?, "Pending")', [buyer_id, product_id, quantity]);
    return result.insertId;
};
exports.createPurchaseRequest = createPurchaseRequest;
const getFarmerOrders = async (uId) => {
    await ensurePurchaseColumns();
    await (0, reviewService_1.ensureFarmerServiceReviewTable)();
    const [rows] = await database_1.db.execute(`SELECT pt.*, p.p_name, p.p_price, p.p_image, u.first_name as buyer_first, u.last_name as buyer_last,
                CASE WHEN fsr.fsr_id IS NULL THEN 0 ELSE 1 END AS has_farmer_review
     FROM purchase_table pt
     JOIN product_table p ON pt.product_id = p.p_id
     JOIN users_table u ON pt.buyer_id = u.id
     LEFT JOIN farmer_service_reviews fsr ON fsr.req_id = pt.req_id
     WHERE p.u_id = ?
     ORDER BY pt.req_date DESC`, [uId]);
    return rows;
};
exports.getFarmerOrders = getFarmerOrders;
const getAllTransactions = async () => {
    await ensurePurchaseColumns();
    const [rows] = await database_1.db.execute(`SELECT pt.req_id, pt.req_status, pt.req_date, pt.invoice_number, pt.quantity,
                p.p_name, p.p_price,
                buyer.first_name as buyer_first, buyer.last_name as buyer_last, buyer.role as buyer_role,
                farmer.first_name as farmer_first, farmer.last_name as farmer_last, farmer.role as farmer_role
         FROM purchase_table pt
         JOIN product_table p ON pt.product_id = p.p_id
         JOIN users_table buyer ON pt.buyer_id = buyer.id
         JOIN users_table farmer ON p.u_id = farmer.id
         ORDER BY pt.req_date DESC`);
    return rows;
};
exports.getAllTransactions = getAllTransactions;
const getBuyerOrders = async (buyerId) => {
    await ensurePurchaseColumns();
    await (0, reviewService_1.ensureFarmerServiceReviewTable)();
    const [rows] = await database_1.db.execute(`SELECT pt.*, p.p_name, p.p_price, u.id AS farmer_id, u.first_name as farmer_first, u.last_name as farmer_last, p.p_image,
                CASE WHEN fsr.fsr_id IS NULL THEN 0 ELSE 1 END AS has_farmer_review
     FROM purchase_table pt
     JOIN product_table p ON pt.product_id = p.p_id
     JOIN users_table u ON p.u_id = u.id
     LEFT JOIN farmer_service_reviews fsr
        ON fsr.req_id = pt.req_id
       AND fsr.reviewer_id = pt.buyer_id
     WHERE pt.buyer_id = ?
     ORDER BY pt.req_date DESC`, [buyerId]);
    return rows;
};
exports.getBuyerOrders = getBuyerOrders;
const updateOrderStatus = async (reqId, status, uId, notificationService) => {
    await ensurePurchaseColumns();
    // Ensure the product belongs to the farmer and get current context
    const [rows] = await database_1.db.execute(`SELECT pt.req_status, pt.quantity, pt.product_id, pt.buyer_id, pt.invoice_number, p.p_name, p.u_id as farmer_id,
                fu.first_name AS farmer_first_name, fu.last_name AS farmer_last_name
         FROM purchase_table pt 
         JOIN product_table p ON pt.product_id = p.p_id 
         JOIN users_table fu ON p.u_id = fu.id
         WHERE pt.req_id = ?`, [reqId]);
    const order = rows[0];
    if (!order || order.farmer_id !== uId) {
        throw new Error('Unauthorized or order not found.');
    }
    const previousStatus = order.req_status;
    // 1. If moving to "Confirmed" and was "Pending", deduct quantity
    if (status === 'Confirmed' && previousStatus === 'Pending') {
        const [updateRes] = await database_1.db.execute('UPDATE product_table SET p_quantity = p_quantity - ? WHERE p_id = ? AND p_quantity >= ?', [order.quantity, order.product_id, order.quantity]);
        if (updateRes.affectedRows === 0) {
            throw new Error('Insufficient stock to confirm this order.');
        }
    }
    // 2. Update the order status (+ invoice metadata when completed)
    let invoiceNumber = order.invoice_number || null;
    if (status === 'Completed') {
        invoiceNumber = invoiceNumber || buildInvoiceNumber(reqId);
        await database_1.db.execute('UPDATE purchase_table SET req_status = ?, invoice_number = ?, completed_at = CURRENT_TIMESTAMP WHERE req_id = ?', [status, invoiceNumber, reqId]);
    }
    else {
        await database_1.db.execute('UPDATE purchase_table SET req_status = ?, completed_at = NULL WHERE req_id = ?', [status, reqId]);
    }
    // 3. Notify the buyer
    try {
        const farmerName = `${String(order.farmer_first_name || '').trim()} ${String(order.farmer_last_name || '').trim()}`.trim() || 'Unknown Farmer';
        const normalizedStatus = String(status || '').trim();
        const statusLower = normalizedStatus.toLowerCase();
        const statusMessage = statusLower === 'confirmed'
            ? `Farmer ${farmerName} approved your order for ${order.p_name}.`
            : statusLower === 'completed' && invoiceNumber
                ? `Farmer ${farmerName} completed your order for ${order.p_name}. Order ID: ${invoiceNumber}.`
                : statusLower === 'cancelled'
                    ? `Farmer ${farmerName} cancelled your order for ${order.p_name}.`
                    : `Farmer ${farmerName} updated your order for ${order.p_name} to "${normalizedStatus}".`;
        const statusLink = status === 'Completed' && invoiceNumber
            ? `/profile?tab=history&invoice=${encodeURIComponent(invoiceNumber)}`
            : '/profile?tab=history';
        const statusTitle = statusLower === 'confirmed'
            ? `Farmer ${farmerName} Approved Your Order`
            : statusLower === 'completed'
                ? `Farmer ${farmerName} Completed Your Order`
                : statusLower === 'cancelled'
                    ? `Farmer ${farmerName} Cancelled Your Order`
                    : `Order ${normalizedStatus}`;
        await notificationService.createNotification(order.buyer_id, statusTitle, statusMessage, 'order', statusLink);
    }
    catch (e) {
        console.error('[purchase] notify buyer failed', e);
    }
};
exports.updateOrderStatus = updateOrderStatus;
const cancelPurchase = async (reqId, uId, role) => {
    await ensurePurchaseColumns();
    // Check if the order exists and if the user is authorized
    const [rows] = await database_1.db.execute(`SELECT pt.*, p.u_id as farmer_id 
         FROM purchase_table pt 
         JOIN product_table p ON pt.product_id = p.p_id 
         WHERE pt.req_id = ?`, [reqId]);
    const order = rows[0];
    if (!order)
        throw new Error('Order not found.');
    const normalizedRole = String(role || '').toLowerCase();
    const isFarmer = normalizedRole === 'farmer' && Number(order.farmer_id) === Number(uId);
    const isBuyer = (normalizedRole === 'buyer' || normalizedRole === 'farmer') && Number(order.buyer_id) === Number(uId);
    if (!isFarmer && !isBuyer && normalizedRole !== 'admin') {
        throw new Error('Unauthorized.');
    }
    // If order was confirmed/completed, we might need to restore stock? 
    // For now, only allow cancellation of 'Pending' or 'Confirmed' if not yet 'Delivered'
    if (order.req_status === 'Delivered' || order.req_status === 'Completed') {
        throw new Error('Cannot cancel a completed transaction.');
    }
    // Restore stock if it was confirmed
    if (order.req_status === 'Confirmed' || order.req_status === 'Processing') {
        await database_1.db.execute('UPDATE product_table SET p_quantity = p_quantity + ? WHERE p_id = ?', [order.quantity, order.product_id]);
    }
    // Delete or Update to "Cancelled"
    // The user said "remove this one", but "CANCEL functionality" implies status change or delete.
    // Usually P2P apps just delete or mark Cancelled. I'll mark as Cancelled.
    await database_1.db.execute('UPDATE purchase_table SET req_status = "Cancelled" WHERE req_id = ?', [reqId]);
    return true;
};
exports.cancelPurchase = cancelPurchase;
const deletePurchase = async (reqId) => {
    await ensurePurchaseColumns();
    await database_1.db.execute('DELETE FROM purchase_table WHERE req_id = ?', [reqId]);
};
exports.deletePurchase = deletePurchase;
const removeCancelledOrder = async (reqId, uId, role) => {
    await ensurePurchaseColumns();
    const [rows] = await database_1.db.execute(`SELECT pt.req_id, pt.req_status, pt.buyer_id, p.u_id as farmer_id
         FROM purchase_table pt
         JOIN product_table p ON pt.product_id = p.p_id
         WHERE pt.req_id = ?`, [reqId]);
    const order = rows[0];
    if (!order)
        throw new Error('Order not found.');
    const normalizedRole = String(role || '').toLowerCase();
    const isFarmerOwner = normalizedRole === 'farmer' && Number(order.farmer_id) === Number(uId);
    const isBuyerOwner = (normalizedRole === 'buyer' || normalizedRole === 'farmer') && Number(order.buyer_id) === Number(uId);
    const isAdmin = normalizedRole === 'admin';
    if (!isFarmerOwner && !isBuyerOwner && !isAdmin) {
        throw new Error('Unauthorized.');
    }
    const normalizedStatus = String(order.req_status || '').trim().toLowerCase();
    if (!normalizedStatus.includes('cancel')) {
        throw new Error('Only cancelled orders can be removed.');
    }
    await database_1.db.execute('DELETE FROM purchase_table WHERE req_id = ?', [reqId]);
    return true;
};
exports.removeCancelledOrder = removeCancelledOrder;
const getEarningSummary = async (uId) => {
    await ensurePurchaseColumns();
    const [rows] = await database_1.db.execute(`SELECT SUM(pt.quantity * p.p_price) as total_earnings
     FROM purchase_table pt
     JOIN product_table p ON pt.product_id = p.p_id
     WHERE p.u_id = ? AND pt.req_status = "Completed"`, [uId]);
    return rows[0] || { total_earnings: 0 };
};
exports.getEarningSummary = getEarningSummary;
/** Product + farmer for notifying on new purchase request */
const getProductForOrderNotify = async (productId) => {
    await ensurePurchaseColumns();
    const [rows] = await database_1.db.execute('SELECT p_name, u_id AS farmer_id FROM product_table WHERE p_id = ?', [productId]);
    return rows[0] || null;
};
exports.getProductForOrderNotify = getProductForOrderNotify;
/** Buyer + product name for notifying buyer on status change */
const getOrderNotifyContext = async (reqId) => {
    await ensurePurchaseColumns();
    const [rows] = await database_1.db.execute(`SELECT pt.buyer_id, p.p_name
         FROM purchase_table pt
         JOIN product_table p ON pt.product_id = p.p_id
         WHERE pt.req_id = ?`, [reqId]);
    return rows[0] || null;
};
exports.getOrderNotifyContext = getOrderNotifyContext;
