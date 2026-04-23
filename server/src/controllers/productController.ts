import { Request, Response } from 'express';
import * as productService from '../services/productService';
import { indexProductImage } from './searchController';
import fs from 'fs';

export const getAllProducts = async (req: Request, res: Response) => {
    try {
        const brgy = req.query.brgy as string;
        const products = await productService.getAllProducts(brgy);
        res.json({ products });
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching products.', error: error.message });
    }
};

export const getLandingSnapshot = async (_req: Request, res: Response) => {
    try {
        const snapshot = await productService.getLandingSnapshot();
        res.json(snapshot);
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching landing snapshot.', error: error.message });
    }
};

export const getFarmerProducts = async (req: Request, res: Response) => {
    try {
        console.log('--- getFarmerProducts start ---');
        const u_id = parseInt(req.params.u_id as string);
        console.log('fetching products for u_id:', u_id);

        const products = await productService.getFarmerProducts(u_id);
        res.json({ products });
    } catch (error: any) {
        console.error('CRITICAL: getFarmerProducts error:', error);
        res.status(500).json({ message: 'Error fetching farmer products.', error: error.message });
    }
};

export const createProduct = async (req: any, res: Response) => {
    try {
        // Strictly identify user via JWT (middleware-populated)
        const u_id = req.user?.id;

        if (!u_id) {
            return res.status(401).json({ message: 'Merchant identification failed. Please re-login.' });
        }

        const productData = {
            u_id: u_id,
            p_name: req.body?.p_name,
            p_description: req.body?.p_description || null,
            p_category: req.body?.p_category || req.body?.cat_id,
            p_price: req.body?.p_price,
            p_unit: req.body?.p_unit,
            p_quantity: req.body?.p_quantity,
            p_image: req.file ? `/uploads/${req.file.filename}` : (req.body?.p_image || null),
            harvest_date: req.body?.harvest_date || null
        };

        const productId = await productService.createProduct(productData);

        // Auto-index the image with CLIP embedding for vector image search
        if (req.file) {
            const imageBuffer = fs.readFileSync(req.file.path);
            indexProductImage(productId, imageBuffer, req.file.mimetype).catch((e) => console.error('Index Image Error:', e));
        }

        // System log: new listing
        const { writeLog } = require('../services/systemLogService');
        writeLog({
            user_id: u_id,
            user_name: req.user?.firstName ? `${req.user.firstName} ${req.user.lastName}` : 'Farmer',
            user_role: req.user?.role || 'farmer',
            action: 'Harvest Listing Created',
            event_type: 'create',
            module: 'Marketplace',
            detail: `Posted "${productData.p_name}" at PHP ${productData.p_price}/${productData.p_unit}`,
            category: 'System',
            severity: 'success',
            ip_address: req.ip,
            user_agent: req.headers['user-agent'],
            http_status: 201
        }).catch(() => {});

        res.status(201).json({
            message: 'Harvest listing posted successfully!',
            productId
        });
    } catch (error: any) {
        console.error('SERVER_ERROR in createProduct:', error);
        res.status(500).json({
            message: error.message || 'An internal error occurred while posting your listing.',
            stack: error.stack
        });
    }
};

export const updateProduct = async (req: any, res: Response) => {
    try {
        console.log('--- updateProduct start ---');
        console.log('Raw req.body:', req.body);
        const p_id = parseInt(req.params?.id as string);
        console.log('updating product ID:', p_id);

        if (isNaN(p_id)) {
            return res.status(400).json({ message: 'Invalid product ID.' });
        }

        const productData = {
            ...req.body,
            p_category: parseInt((req.body?.p_category || req.body?.cat_id) as string) || 0,
            p_price: parseFloat(req.body?.p_price as string) || 0,
            p_quantity: parseFloat(req.body?.p_quantity as string) || 0,
            p_status: req.body?.p_status || 'active'
        };
        console.log('Cleaned Product Data:', productData);

        if (req.file) {
            productData.p_image = `/uploads/${req.file.filename}`;
        }

        console.log('Finalized Product Data:', productData);

        await productService.updateProduct(p_id, productData);

        // Re-index the image if a new one was uploaded
        if (req.file) {
            const imageBuffer = fs.readFileSync(req.file.path);
            indexProductImage(p_id, imageBuffer, req.file.mimetype).catch((e) => console.error('Index Image Error:', e));
        }

        // System log: update listing
        const { writeLog } = require('../services/systemLogService');
        writeLog({
            user_id: req.user?.id || req.body?.u_id,
            user_name: req.user?.firstName ? `${req.user.firstName} ${req.user.lastName}` : 'Farmer',
            user_role: req.user?.role || 'farmer',
            action: 'Harvest Listing Updated',
            event_type: 'update',
            module: 'Marketplace',
            detail: `Updated listing ID #${p_id} (${productData.p_name || 'modified details'})`,
            category: 'System',
            severity: 'info',
            ip_address: req.ip,
            user_agent: req.headers['user-agent']
        }).catch(() => {});

        res.json({ message: 'Product updated successfully.' });
    } catch (error: any) {
        console.error('CRITICAL: updateProduct error:', error);
        res.status(500).json({ message: 'Error updating product.', error: error.message });
    }
};

