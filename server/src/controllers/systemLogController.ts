import { Request, Response } from 'express';
import * as systemLogService from '../services/systemLogService';

export const getAllLogs = async (req: Request, res: Response) => {
    try {
        const sessionUser = (req as any).user || {};
        const role = String(sessionUser.role || '').toLowerCase();
        if (role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }

        const { category, severity, search, from, to, limit } = req.query;

        const logs = await systemLogService.getAllLogs({
            category: category as string | undefined,
            severity: severity as string | undefined,
            search:   search   as string | undefined,
            from:     from     as string | undefined,
            to:       to       as string | undefined,
            limit:    limit    ? Number(limit) : 500,
        });

        res.json({ logs, total: (logs as any[]).length });
    } catch (error: any) {
        res.status(500).json({ message: 'Error fetching system logs.', error: error.message });
    }
};

export const createLog = async (req: Request, res: Response) => {
    try {
        const sessionUser = (req as any).user || {};
        const role = String(sessionUser.role || '').toLowerCase();
        if (role !== 'admin') {
            return res.status(403).json({ message: 'Access denied.' });
        }

        const logData = req.body;
        if (!logData.log_id || !logData.action) {
            return res.status(400).json({ message: 'Missing required fields: log_id, action.' });
        }

        await systemLogService.createLog({
            log_id:     logData.log_id,
            user_name:  logData.user_name  || 'System',
            user_role:  logData.user_role  || 'System',
            action:     logData.action,
            detail:     logData.detail     || '',
            category:   logData.category   || 'System',
            severity:   logData.severity   || 'info',
            ip_address: logData.ip_address || req.ip || '127.0.0.1'
        });

        res.status(201).json({ message: 'Log created successfully.' });
    } catch (error: any) {
        res.status(500).json({ message: 'Error creating system log.', error: error.message });
    }
};
