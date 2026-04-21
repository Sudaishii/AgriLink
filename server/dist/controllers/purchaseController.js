"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEarningSummary = exports.removeCancelledOrder = exports.cancelPurchase = exports.updateOrderStatus = exports.getBuyerOrders = exports.getFarmerOrders = exports.getAllTransactions = exports.createPurchase = void 0;
const purchaseService = __importStar(require("../services/purchaseService"));
const notificationService_1 = require("../services/notificationService");
const systemLogService_1 = require("../services/systemLogService");
const createPurchase = async (req, res) => {
    try {
        const u_id = req.user?.id || req.body?.u_id || req.body?.buyer_id;
        if (!u_id) {
            return res.status(401).json({ message: 'User identification required for purchase.' });
        }
        const purchaseData = {
            buyer_id: parseInt(u_id),
            product_id: parseInt((req.body?.product_id || req.body?.p_id)),
            quantity: parseFloat(req.body?.quantity)
        };
        if (isNaN(purchaseData.product_id) || isNaN(purchaseData.quantity)) {
            return res.status(400).json({ message: 'Invalid product ID or quantity.' });
        }
        const purchaseId = await purchaseService.createPurchaseRequest(purchaseData);
        // Notify farmer (no platform logistics/discounts; just request + confirmation workflow).
        try {
            const ctx = await purchaseService.getProductForOrderNotify(purchaseData.product_id);
            const farmerId = Number(ctx?.farmer_id);
            const productName = String(ctx?.p_name ?? 'a product');
            if (Number.isFinite(farmerId) && farmerId > 0) {
                await notificationService_1.notificationService.createNotification(farmerId, 'New Order Request', `A buyer requested ${purchaseData.quantity} unit(s) of ${productName}.`, 'order', '/farmer/orders');
            }
        }
        catch (e) {
            // Do not fail purchase creation if notification fails.
            console.error('[purchase] notify farmer failed', e);
        }
        res.status(201).json({ message: 'Purchase request created.', purchaseId });
        // System log: Transaction created
        (0, systemLogService_1.writeLog)({
            correlation_id: req.correlationId,
            user_id: u_id,
            user_name: req.user?.firstName ? `${req.user.firstName} ${req.user.lastName}` : 'Buyer',
            user_role: req.user?.role || 'buyer',
            action: 'Purchase Request Created',
            event_type: 'create',
            module: 'Orders',
            detail: `User ${u_id} requested ${purchaseData.quantity} of product ${purchaseData.product_id}`,
            category: 'Order',
            severity: 'info',
            ip_address: req.ip,
            user_agent: req.headers['user-agent'],
            http_status: 201
        }).catch(() => { });
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating purchase.', error: error.message });
    }
};
exports.createPurchase = createPurchase;
const getAllTransactions = async (req, res) => {
    try {
        const transactions = await purchaseService.getAllTransactions();
        res.json({ transactions });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching transactions.', error: error.message });
    }
};
exports.getAllTransactions = getAllTransactions;
const getFarmerOrders = async (req, res) => {
    try {
        const u_id = parseInt(req.params.u_id);
        const orders = await purchaseService.getFarmerOrders(u_id);
        res.json({ orders });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching orders.', error: error.message });
    }
};
exports.getFarmerOrders = getFarmerOrders;
const getBuyerOrders = async (req, res) => {
    try {
        const buyer_id = parseInt(req.params.u_id);
        const orders = await purchaseService.getBuyerOrders(buyer_id);
        res.json({ orders });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching buyer orders.', error: error.message });
    }
};
exports.getBuyerOrders = getBuyerOrders;
const updateOrderStatus = async (req, res) => {
    try {
        const req_id = parseInt(req.params.req_id);
        const status = req.body?.status;
        const u_id = req.user?.id || req.body?.u_id;
        if (!status || !u_id) {
            return res.status(400).json({ message: 'Missing status or user identification.' });
        }
        await purchaseService.updateOrderStatus(req_id, status, parseInt(u_id), notificationService_1.notificationService);
        res.json({ message: 'Order status updated.' });
        // System log: Order status update
        (0, systemLogService_1.writeLog)({
            correlation_id: req.correlationId,
            user_id: u_id,
            user_name: req.user?.firstName ? `${req.user.firstName} ${req.user.lastName}` : 'System',
            user_role: req.user?.role || 'farmer',
            action: 'Order Status Updated',
            event_type: 'status_update',
            module: 'Orders',
            detail: `Order ${req_id} changed to ${status}`,
            category: 'Order',
            severity: status === 'Cancelled' ? 'warning' : 'success',
            ip_address: req.ip,
            user_agent: req.headers['user-agent'],
            http_status: 200
        }).catch(() => { });
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Error updating order status.' });
    }
};
exports.updateOrderStatus = updateOrderStatus;
const cancelPurchase = async (req, res) => {
    try {
        const req_id = parseInt(req.params.req_id);
        const u_id = req.user?.id || req.body?.u_id;
        const role = req.user?.role || req.body?.role;
        if (!u_id)
            return res.status(401).json({ message: 'Authentication required.' });
        await purchaseService.cancelPurchase(req_id, parseInt(u_id), role);
        // System log: cancellation
        (0, systemLogService_1.writeLog)({
            user_id: u_id,
            user_name: req.user?.firstName ? `${req.user.firstName} ${req.user.lastName}` : 'User',
            user_role: role || 'user',
            action: 'Order Cancelled',
            event_type: 'cancel',
            module: 'Orders',
            detail: `Order #${req_id} was cancelled by ${role}`,
            category: 'Order',
            severity: 'warning',
            ip_address: req.ip,
            user_agent: req.headers['user-agent']
        }).catch(() => { });
        res.json({ message: 'Order successfully cancelled.' });
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Error cancelling order.' });
    }
};
exports.cancelPurchase = cancelPurchase;
const removeCancelledOrder = async (req, res) => {
    try {
        const req_id = parseInt(req.params.req_id);
        const u_id = req.user?.id || req.body?.u_id;
        const role = req.user?.role || req.body?.role;
        if (!u_id)
            return res.status(401).json({ message: 'Authentication required.' });
        await purchaseService.removeCancelledOrder(req_id, parseInt(u_id), String(role || ''));
        // System log: removal
        (0, systemLogService_1.writeLog)({
            user_id: u_id,
            user_name: req.user?.firstName ? `${req.user.firstName} ${req.user.lastName}` : 'User',
            user_role: role || 'user',
            action: 'Cancelled Order Record Removed',
            event_type: 'delete',
            module: 'Orders',
            detail: `Cancelled order record #${req_id} was removed from view by ${role}`,
            category: 'System',
            severity: 'info',
            ip_address: req.ip,
            user_agent: req.headers['user-agent']
        }).catch(() => { });
        res.json({ message: 'Cancelled order removed.' });
    }
    catch (error) {
        const message = error.message || 'Error removing cancelled order.';
        if (message === 'Order not found.')
            return res.status(404).json({ message });
        if (message === 'Unauthorized.')
            return res.status(403).json({ message });
        if (message === 'Only cancelled orders can be removed.')
            return res.status(400).json({ message });
        res.status(500).json({ message });
    }
};
exports.removeCancelledOrder = removeCancelledOrder;
const getEarningSummary = async (req, res) => {
    try {
        const u_id = parseInt(req.params.u_id);
        const summary = await purchaseService.getEarningSummary(u_id);
        res.json({ summary });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching earnings.', error: error.message });
    }
};
exports.getEarningSummary = getEarningSummary;
