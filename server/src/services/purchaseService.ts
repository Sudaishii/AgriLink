import { db } from '../database/database';
import { ensureFarmerServiceReviewTable } from './reviewService';

let ensuredPurchaseColumns = false;

const ensurePurchaseColumns = async () => {
    if (ensuredPurchaseColumns) return;

    await db.execute('ALTER TABLE purchase_table ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50) DEFAULT NULL');
    await db.execute('ALTER TABLE purchase_table ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP NULL DEFAULT NULL');
    await db.execute('ALTER TABLE purchase_table ADD COLUMN IF NOT EXISTS decline_reason TEXT NULL');
    await db.execute(
        `UPDATE purchase_table
         SET invoice_number = CONCAT(
           'ORD-',
           DATE_FORMAT(COALESCE(completed_at, req_date), '%Y%m%d'),
           '-',
           LPAD(req_id, 6, '0')
         )
         WHERE req_status = 'Completed'
           AND (invoice_number IS NULL OR invoice_number = '' OR invoice_number LIKE 'INV-%')`
    );

    ensuredPurchaseColumns = true;
};

const buildInvoiceNumber = (reqId: number, when: Date = new Date()) => {
    const yyyy = when.getFullYear();
    const mm = String(when.getMonth() + 1).padStart(2, '0');
    const dd = String(when.getDate()).padStart(2, '0');
    return `ORD-${yyyy}${mm}${dd}-${String(reqId).padStart(6, '0')}`;
};

export const createPurchaseRequest = async (purchaseData: any) => {
    await ensurePurchaseColumns();
    const { buyer_id, product_id, quantity } = purchaseData;
    const [result]: any = await db.execute(
        'INSERT INTO purchase_table (buyer_id, product_id, quantity, req_status) VALUES (?, ?, ?, "Pending")',
        [buyer_id, product_id, quantity]
    );
    return result.insertId;
};

export const getFarmerOrders = async (uId: number) => {
    await ensurePurchaseColumns();
    await ensureFarmerServiceReviewTable();
    const [rows] = await db.execute(
        `SELECT pt.*, p.p_name, p.p_price, p.p_unit, p.p_image, p.harvest_date, u.first_name as buyer_first, u.last_name as buyer_last,
                CASE WHEN fsr.fsr_id IS NULL THEN 0 ELSE 1 END AS has_farmer_review
     FROM purchase_table pt
     JOIN product_table p ON pt.product_id = p.p_id
     JOIN users_table u ON pt.buyer_id = u.id
     LEFT JOIN farmer_service_reviews fsr ON fsr.req_id = pt.req_id
     WHERE p.u_id = ?
     ORDER BY pt.req_date DESC`,
        [uId]
    );
    return rows;
};

export const getAllTransactions = async () => {
    await ensurePurchaseColumns();
    const [rows] = await db.execute(
        `SELECT pt.req_id, pt.req_status, pt.req_date, pt.invoice_number, pt.quantity,
                p.p_name, p.p_price,
                buyer.first_name as buyer_first, buyer.last_name as buyer_last, buyer.role as buyer_role,
                farmer.first_name as farmer_first, farmer.last_name as farmer_last, farmer.role as farmer_role
         FROM purchase_table pt
         JOIN product_table p ON pt.product_id = p.p_id
         JOIN users_table buyer ON pt.buyer_id = buyer.id
         JOIN users_table farmer ON p.u_id = farmer.id
         ORDER BY pt.req_date DESC`
    );
    return rows;
};

export const getBuyerOrders = async (buyerId: number) => {
    await ensurePurchaseColumns();
    await ensureFarmerServiceReviewTable();
    const [rows] = await db.execute(
        `SELECT pt.*, p.p_name, p.p_price, u.id AS farmer_id, u.first_name as farmer_first, u.last_name as farmer_last, p.p_image,
                CASE WHEN fsr.fsr_id IS NULL THEN 0 ELSE 1 END AS has_farmer_review
     FROM purchase_table pt
     JOIN product_table p ON pt.product_id = p.p_id
     JOIN users_table u ON p.u_id = u.id
     LEFT JOIN farmer_service_reviews fsr
        ON fsr.req_id = pt.req_id
       AND fsr.reviewer_id = pt.buyer_id
     WHERE pt.buyer_id = ?
     ORDER BY pt.req_date DESC`,
        [buyerId]
    );
    return rows;
};

