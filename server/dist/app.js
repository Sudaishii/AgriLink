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
const express_1 = __importDefault(require("express"));
const authRoutes_1 = require("./routes/authRoutes");
const productRoutes_1 = require("./routes/productRoutes");
const purchaseRoutes_1 = require("./routes/purchaseRoutes");
const phenotypingRoutes_1 = __importDefault(require("./routes/phenotypingRoutes"));
const userRoutes_1 = require("./routes/userRoutes");
const favoritesRoutes_1 = __importDefault(require("./routes/favoritesRoutes"));
const messageRoutes_1 = __importDefault(require("./routes/messageRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
const reviewRoutes_1 = __importDefault(require("./routes/reviewRoutes"));
const badgeRoutes_1 = __importDefault(require("./routes/badgeRoutes"));
const systemLogRoutes_1 = __importDefault(require("./routes/systemLogRoutes"));
const cartRoutes_1 = __importDefault(require("./routes/cartRoutes"));
const requestLoggerMiddleware_1 = require("./middleware/requestLoggerMiddleware");
const app = (0, express_1.default)();
// Custom CORS Middleware
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin === 'http://localhost:5173') {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    // Handle Preflight (OPTIONS)
    if (req.method === 'OPTIONS') {
        res.sendStatus(204);
        return;
    }
    next();
});
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);
    next();
});
app.use(express_1.default.json());
app.use('/uploads', express_1.default.static('public/uploads'));
app.use(requestLoggerMiddleware_1.requestLoggerMiddleware);
// --- DIAGNOSTIC TEST ROUTE ---
app.get('/api/test-now', (req, res) => {
    res.json({
        message: 'SERVER IS RECOGNIZING EDITS - VERSION 3 - ROUTES CHECK',
        time: new Date().toLocaleTimeString(),
        status: 'OK'
    });
});
// Routes
app.get('/', (req, res) => {
    res.json({
        message: 'AgriLink API - RECOGNIZING EDITS v2',
        status: 'Online',
        port: process.env.PORT || 5002
    });
});
app.get('/api/test', (req, res) => res.json({ status: 'API IS LIVE', timestamp: new Date().toISOString() }));
// --- DIRECT ADD ROUTE ---
const productController = __importStar(require("./controllers/productController"));
const authMiddleware_1 = require("./middleware/authMiddleware");
const uploadMiddleware_1 = require("./middleware/uploadMiddleware");
app.post('/api/add/product', authMiddleware_1.authenticateToken, uploadMiddleware_1.upload.single('p_image'), productController.createProduct);
const searchRoutes_1 = __importDefault(require("./routes/searchRoutes"));
app.use('/api/auth', authRoutes_1.authRoutes);
app.use('/api/products', productRoutes_1.productRoutes);
app.use('/api/purchases', purchaseRoutes_1.purchaseRoutes);
app.use('/api/phenotyping', phenotypingRoutes_1.default);
app.use('/api/users', userRoutes_1.userRoutes);
app.use('/api/favorites', favoritesRoutes_1.default);
app.use('/api/messages', messageRoutes_1.default);
app.use('/api/notifications', notificationRoutes_1.default);
app.use('/api/reviews', reviewRoutes_1.default);
app.use('/api/badges', badgeRoutes_1.default);
app.use('/api/logs', systemLogRoutes_1.default);
app.use('/api/cart', cartRoutes_1.default);
app.use('/api/search', searchRoutes_1.default);
// --- GLOBAL ERROR HANDLER ---
app.use((err, req, res, next) => {
    console.error('--- GLOBAL ERROR CAUGHT ---');
    console.error('Error Name:', err.name);
    console.error('Error Message:', err.message);
    console.error('Error Stack:', err.stack);
    if (res.headersSent) {
        return next(err);
    }
    res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error',
        stack: err.stack, // Always return stack for internal debugging
        error_name: err.name
    });
});
exports.default = app;