export const getProductById = async (req: Request, res: Response) => {
    try {
        const p_id = parseInt(req.params.id as string);
        const product = await productService.getProductById(p_id);
        if (!product) return res.status(404).json({ message: 'Product not found.' });
        res.json({ product });
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching product.', error: error.message });
    }
};

export const archiveProduct = async (req: any, res: Response) => {
    try {
        console.log('--- archiveProduct start ---');
        const p_id = parseInt(req.params.id as string);
        const u_id = req.user?.id || req.body?.u_id;
        console.log('archiving p_id:', p_id, 'for u_id:', u_id);

        if (!u_id) {
            return res.status(401).json({ message: 'User verification required for archival.' });
        }

        await productService.archiveProduct(p_id, parseInt(u_id as string));

        // System log: archival
        const { writeLog } = require('../services/systemLogService');
        writeLog({
            user_id: u_id,
            user_name: req.user?.firstName ? `${req.user.firstName} ${req.user.lastName}` : 'Farmer',
            user_role: req.user?.role || 'farmer',
            action: 'Harvest Listing Archived',
            event_type: 'archive',
            module: 'Marketplace',
            detail: `Product ID #${p_id} hidden from marketplace`,
            category: 'System',
            severity: 'warning',
            ip_address: req.ip,
            user_agent: req.headers['user-agent']
        }).catch(() => {});

        res.json({ message: 'Product archived successfully.' });
    } catch (error: any) {
        console.error('CRITICAL: archiveProduct error:', error);
        const message = String(error?.message || '');
        if (message.toLowerCase().includes('active or reserved orders')) {
            return res.status(400).json({ message });
        }
        res.status(500).json({ message: error.message || 'Error archiving product.' });
    }
};

export const unarchiveProduct = async (req: any, res: Response) => {
    try {
        const p_id = parseInt(req.params.id as string);
        const u_id = req.user?.id || req.body?.u_id;

        // Debug logging to a file since terminal is obscured
        const fs = require('fs');
        const logMsg = `[DEBUG] ${new Date().toISOString()} - Unarchive attempt: p_id=${p_id}, u_id=${u_id}\n`;
        fs.appendFileSync('debug_restoration.log', logMsg);

        if (!u_id) {
            return res.status(401).json({ message: 'User verification required for restoration.' });
        }

        await productService.unarchiveProduct(p_id, parseInt(u_id as string));

        // System log: restoration
        const { writeLog } = require('../services/systemLogService');
        writeLog({
            user_id: u_id,
            user_name: req.user?.firstName ? `${req.user.firstName} ${req.user.lastName}` : 'Farmer',
            user_role: req.user?.role || 'farmer',
            action: 'Harvest Listing Restored',
            event_type: 'restore',
            module: 'Marketplace',
            detail: `Product ID #${p_id} made visible on marketplace again`,
            category: 'System',
            severity: 'success',
            ip_address: req.ip,
            user_agent: req.headers['user-agent']
        }).catch(() => {});

        res.json({ message: 'Product restored successfully.' });
    } catch (error: any) {
        const fs = require('fs');
        fs.appendFileSync('debug_restoration.log', `[ERROR] ${error.message}\n`);
        console.error('CRITICAL: unarchiveProduct error:', error);
        res.status(500).json({ message: error.message || 'Error restoring product.' });
    }
};

export const deleteProduct = async (req: any, res: Response) => {
    try {
        console.log('--- deleteProduct start ---');
        const p_id = parseInt(req.params.id as string);
        const u_id = req.user?.id || req.body?.u_id;
        console.log('deleting p_id:', p_id, 'for u_id:', u_id);

        if (!u_id) {
            return res.status(401).json({ message: 'User verification required for deletion.' });
        }

        await productService.deleteProduct(p_id, parseInt(u_id as string));

        // System log: deletion
        const { writeLog } = require('../services/systemLogService');
        writeLog({
            user_id: u_id,
            user_name: req.user?.firstName ? `${req.user.firstName} ${req.user.lastName}` : 'Farmer',
            user_role: req.user?.role || 'farmer',
            action: 'Harvest Listing Deleted',
            event_type: 'delete',
            module: 'Marketplace',
            detail: `Product ID #${p_id} permanently removed from database`,
            category: 'Security',
            severity: 'warning',
            ip_address: req.ip,
            user_agent: req.headers['user-agent']
        }).catch(() => {});

        res.json({ message: 'Product deleted successfully.' });
    } catch (error: any) {
        console.error('CRITICAL: deleteProduct error:', error);
        const message = String(error?.message || '');
        if (message.toLowerCase().includes('active or reserved orders')) {
            return res.status(400).json({ message });
        }
        res.status(500).json({ message: error.message || 'Error deleting product.' });
    }
};

