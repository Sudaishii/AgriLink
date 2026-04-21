import express, { Request, Response, NextFunction } from 'express';
import { authRoutes } from './routes/authRoutes';
import { productRoutes } from './routes/productRoutes';
import { purchaseRoutes } from './routes/purchaseRoutes';
import phenotypingRoutes from './routes/phenotypingRoutes';
import { userRoutes } from './routes/userRoutes';
import favoritesRoutes from './routes/favoritesRoutes';
import messageRoutes from './routes/messageRoutes';
import notificationRoutes from './routes/notificationRoutes';
import reviewRoutes from './routes/reviewRoutes';
import badgeRoutes from './routes/badgeRoutes';
import systemLogRoutes from './routes/systemLogRoutes';
import { requestLoggerMiddleware } from './middleware/requestLoggerMiddleware';

const app = express();

// Custom CORS Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
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

app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);
    next();
});

app.use(express.json());
app.use('/uploads', express.static('public/uploads'));
app.use(requestLoggerMiddleware);

// --- DIAGNOSTIC TEST ROUTE ---
app.get('/api/test-now', (req: Request, res: Response) => {
    res.json({
        message: 'SERVER IS RECOGNIZING EDITS - VERSION 3 - ROUTES CHECK',
        time: new Date().toLocaleTimeString(),
        status: 'OK'
    });
});

// Routes
app.get('/', (req: Request, res: Response) => {
    res.json({
        message: 'AgriLink API - RECOGNIZING EDITS v2',
        status: 'Online',
        port: process.env.PORT || 5002
    });
});

app.get('/api/test', (req, res) => res.json({ status: 'API IS LIVE', timestamp: new Date().toISOString() }));

// --- DIRECT ADD ROUTE ---
import * as productController from './controllers/productController';
import { authenticateToken } from './middleware/authMiddleware';
import { upload } from './middleware/uploadMiddleware';
app.post('/api/add/product', authenticateToken, upload.single('p_image'), productController.createProduct);

import searchRoutes from './routes/searchRoutes';

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/phenotyping', phenotypingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/badges', badgeRoutes);
app.use('/api/logs', systemLogRoutes);
app.use('/api/search', searchRoutes);

// --- GLOBAL ERROR HANDLER ---
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
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

export default app;
