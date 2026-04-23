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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProduct = exports.unarchiveProduct = exports.archiveProduct = exports.getProductById = exports.updateProduct = exports.createProduct = exports.getFarmerProducts = exports.getLandingSnapshot = exports.getAllProducts = void 0;
const productService = __importStar(require("../services/productService"));
const searchController_1 = require("./searchController");
const fs_1 = __importDefault(require("fs"));
const getAllProducts = async (req, res) => {
    try {
        const brgy = req.query.brgy;
        const products = await productService.getAllProducts(brgy);
        res.json({ products });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching products.', error: error.message });
    }
};
exports.getAllProducts = getAllProducts;
const getLandingSnapshot = async (_req, res) => {
    try {
        const snapshot = await productService.getLandingSnapshot();
        res.json(snapshot);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching landing snapshot.', error: error.message });
    }
};
exports.getLandingSnapshot = getLandingSnapshot;
const getFarmerProducts = async (req, res) => {
    try {
        console.log('--- getFarmerProducts start ---');
        const u_id = parseInt(req.params.u_id);
        console.log('fetching products for u_id:', u_id);
        const products = await productService.getFarmerProducts(u_id);
        res.json({ products });
    }
    catch (error) {
        console.error('CRITICAL: getFarmerProducts error:', error);
        res.status(500).json({ message: 'Error fetching farmer products.', error: error.message });
    }
};
exports.getFarmerProducts = getFarmerProducts;
const createProduct = async (req, res) => {
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
            const imageBuffer = fs_1.default.readFileSync(req.file.path);
            (0, searchController_1.indexProductImage)(productId, imageBuffer, req.file.mimetype).catch((e) => console.error('Index Image Error:', e));
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
        }).catch(() => { });
        res.status(201).json({
            message: 'Harvest listing posted successfully!',
            productId
        });
    }
    catch (error) {
        console.error('SERVER_ERROR in createProduct:', error);
        res.status(500).json({
            message: error.message || 'An internal error occurred while posting your listing.',
            stack: error.stack
        });
    }
};
exports.createProduct = createProduct;
const updateProduct = async (req, res) => {
    try {
        console.log('--- updateProduct start ---');
        console.log('Raw req.body:', req.body);
        const p_id = parseInt(req.params?.id);
        console.log('updating product ID:', p_id);
        if (isNaN(p_id)) {
            return res.status(400).json({ message: 'Invalid product ID.' });
        }
        const productData = {
            ...req.body,
            p_category: parseInt((req.body?.p_category || req.body?.cat_id)) || 0,
            p_price: parseFloat(req.body?.p_price) || 0,
            p_quantity: parseFloat(req.body?.p_quantity) || 0,
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
            const imageBuffer = fs_1.default.readFileSync(req.file.path);
            (0, searchController_1.indexProductImage)(p_id, imageBuffer, req.file.mimetype).catch((e) => console.error('Index Image Error:', e));
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
        }).catch(() => { });
        res.json({ message: 'Product updated successfully.' });
    }
    catch (error) {
        console.error('CRITICAL: updateProduct error:', error);
        res.status(500).json({ message: 'Error updating product.', error: error.message });
    }
};
exports.updateProduct = updateProduct;
const getProductById = async (req, res) => {
    try {
        const p_id = parseInt(req.params.id);
        const product = await productService.getProductById(p_id);
        if (!product)
            return res.status(404).json({ message: 'Product not found.' });
        res.json({ product });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching product.', error: error.message });
    }
};
exports.getProductById = getProductById;
const archiveProduct = async (req, res) => {
    try {
        console.log('--- archiveProduct start ---');
        const p_id = parseInt(req.params.id);
        const u_id = req.user?.id || req.body?.u_id;
        console.log('archiving p_id:', p_id, 'for u_id:', u_id);
        if (!u_id) {
            return res.status(401).json({ message: 'User verification required for archival.' });
        }
        await productService.archiveProduct(p_id, parseInt(u_id));
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
        }).catch(() => { });
        res.json({ message: 'Product archived successfully.' });
    }
    catch (error) {
        console.error('CRITICAL: archiveProduct error:', error);
        const message = String(error?.message || '');
        if (message.toLowerCase().includes('active or reserved orders')) {
            return res.status(400).json({ message });
        }
        res.status(500).json({ message: error.message || 'Error archiving product.' });
    }
};
exports.archiveProduct = archiveProduct;
const unarchiveProduct = async (req, res) => {
    try {
        const p_id = parseInt(req.params.id);
        const u_id = req.user?.id || req.body?.u_id;
        // Debug logging to a file since terminal is obscured
        const fs = require('fs');
        const logMsg = `[DEBUG] ${new Date().toISOString()} - Unarchive attempt: p_id=${p_id}, u_id=${u_id}\n`;
        fs.appendFileSync('debug_restoration.log', logMsg);
        if (!u_id) {
            return res.status(401).json({ message: 'User verification required for restoration.' });
        }
        await productService.unarchiveProduct(p_id, parseInt(u_id));
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
        }).catch(() => { });
        res.json({ message: 'Product restored successfully.' });
    }
    catch (error) {
        const fs = require('fs');
        fs.appendFileSync('debug_restoration.log', `[ERROR] ${error.message}\n`);
        console.error('CRITICAL: unarchiveProduct error:', error);
        res.status(500).json({ message: error.message || 'Error restoring product.' });
    }
};
exports.unarchiveProduct = unarchiveProduct;
const deleteProduct = async (req, res) => {
    try {
        console.log('--- deleteProduct start ---');
        const p_id = parseInt(req.params.id);
        const u_id = req.user?.id || req.body?.u_id;
        console.log('deleting p_id:', p_id, 'for u_id:', u_id);
        if (!u_id) {
            return res.status(401).json({ message: 'User verification required for deletion.' });
        }
        await productService.deleteProduct(p_id, parseInt(u_id));
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
        }).catch(() => { });
        res.json({ message: 'Product deleted successfully.' });
    }
    catch (error) {
        console.error('CRITICAL: deleteProduct error:', error);
        const message = String(error?.message || '');
        if (message.toLowerCase().includes('active or reserved orders')) {
            return res.status(400).json({ message });
        }
        res.status(500).json({ message: error.message || 'Error deleting product.' });
    }
};
exports.deleteProduct = deleteProduct;
