import { db } from '../database/database';

let ensuredLogTable = false;

// ─── Schema Ensure ─────────────────────────────────────────────────────────

export const ensureSystemLogTable = async () => {
    if (ensuredLogTable) return;
    
    // Use the user-provided concise schema
    // Note: We DROP and RECREATE to strictly follow the "fix to only cater this" request
    try {
        const [rows]: any = await db.execute("SHOW TABLES LIKE 'system_logs'");
        if (rows.length > 0) {
            // Check if log_id is already INT to avoid unnecessary drops in dev
            const [cols]: any = await db.execute("DESCRIBE system_logs");
            const idCol = cols.find((c: any) => c.Field === 'log_id');
            if (idCol && idCol.Type.toLowerCase().includes('varchar')) {
                console.log('[SystemLog] Detected legacy VARCHAR ID. Dropping for INT transition...');
                await db.execute("DROP TABLE system_logs");
            }
        }
    } catch (e) {}

    await db.execute(`
        CREATE TABLE IF NOT EXISTS system_logs (
            log_id         INT AUTO_INCREMENT PRIMARY KEY,
            correlation_id VARCHAR(64),
            user_id        INT NULL,
            user_name      VARCHAR(150) NULL,
            user_role      VARCHAR(80) NULL,
            action         VARCHAR(100) NOT NULL,
            event_type     VARCHAR(80) NULL,
            module         VARCHAR(80) NULL,
            description    TEXT NULL,
            category       VARCHAR(100) NULL,
            severity       VARCHAR(50) NULL,
            method         VARCHAR(10) NULL,
            endpoint       VARCHAR(255) NULL,
            http_status    INT NULL,
            error_code     VARCHAR(100) NULL,
            error_message  TEXT NULL,
            ip_address     VARCHAR(64) NULL,
            user_agent     TEXT NULL,
            duration_ms    INT NULL,
            before_data    JSON NULL,
            after_data     JSON NULL,
            created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    ensuredLogTable = true;
};

// ─── Log Rotation ───────────────────────────────────────────────────────────

let lastPruneCheck = 0;
const pruneIfNeeded = async () => {
    const now = Date.now();
    if (now - lastPruneCheck < 60 * 60 * 1000) return;
    lastPruneCheck = now;
    try {
        await db.execute(`DELETE FROM system_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)`);
        const [countRows]: any = await db.execute(`SELECT COUNT(*) as cnt FROM system_logs`);
        const count = countRows[0]?.cnt || 0;
        if (count > 10000) {
            await db.execute(`DELETE FROM system_logs ORDER BY created_at ASC LIMIT ${count - 10000}`);
        }
    } catch (e) {
        console.error('[SystemLog] Prune failed:', e);
    }
};

// ─── Core Write ─────────────────────────────────────────────────────────────

export interface LogPayload {
    correlation_id?:  string;
    user_id?:         number;
    user_name?:       string;
    user_role?:       string;
    action:           string;
    event_type?:      string;
    module?:          string;
    description?:     string;
    detail?:          string;
    category?:        string;
    severity?:        'info' | 'success' | 'warning' | 'error' | 'critical' | string;
    method?:          string;
    endpoint?:        string;
    http_status?:     number;
    error_code?:      string;
    error_message?:   string;
    ip_address?:      string;
    user_agent?:      string;
    duration_ms?:     number;
    before_data?:     any;
    after_data?:      any;
}

export const writeLog = async (payload: LogPayload) => {
    setImmediate(async () => {
        try {
            await ensureSystemLogTable();
            await pruneIfNeeded();

            const sql = `
                INSERT INTO system_logs 
                (
                    correlation_id, user_id, user_name, user_role, 
                    action, event_type, module, description, category, 
                    severity, method, endpoint, http_status, error_code, 
                    error_message, ip_address, user_agent, duration_ms,
                    before_data, after_data
                )
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            `;

            const params = [
                payload.correlation_id || null,
                payload.user_id || null,
                (payload.user_name || 'System').slice(0, 150),
                (payload.user_role || 'System').slice(0, 80),
                payload.action.slice(0, 100),
                payload.event_type || null,
                payload.module || null,
                payload.description || payload.detail || null,
                payload.category || 'System',
                payload.severity || 'info',
                payload.method || null,
                payload.endpoint ? payload.endpoint.slice(0, 255) : null,
                payload.http_status || null,
                payload.error_code || null,
                payload.error_message || null,
                payload.ip_address || null,
                payload.user_agent ? payload.user_agent.slice(0, 500) : null,
                payload.duration_ms ?? null,
                payload.before_data ? JSON.stringify(payload.before_data) : null,
                payload.after_data ? JSON.stringify(payload.after_data) : null
            ];

            await db.execute(sql, params);
        } catch (e) {
            console.error('FATAL [SystemLog] Table Storage Failure:', e);
        }
    });
};

// ─── Retrieval ──────────────────────────────────────────────────────────────

export const getAllLogs = async (filters: {
    category?: string;
    severity?: string;
    search?:   string;
    from?:     string;
    to?:       string;
    limit?:    number;
}) => {
    try {
        await ensureSystemLogTable();
        let query = `SELECT * FROM system_logs WHERE 1=1`;
        const params: any[] = [];

        if (filters.category) {
            query += ` AND category = ?`;
            params.push(filters.category);
        }
        if (filters.severity) {
            query += ` AND severity = ?`;
            params.push(filters.severity);
        }
        if (filters.search) {
            query += ` AND (action LIKE ? OR user_name LIKE ? OR endpoint LIKE ? OR description LIKE ?)`;
            const s = `%${filters.search}%`;
            params.push(s, s, s, s);
        }
        if (filters.from) {
            query += ` AND created_at >= ?`;
            params.push(filters.from);
        }
        if (filters.to) {
            query += ` AND created_at <= ?`;
            params.push(filters.to);
        }

        query += ` ORDER BY created_at DESC LIMIT ?`;
        params.push(filters.limit || 500);

        const [rows] = await db.execute(query, params);
        return rows;
    } catch (e) {
        console.error('[SystemLog] Fetch failed:', e);
        return [];
    }
};

export const createLog = async (payload: LogPayload & { log_id?: number }) => {
    await writeLog(payload);
};
