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
exports.createLog = exports.getAllLogs = void 0;
const systemLogService = __importStar(require("../services/systemLogService"));
const getAllLogs = async (req, res) => {
    try {
        const sessionUser = req.user || {};
        const role = String(sessionUser.role || '').toLowerCase();
        if (role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }
        const { category, severity, search, from, to, limit } = req.query;
        const logs = await systemLogService.getAllLogs({
            category: category,
            severity: severity,
            search: search,
            from: from,
            to: to,
            limit: limit ? Number(limit) : 500,
        });
        res.json({ logs, total: logs.length });
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching system logs.', error: error.message });
    }
};
exports.getAllLogs = getAllLogs;
const createLog = async (req, res) => {
    try {
        const sessionUser = req.user || {};
        const role = String(sessionUser.role || '').toLowerCase();
        if (role !== 'admin') {
            return res.status(403).json({ message: 'Access denied.' });
        }
        const logData = req.body;
        if (!logData.log_id || !logData.action) {
            return res.status(400).json({ message: 'Missing required fields: log_id, action.' });
        }
        await systemLogService.createLog({
            log_id: logData.log_id,
            user_name: logData.user_name || 'System',
            user_role: logData.user_role || 'System',
            action: logData.action,
            detail: logData.detail || '',
            category: logData.category || 'System',
            severity: logData.severity || 'info',
            ip_address: logData.ip_address || req.ip || '127.0.0.1'
        });
        res.status(201).json({ message: 'Log created successfully.' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating system log.', error: error.message });
    }
};
exports.createLog = createLog;