export const updateOrderStatus = async (
    reqId: number,
    status: string,
    uId: number,
    notificationService: any,
    declineReason?: string
) => {
    await ensurePurchaseColumns();
    // Ensure the product belongs to the farmer and get current context
    const [rows]: any = await db.execute(
        `SELECT pt.req_status, pt.quantity, pt.product_id, pt.buyer_id, pt.invoice_number, p.p_name, p.harvest_date, p.u_id as farmer_id,
                fu.first_name AS farmer_first_name, fu.last_name AS farmer_last_name
         FROM purchase_table pt 
         JOIN product_table p ON pt.product_id = p.p_id 
         JOIN users_table fu ON p.u_id = fu.id
         WHERE pt.req_id = ?`,
        [reqId]
    );

    const order = rows[0];
    if (!order || order.farmer_id !== uId) {
        throw new Error('Unauthorized or order not found.');
    }

    const previousStatus = order.req_status;
    const normalizedStatus = String(status || '').trim();
    const statusLower = normalizedStatus.toLowerCase();
    const normalizedDeclineReason = String(declineReason || '').trim();
    const transitionMap: Record<string, string[]> = {
        Pending: ['Confirmed', 'Cancelled'],
        Confirmed: ['Pending', 'Completed', 'Cancelled'],
        Completed: [],
        Cancelled: []
    };

    if (statusLower === 'cancelled' && !normalizedDeclineReason) {
        throw new Error('Decline reason is required.');
    }
    if (normalizedStatus === previousStatus) {
        return;
    }
    if (!transitionMap[previousStatus]?.includes(normalizedStatus)) {
        throw new Error(`Invalid order status transition: ${previousStatus} -> ${normalizedStatus}.`);
    }

    // 1. If moving to "Confirmed" and was "Pending", deduct quantity
    if (normalizedStatus === 'Confirmed' && previousStatus === 'Pending') {
        const [updateRes]: any = await db.execute(
            'UPDATE product_table SET p_quantity = p_quantity - ? WHERE p_id = ? AND p_quantity >= ?',
            [order.quantity, order.product_id, order.quantity]
        );
        if (updateRes.affectedRows === 0) {
            throw new Error('Insufficient stock to confirm this order.');
        }
    }
    // Restore reserved stock if farmer reverts/declines from Confirmed.
    if (previousStatus === 'Confirmed' && (normalizedStatus === 'Pending' || statusLower === 'cancelled')) {
        await db.execute(
            'UPDATE product_table SET p_quantity = p_quantity + ? WHERE p_id = ?',
            [order.quantity, order.product_id]
        );
    }
    if (normalizedStatus === 'Completed') {
        const harvestDate = order.harvest_date ? new Date(order.harvest_date) : null;
        if (harvestDate && !Number.isNaN(harvestDate.getTime()) && Date.now() < harvestDate.getTime()) {
            throw new Error(`Cannot complete order before harvest time (${harvestDate.toLocaleString()}).`);
        }
    }

    // 2. Update the order status (+ invoice metadata when completed)
    let invoiceNumber: string | null = order.invoice_number || null;
    if (normalizedStatus === 'Completed') {
        invoiceNumber = invoiceNumber || buildInvoiceNumber(reqId);
        await db.execute(
            'UPDATE purchase_table SET req_status = ?, invoice_number = ?, completed_at = CURRENT_TIMESTAMP, decline_reason = NULL WHERE req_id = ?',
            [normalizedStatus, invoiceNumber, reqId]
        );
    } else if (statusLower === 'cancelled') {
        await db.execute(
            'UPDATE purchase_table SET req_status = ?, completed_at = NULL, decline_reason = ? WHERE req_id = ?',
            [normalizedStatus, normalizedDeclineReason, reqId]
        );
    } else {
        await db.execute(
            'UPDATE purchase_table SET req_status = ?, completed_at = NULL, decline_reason = NULL WHERE req_id = ?',
            [normalizedStatus, reqId]
        );
    }

    // 3. Notify the buyer
    try {
        const farmerName = `${String(order.farmer_first_name || '').trim()} ${String(order.farmer_last_name || '').trim()}`.trim() || 'Unknown Farmer';
        const statusMessage =
            statusLower === 'confirmed'
                ? `Farmer ${farmerName} approved your order for ${order.p_name}.`
                : statusLower === 'completed' && invoiceNumber
                    ? `Farmer ${farmerName} completed your order for ${order.p_name}. Order ID: ${invoiceNumber}.`
                    : statusLower === 'cancelled'
                        ? `Farmer ${farmerName} declined your order for ${order.p_name}.${normalizedDeclineReason ? ` Reason: ${normalizedDeclineReason}` : ''}`
                        : `Farmer ${farmerName} updated your order for ${order.p_name} to "${normalizedStatus}".`;
        const statusLink =
            normalizedStatus === 'Completed' && invoiceNumber
                ? `/profile?tab=history&invoice=${encodeURIComponent(invoiceNumber)}`
                : '/profile?tab=history';

        const statusTitle =
            statusLower === 'confirmed'
                ? `Farmer ${farmerName} Approved Your Order`
                : statusLower === 'completed'
                    ? `Farmer ${farmerName} Completed Your Order`
                    : statusLower === 'cancelled'
                        ? `Farmer ${farmerName} Declined Your Order`
                        : `Order ${normalizedStatus}`;

        await notificationService.createNotification(order.buyer_id, statusTitle, statusMessage, 'order', statusLink);
    } catch (e) {
        console.error('[purchase] notify buyer failed', e);
    }
};

