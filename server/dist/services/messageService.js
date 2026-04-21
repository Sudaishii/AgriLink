"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageService = void 0;
const database_1 = require("../database/database");
const convSubquery = `FROM (
        SELECT 
          CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END AS other_user_id,
          MAX(m.m_id) AS max_mid
        FROM messages_table m
        WHERE m.sender_id = ? OR m.receiver_id = ?
        GROUP BY CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
      ) conv
      INNER JOIN messages_table last_msg ON last_msg.m_id = conv.max_mid
      INNER JOIN users_table u ON u.id = conv.other_user_id`;
const convParams = (userId) => [userId, userId, userId, userId, userId];
function isMissingColumn(err, col) {
    const e = err;
    const msg = String(e?.message ?? '').toLowerCase();
    const c = col.toLowerCase();
    return (e?.code === 'ER_BAD_FIELD_ERROR' || e?.errno === 1054) && msg.includes(c);
}
async function queryConversations(userId, includePeerSession) {
    const peerLine = includePeerSession
        ? '        u.last_session_activity_at AS peerLastSessionAt,\n'
        : '';
    const params = convParams(userId);
    const sqlWithImage = `SELECT 
        u.id AS participantId,
        u.first_name,
        u.last_name,
        u.role,
        u.phone,
        u.profile_image,
${peerLine}        CASE
          WHEN last_msg.image_path IS NOT NULL AND last_msg.image_path <> ''
          THEN CONCAT('[Photo]', IF(CHAR_LENGTH(TRIM(COALESCE(last_msg.content, ''))) > 0, CONCAT(' — ', TRIM(last_msg.content)), ''))
          ELSE last_msg.content
        END AS lastMessage,
        last_msg.created_at AS lastMessageTime,
        (SELECT COUNT(*) FROM messages_table m2 
         WHERE m2.sender_id = u.id AND m2.receiver_id = ? AND m2.is_read = 0) AS unreadCount
      ${convSubquery}
      ORDER BY last_msg.created_at DESC`;
    const sqlNoImageCol = `SELECT 
        u.id AS participantId,
        u.first_name,
        u.last_name,
        u.role,
        u.phone,
        u.profile_image,
${peerLine}        last_msg.content AS lastMessage,
        last_msg.created_at AS lastMessageTime,
        (SELECT COUNT(*) FROM messages_table m2 
         WHERE m2.sender_id = u.id AND m2.receiver_id = ? AND m2.is_read = 0) AS unreadCount
      ${convSubquery}
      ORDER BY last_msg.created_at DESC`;
    const sqlNoPhoneCol = `SELECT 
        u.id AS participantId,
        u.first_name,
        u.last_name,
        u.role,
        CAST(NULL AS CHAR) AS phone,
        u.profile_image,
${peerLine}        last_msg.content AS lastMessage,
        last_msg.created_at AS lastMessageTime,
        (SELECT COUNT(*) FROM messages_table m2 
         WHERE m2.sender_id = u.id AND m2.receiver_id = ? AND m2.is_read = 0) AS unreadCount
      ${convSubquery}
      ORDER BY last_msg.created_at DESC`;
    try {
        const [rows] = await database_1.db.query(sqlWithImage, params);
        return rows;
    }
    catch (e) {
        if (isMissingColumn(e, 'image_path')) {
            try {
                const [rows] = await database_1.db.query(sqlNoImageCol, params);
                return rows;
            }
            catch (e2) {
                if (isMissingColumn(e2, 'phone')) {
                    const [rows] = await database_1.db.query(sqlNoPhoneCol, params);
                    return rows;
                }
                throw e2;
            }
        }
        if (isMissingColumn(e, 'phone')) {
            const [rows] = await database_1.db.query(sqlNoPhoneCol, params);
            return rows;
        }
        throw e;
    }
}
exports.messageService = {
    getConversations: async (userId) => {
        try {
            return await queryConversations(userId, true);
        }
        catch (e) {
            if (isMissingColumn(e, 'last_session_activity_at')) {
                return queryConversations(userId, false);
            }
            throw e;
        }
    },
    getMessages: async (userId, otherUserId) => {
        const [rows] = await database_1.db.query(`SELECT * FROM messages_table 
       WHERE (sender_id = ? AND receiver_id = ?) 
       OR (sender_id = ? AND receiver_id = ?) 
       ORDER BY created_at ASC`, [userId, otherUserId, otherUserId, userId]);
        return rows;
    },
    sendMessage: async (sender_id, receiver_id, content, imagePath = null) => {
        try {
            const [result] = await database_1.db.query(`INSERT INTO messages_table (sender_id, receiver_id, content, image_path)
         VALUES (?, ?, ?, ?)`, [sender_id, receiver_id, content, imagePath]);
            return result;
        }
        catch (e) {
            if (isMissingColumn(e, 'image_path')) {
                const [result] = await database_1.db.query('INSERT INTO messages_table (sender_id, receiver_id, content) VALUES (?, ?, ?)', [sender_id, receiver_id, content]);
                return result;
            }
            throw e;
        }
    },
    markAsRead: async (sender_id, receiver_id) => {
        const [result] = await database_1.db.query('UPDATE messages_table SET is_read = TRUE WHERE sender_id = ? AND receiver_id = ?', [sender_id, receiver_id]);
        return result;
    },
    /** Mark every message sent *to* this user as read (all conversations). */
    markAllAsReadForReceiver: async (receiverId) => {
        const [result] = await database_1.db.query('UPDATE messages_table SET is_read = 1 WHERE receiver_id = ? AND is_read = 0', [receiverId]);
        return result;
    }
};
