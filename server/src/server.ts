import http from 'http'; // v2 - Apply logging schema
import app from './app';
import { ENV } from './config/env';
import { initSocket } from './socket';

process.on('uncaughtException', (err) => {
    console.error('--- CRITICAL: UNCAUGHT EXCEPTION ---');
    console.error(err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('--- CRITICAL: UNHANDLED REJECTION ---');
    console.error('Reason:', reason);
});

const PORT = ENV.PORT || 5000;
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

function listenWithFallback(startPort: number, attemptsLeft: number) {
    server.listen(startPort, () => {
        console.log(`Server running at http://localhost:${startPort}`);
    });

    server.once('error', (err: any) => {
        if (err?.code === 'EADDRINUSE') {
            if (attemptsLeft <= 0) {
                console.error(`Port ${startPort} is already in use. Set a different PORT in server/.env and restart.`);
                process.exit(1);
            }
            const nextPort = startPort + 1;
            console.warn(`Port ${startPort} is already in use. Trying ${nextPort}...`);
            server.close(() => listenWithFallback(nextPort, attemptsLeft - 1));
            return;
        }

        console.error('--- CRITICAL: SERVER LISTEN ERROR ---');
        console.error(err);
        process.exit(1);
    });
}

listenWithFallback(PORT, 5);
