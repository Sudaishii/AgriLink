"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http")); // v2 - Apply logging schema
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const socket_1 = require("./socket");
process.on('uncaughtException', (err) => {
    console.error('--- CRITICAL: UNCAUGHT EXCEPTION ---');
    console.error(err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('--- CRITICAL: UNHANDLED REJECTION ---');
    console.error('Reason:', reason);
});
const PORT = env_1.ENV.PORT || 5000;
const server = http_1.default.createServer(app_1.default);
// Initialize Socket.io
(0, socket_1.initSocket)(server);
function listenWithFallback(startPort, attemptsLeft) {
    server.listen(startPort, () => {
        console.log(`Server running at http://localhost:${startPort}`);
    });
    server.once('error', (err) => {
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
