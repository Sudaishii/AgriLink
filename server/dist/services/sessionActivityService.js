"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordUserSessionActivity = recordUserSessionActivity;
const database_1 = require("../database/database");
const THROTTLE_MS = 90_000;
const lastWriteAt = new Map();
let updatesDisabled = false;
function isMissingColumn(err, col) {
    const e = err;
    const msg = String(e?.message ?? '').toLowerCase();
    const c = col.toLowerCase();
    return (e?.code === 'ER_BAD_FIELD_ERROR' || e?.errno === 1054) && msg.includes(c);
}
/**
 * Records that this user recently used the API with a valid JWT.
 * Throttled to limit writes; use `{ force: true }` on login.
 */
function recordUserSessionActivity(userId, options) {
    if (updatesDisabled)
        return;
    if (!Number.isFinite(userId) || userId <= 0)
        return;
    const now = Date.now();
    if (!options?.force) {
        const prev = lastWriteAt.get(userId);
        if (prev != null && now - prev < THROTTLE_MS)
            return;
    }
    lastWriteAt.set(userId, now);
    void (async () => {
        try {
            await database_1.db.query('UPDATE users_table SET last_session_activity_at = CURRENT_TIMESTAMP WHERE id = ?', [userId]);
        }
        catch (e) {
            if (isMissingColumn(e, 'last_session_activity_at')) {
                updatesDisabled = true;
                return;
            }
            console.error('[sessionActivity] update failed', e);
        }
    })();
}
