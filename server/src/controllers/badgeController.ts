import { Request, Response } from 'express';
import { db } from '../database/database';
import { writeLog } from '../services/systemLogService';

// ─── Ensure Tables ───────────────────────────────────────────────────────────

const ensureBadgeTable = async () => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS farmer_badges (
      id INT AUTO_INCREMENT PRIMARY KEY,
      farmer_id INT NOT NULL,
      badge_type VARCHAR(50) NOT NULL,
      badge_label VARCHAR(100) NOT NULL,
      notes TEXT,
      issued_by INT NOT NULL,
      issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      revoked_at TIMESTAMP NULL,
      INDEX idx_farmer (farmer_id),
      INDEX idx_issued_by (issued_by)
    )
  `);
};

// ─── GET /farmers-by-brgy ────────────────────────────────────────────────────

export const getFarmersByBrgy = async (req: Request, res: Response) => {
  try {
    const sessionUser = (req as any).user || {};
    const role = String(sessionUser.role || '').toLowerCase();

    if (role !== 'brgy_official' && role !== 'admin') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    // Extract the barangay from the official's last_name (stored as "Barangay TungkopName")
    // first_name = 'Barangay', last_name = 'Tungkop'
    const officialId = sessionUser.id || sessionUser.userId;

    // Fetch the official's name to get their barangay
    const [officialRows]: any = await db.execute(
      `SELECT first_name, last_name, city FROM users_table WHERE id = ?`,
      [officialId]
    );

    if (!officialRows || officialRows.length === 0) {
      return res.status(404).json({ message: 'Official profile not found.' });
    }

    const official = officialRows[0];
    // The barangay is stored in last_name (e.g. "Tungkop")
    const brgyName = String(official.last_name || '').trim();

    // If no barangay name is assigned, default to an empty string. The frontend will filter if needed.

    await ensureBadgeTable();

    // Fetch farmers whose city/address LIKE the barangay name
    // We match on city field (the city stored when registering via magic link is the barangay)
    let queryStr = `
      SELECT 
          u.id,
          u.first_name,
          u.last_name,
          u.city,
          u.province,
          u.address,
          u.created_at,
          COALESCE(u.profile_image, '') AS profile_image,
          COALESCE(
            (SELECT COUNT(*) FROM purchase_table pt 
             JOIN product_table p ON pt.product_id = p.p_id 
             WHERE p.u_id = u.id AND pt.req_status = 'Completed'), 0
          ) AS completed_orders,
          COALESCE(
            (SELECT COUNT(*) FROM product_table WHERE u_id = u.id AND p_status = 'active'), 0
          ) AS active_listings
       FROM users_table u
       LEFT JOIN auth_table a ON u.auth_id = a.id
       WHERE (u.role = 'farmer')
         AND COALESCE(a.is_verified, 1) = 1
    `;
    
    const queryParams: string[] = [];

    if (role === 'brgy_official' && brgyName) {
      // Filter by barangay name in address or city
      queryStr += ` AND (LOWER(u.address) LIKE ? OR LOWER(u.city) LIKE ?)`;
      queryParams.push(`%${brgyName.toLowerCase()}%`, `%${brgyName.toLowerCase()}%`);
    }

    queryStr += ` ORDER BY u.first_name ASC`;

    const [farmers]: any = await db.execute(queryStr, queryParams);

    // For each farmer, get their badges
    const farmerIds = farmers.map((f: any) => f.id);

    let badgeMap: Record<number, any[]> = {};
    if (farmerIds.length > 0) {
      const [badges]: any = await db.execute(
        `SELECT fb.*, u.first_name AS issuer_first, u.last_name AS issuer_last
         FROM farmer_badges fb
         JOIN users_table u ON fb.issued_by = u.id
         WHERE fb.farmer_id IN (${farmerIds.map(() => '?').join(',')})
           AND fb.revoked_at IS NULL
         ORDER BY fb.issued_at DESC`,
        farmerIds
      );
      for (const b of badges) {
        if (!badgeMap[b.farmer_id]) badgeMap[b.farmer_id] = [];
        badgeMap[b.farmer_id].push(b);
      }
    }

    const mapped = farmers.map((f: any) => ({
      id: f.id,
      first_name: f.first_name,
      last_name: f.last_name,
      name: `${f.first_name} ${f.last_name}`,
      city: f.city,
      province: f.province,
      address: f.address,
      profile_image: f.profile_image,
      created_at: f.created_at,
      completed_orders: Number(f.completed_orders),
      active_listings: Number(f.active_listings),
      badges: badgeMap[f.id] || [],
    }));

    return res.status(200).json({ farmers: mapped, brgy: brgyName });
  } catch (err: any) {
    console.error('[getFarmersByBrgy]', err);
    return res.status(500).json({ message: 'Error fetching farmers by barangay.' });
  }
};

// ─── GET /farmer/:farmerId ───────────────────────────────────────────────────

export const getFarmerBadges = async (req: Request, res: Response) => {
  try {
    await ensureBadgeTable();
    const { farmerId } = req.params;
    const [badges]: any = await db.execute(
      `SELECT fb.*, u.first_name AS issuer_first, u.last_name AS issuer_last
       FROM farmer_badges fb
       JOIN users_table u ON fb.issued_by = u.id
       WHERE fb.farmer_id = ? AND fb.revoked_at IS NULL
       ORDER BY fb.issued_at DESC`,
      [farmerId]
    );
    return res.status(200).json({ badges });
  } catch (err: any) {
    console.error('[getFarmerBadges]', err);
    return res.status(500).json({ message: 'Error fetching farmer badges.' });
  }
};

// ─── POST /award ─────────────────────────────────────────────────────────────

export const awardBadge = async (req: Request, res: Response) => {
  try {
    const sessionUser = (req as any).user || {};
    const role = String(sessionUser.role || '').toLowerCase();

    if (role !== 'brgy_official' && role !== 'admin') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const { farmer_id, badge_type, badge_label, notes } = req.body;
    const issuedBy = sessionUser.id || sessionUser.userId;

    if (!farmer_id || !badge_type || !badge_label) {
      return res.status(400).json({ message: 'farmer_id, badge_type, and badge_label are required.' });
    }

    await ensureBadgeTable();

    // Check if this badge type is already active for this farmer
    const [existing]: any = await db.execute(
      `SELECT id FROM farmer_badges 
       WHERE farmer_id = ? AND badge_type = ? AND revoked_at IS NULL`,
      [farmer_id, badge_type]
    );

    if (existing && existing.length > 0) {
      return res.status(409).json({ message: 'This badge is already active for this farmer.' });
    }

    await db.execute(
      `INSERT INTO farmer_badges (farmer_id, badge_type, badge_label, notes, issued_by)
       VALUES (?, ?, ?, ?, ?)`,
      [farmer_id, badge_type, badge_label, notes || null, issuedBy]
    );

    // Create system log
    try {
        const [farmerRows]: any = await db.execute('SELECT first_name, last_name FROM users_table WHERE id = ?', [farmer_id]);
        const fName = farmerRows[0] ? `${farmerRows[0].first_name} ${farmerRows[0].last_name}` : `User ID ${farmer_id}`;
        const issuerName = `${sessionUser.firstName || ''}`.trim() || `Official #${issuedBy}`;
        await writeLog({
            user_name: issuerName,
            user_role: sessionUser.role || 'brgy_official',
            action: 'Farmer Certification Awarded',
            detail: `"${badge_label}" badge awarded to ${fName}`,
            category: 'User',
            severity: 'success',
            ip_address: req.ip || '127.0.0.1'
        });
    } catch (e) {
        console.error('Failed to write telemetry', e);
    }

    return res.status(201).json({ message: 'Badge awarded successfully.' });
  } catch (err: any) {
    console.error('[awardBadge]', err);
    return res.status(500).json({ message: 'Error awarding badge.' });
  }
};

// ─── DELETE /:badgeId ────────────────────────────────────────────────────────

export const revokeBadge = async (req: Request, res: Response) => {
  try {
    const sessionUser = (req as any).user || {};
    const role = String(sessionUser.role || '').toLowerCase();

    if (role !== 'brgy_official' && role !== 'admin') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const { badgeId } = req.params;
    await ensureBadgeTable();

    await db.execute(
      `UPDATE farmer_badges SET revoked_at = NOW() WHERE id = ?`,
      [badgeId]
    );

    // Create system log
    try {
        const issuerName = `${sessionUser.firstName || ''}`.trim() || 'Official';
        await writeLog({
            user_name: issuerName,
            user_role: sessionUser.role || 'brgy_official',
            action: 'Farmer Certification Revoked',
            detail: `Certification Badge ID #${badgeId} was permanently revoked`,
            category: 'Security',
            severity: 'warning',
            ip_address: req.ip || '127.0.0.1'
        });
    } catch (e) {
        console.error('Failed to write telemetry', e);
    }

    return res.status(200).json({ message: 'Badge revoked successfully.' });
  } catch (err: any) {
    console.error('[revokeBadge]', err);
    return res.status(500).json({ message: 'Error revoking badge.' });
  }
};
