import { Request, Response } from 'express';
import * as purchaseService from '../services/purchaseService';
import { notificationService } from '../services/notificationService';
import { writeLog } from '../services/systemLogService';

export const createPurchase = async (req: any, res: Response) => {
    try {
        const u_id = req.user?.id || req.body?.u_id || req.body?.buyer_id;

        if (!u_id) {
            return res.status(401).json({ message: 'User identification required for purchase.' });
        }

        const purchaseData = {
            buyer_id: parseInt(u_id as string),
            product_id: parseInt((req.body?.product_id || req.body?.p_id) as string),
            quantity: parseFloat(req.body?.quantity as string)
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
                await notificationService.createNotification(
                    farmerId,
                    'New Order Request',
                    `A buyer requested ${purchaseData.quantity} unit(s) of ${productName}.`,
                    'order',
                    '/farmer/orders'
                );
            }
        } catch (e) {
            // Do not fail purchase creation if notification fails.
            console.error('[purchase] notify farmer failed', e);
        }

        res.status(201).json({ message: 'Purchase request created.', purchaseId });

        // System log: Transaction created
        writeLog({
            correlation_id: req.correlationId,
            user_id:        u_id,
            user_name:      req.user?.firstName ? `${req.user.firstName} ${req.user.lastName}` : 'Buyer',
            user_role:      req.user?.role || 'buyer',
            action:         'Purchase Request Created',
            event_type:     'create',
            module:         'Orders',
            detail:         `User ${u_id} requested ${purchaseData.quantity} of product ${purchaseData.product_id}`,
            category:       'Order',
            severity:       'info',
            ip_address:     req.ip,
            user_agent:     req.headers['user-agent'],
            http_status:    201
        }).catch(() => {});
    } catch (error: any) {
        res.status(500).json({ message: 'Error creating purchase.', error: error.message });
    }
};

export const getAllTransactions = async (req: Request, res: Response) => {
    try {
        const transactions = await purchaseService.getAllTransactions();
        res.json({ transactions });
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching transactions.', error: error.message });
    }
};

export const getFarmerOrders = async (req: Request, res: Response) => {
    try {
        const u_id = parseInt(req.params.u_id as string);
        const orders = await purchaseService.getFarmerOrders(u_id);
        res.json({ orders });
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching orders.', error: error.message });
    }
};

export const getBuyerOrders = async (req: Request, res: Response) => {
    try {
        const buyer_id = parseInt(req.params.u_id as string);
        const orders = await purchaseService.getBuyerOrders(buyer_id);
        res.json({ orders });
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching buyer orders.', error: error.message });
    }
};

export const updateOrderStatus = async (req: any, res: Response) => {
    try {
        const req_id = parseInt(req.params.req_id as string);
        const status = req.body?.status;
        const declineReason = req.body?.declineReason;
        const u_id = req.user?.id || req.body?.u_id;

        if (!status || !u_id) {
            return res.status(400).json({ message: 'Missing status or user identification.' });
        }

        await purchaseService.updateOrderStatus(
            req_id,
            status,
            parseInt(u_id as string),
            notificationService,
            declineReason
        );
        res.json({ message: 'Order status updated.' });

        // System log: Order status update
        writeLog({
            correlation_id: req.correlationId,
            user_id:        u_id,
            user_name:      req.user?.firstName ? `${req.user.firstName} ${req.user.lastName}` : 'System',
            user_role:      req.user?.role || 'farmer',
            action:         'Order Status Updated',
            event_type:     'status_update',
            module:         'Orders',
            detail:         `Order ${req_id} changed to ${status}`,
            category:       'Order',
            severity:       status === 'Cancelled' ? 'warning' : 'success',
            ip_address:     req.ip,
            user_agent:     req.headers['user-agent'],
            http_status:    200
        }).catch(() => {});
    } catch (error: any) {
        const message = error.message || 'Error updating order status.';
        if (message === 'Decline reason is required.') {
            return res.status(400).json({ message });
        }
        if (message === 'Insufficient stock to confirm this order.') {
            return res.status(400).json({ message });
        }
        if (message.startsWith('Cannot complete order before harvest time')) {
            return res.status(400).json({ message });
        }
        if (message.startsWith('Invalid order status transition')) {
            return res.status(400).json({ message });
        }
        if (message === 'Unauthorized or order not found.') {
            return res.status(403).json({ message });
        }
        res.status(500).json({ message });
    }
};

export const cancelPurchase = async (req: any, res: Response) => {
    try {
        const req_id = parseInt(req.params.req_id as string);
        const u_id = req.user?.id || req.body?.u_id;
        const role = req.user?.role || req.body?.role;

        if (!u_id) return res.status(401).json({ message: 'Authentication required.' });

        await purchaseService.cancelPurchase(req_id, parseInt(u_id as string), role);

        // System log: cancellation
        writeLog({
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
        }).catch(() => {});

        res.json({ message: 'Order successfully cancelled.' });
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Error cancelling order.' });
    }
};

export const removeCancelledOrder = async (req: any, res: Response) => {
    try {
        const req_id = parseInt(req.params.req_id as string);
        const u_id = req.user?.id || req.body?.u_id;
        const role = req.user?.role || req.body?.role;

        if (!u_id) return res.status(401).json({ message: 'Authentication required.' });
        await purchaseService.removeCancelledOrder(req_id, parseInt(u_id as string), String(role || ''));

        // System log: removal
        writeLog({
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
        }).catch(() => {});

        res.json({ message: 'Cancelled order removed.' });
    } catch (error: any) {
        const message = error.message || 'Error removing cancelled order.';
        if (message === 'Order not found.') return res.status(404).json({ message });
        if (message === 'Unauthorized.') return res.status(403).json({ message });
        if (message === 'Only cancelled orders can be removed.') return res.status(400).json({ message });
        res.status(500).json({ message });
    }
};

export const getEarningSummary = async (req: Request, res: Response) => {
    try {
        const u_id = parseInt(req.params.u_id as string);
        const summary = await purchaseService.getEarningSummary(u_id);
        res.json({ summary });
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching earnings.', error: error.message });
    }
};