export const cancelPurchase = async (reqId: number, uId: number, role: string) => {
    await ensurePurchaseColumns();
    // Check if the order exists and if the user is authorized
    const [rows]: any = await db.execute(
        `SELECT pt.*, p.u_id as farmer_id 
         FROM purchase_table pt 
         JOIN product_table p ON pt.product_id = p.p_id 
         WHERE pt.req_id = ?`,
        [reqId]
    );

    const order = rows[0];
    if (!order) throw new Error('Order not found.');

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
        await db.execute(
            'UPDATE product_table SET p_quantity = p_quantity + ? WHERE p_id = ?',
            [order.quantity, order.product_id]
        );
    }

    // Delete or Update to "Cancelled"
    // The user said "remove this one", but "CANCEL functionality" implies status change or delete.
    // Usually P2P apps just delete or mark Cancelled. I'll mark as Cancelled.
    await db.execute('UPDATE purchase_table SET req_status = "Cancelled", decline_reason = NULL WHERE req_id = ?', [reqId]);
    return true;
};

export const deletePurchase = async (reqId: number) => {
    await ensurePurchaseColumns();
    await db.execute('DELETE FROM purchase_table WHERE req_id = ?', [reqId]);
};

export const removeCancelledOrder = async (reqId: number, uId: number, role: string) => {
    await ensurePurchaseColumns();
    const [rows]: any = await db.execute(
        `SELECT pt.req_id, pt.req_status, pt.buyer_id, p.u_id as farmer_id
         FROM purchase_table pt
         JOIN product_table p ON pt.product_id = p.p_id
         WHERE pt.req_id = ?`,
        [reqId]
    );

    const order = rows[0];
    if (!order) throw new Error('Order not found.');

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

    await db.execute('DELETE FROM purchase_table WHERE req_id = ?', [reqId]);
    return true;
};

export const getEarningSummary = async (uId: number) => {
    await ensurePurchaseColumns();
    const [rows]: any = await db.execute(
        `SELECT SUM(pt.quantity * p.p_price) as total_earnings
     FROM purchase_table pt
     JOIN product_table p ON pt.product_id = p.p_id
     WHERE p.u_id = ? AND pt.req_status = "Completed"`,
        [uId]
    );
    return rows[0] || { total_earnings: 0 };
};

/** Product + farmer for notifying on new purchase request */
export const getProductForOrderNotify = async (productId: number) => {
    await ensurePurchaseColumns();
    const [rows]: any = await db.execute(
        'SELECT p_name, u_id AS farmer_id FROM product_table WHERE p_id = ?',
        [productId]
    );
    return rows[0] || null;
};

/** Buyer + product name for notifying buyer on status change */
export const getOrderNotifyContext = async (reqId: number) => {
    await ensurePurchaseColumns();
    const [rows]: any = await db.execute(
        `SELECT pt.buyer_id, p.p_name
         FROM purchase_table pt
         JOIN product_table p ON pt.product_id = p.p_id
         WHERE pt.req_id = ?`,
        [reqId]
    );
    return rows[0] || null;
};
