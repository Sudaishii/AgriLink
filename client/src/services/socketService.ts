import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initSocket = (token: string) => {
    if (socket) return socket;

    // In dev, Vite proxies this to the backend automatically
    socket = io('/', {
        auth: { token }
    });

    socket.on('connect', () => {
        console.log('[SOCKET] Connected to server');
    });

    socket.on('disconnect', () => {
        console.log('[SOCKET] Disconnected from server');
    });

    socket.on('connect_error', (err) => {
        console.error('[SOCKET] Connection error:', err.message);
    });

    return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
