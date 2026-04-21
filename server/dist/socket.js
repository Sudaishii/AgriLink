"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOnlineUsers = exports.emitToAll = exports.emitToUser = exports.getIO = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("./config/env");
let io;
const onlineUsers = new Map();
const initSocket = (server) => {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
            methods: ['GET', 'POST'],
            credentials: true
        }
    });
    // Simple auth middleware for socket
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication error: Token missing'));
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, env_1.ENV.JWT_SECRET);
            const rawId = decoded?.id ?? decoded?.userId ?? decoded?.u_id;
            const idNum = typeof rawId === 'number' ? rawId : Number(rawId);
            if (!Number.isFinite(idNum) || idNum <= 0) {
                return next(new Error('Authentication error: Missing user id in token'));
            }
            socket.userId = idNum;
            next();
        }
        catch (err) {
            return next(new Error('Authentication error: Invalid token'));
        }
    });
    io.on('connection', (socket) => {
        const userId = socket.userId;
        console.log(`[SOCKET] User connected: ${userId} (Socket ID: ${socket.id})`);
        // Track online status
        if (!onlineUsers.has(userId)) {
            onlineUsers.set(userId, new Set());
            // Broadcast user is now online
            io.emit('user_status', { userId, status: 'online' });
        }
        onlineUsers.get(userId)?.add(socket.id);
        // Join a private room for this user
        socket.join(`user_${userId}`);
        // Handle initial status request
        socket.on('get_online_users', (callback) => {
            if (typeof callback === 'function') {
                callback(Array.from(onlineUsers.keys()));
            }
        });
        socket.on('disconnect', () => {
            console.log(`[SOCKET] User disconnected: ${userId}`);
            const userSockets = onlineUsers.get(userId);
            if (userSockets) {
                userSockets.delete(socket.id);
                if (userSockets.size === 0) {
                    onlineUsers.delete(userId);
                    // Broadcast user is now offline
                    io.emit('user_status', { userId, status: 'offline' });
                }
            }
        });
    });
    return io;
};
exports.initSocket = initSocket;
const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
};
exports.getIO = getIO;
const emitToUser = (userId, event, data) => {
    if (io) {
        io.to(`user_${userId}`).emit(event, data);
    }
};
exports.emitToUser = emitToUser;
const emitToAll = (event, data) => {
    if (io) {
        io.emit(event, data);
    }
};
exports.emitToAll = emitToAll;
const getOnlineUsers = () => Array.from(onlineUsers.keys());
exports.getOnlineUsers = getOnlineUsers;
