import { Request, Response } from 'express';
import { db } from '../database/database';
import { sendEmail } from '../services/emailService';
import { emitToAll } from '../socket';
import { ensureFarmerServiceReviewTable } from '../services/reviewService';
import { writeLog } from '../services/systemLogService';
import { notificationService } from '../services/notificationService';

const tableColumnsCache = new Map<string, Set<string>>();

const invalidateTableColumns = (tableName: string) => {
  tableColumnsCache.delete(tableName);
};

const getTableColumns = async (tableName: string): Promise<Set<string>> => {
  const cached = tableColumnsCache.get(tableName);
  if (cached) return cached;

  try {
    const [rows]: any = await db.execute(`SHOW COLUMNS FROM ${tableName}`);
    const cols = new Set<string>((rows || []).map((row: any) => String(row.Field)));
    tableColumnsCache.set(tableName, cols);
    return cols;
  } catch {
    const empty = new Set<string>();
    tableColumnsCache.set(tableName, empty);
    return empty;
  }
};

const hasColumn = async (tableName: string, columnName: string): Promise<boolean> => {
  const cols = await getTableColumns(tableName);
  return cols.has(columnName);
};

const ensureFarmImageColumn = async (): Promise<boolean> => {
  const farmColumns = await getTableColumns('farms_table');
  if (farmColumns.size === 0) return false;
  if (farmColumns.has('farm_image')) return true;

  try {
    await db.execute(
      'ALTER TABLE farms_table ADD COLUMN IF NOT EXISTS farm_image VARCHAR(255) NULL AFTER farm_name'
    );
    invalidateTableColumns('farms_table');
    const refreshedColumns = await getTableColumns('farms_table');
    return refreshedColumns.has('farm_image');
  } catch {
    return false;
  }
};

const ensureProfileImageColumn = async (): Promise<boolean> => {
  const userColumns = await getTableColumns('users_table');
  if (userColumns.size === 0) return false;
  if (userColumns.has('profile_image')) return true;

  try {
    await db.execute(
      'ALTER TABLE users_table ADD COLUMN IF NOT EXISTS profile_image VARCHAR(255) NULL'
    );
    invalidateTableColumns('users_table');
    const refreshedColumns = await getTableColumns('users_table');
    return refreshedColumns.has('profile_image');
  } catch {
    return false;
  }
};

const ensureFarmGalleryTable = async () => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS farm_gallery_images (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      image_path VARCHAR(255) NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_farm_gallery_user_id (user_id),
      CONSTRAINT fk_farm_gallery_user
        FOREIGN KEY (user_id) REFERENCES users_table(id)
        ON DELETE CASCADE
    )
  `);
};

const getFarmGalleryImages = async (userId: number | string): Promise<string[]> => {
  try {
    await ensureFarmGalleryTable();
    const [rows]: any = await db.execute(
      `SELECT image_path
       FROM farm_gallery_images
       WHERE user_id = ?
       ORDER BY sort_order ASC, created_at ASC, id ASC`,
      [userId]
    );
    return (rows || []).map((row: any) => String(row.image_path)).filter(Boolean);
  } catch {
    return [];
  }
};

const normalizeBoolean = (value: unknown, defaultValue = true): boolean => {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const lowered = String(value).trim().toLowerCase();
  if (lowered === 'false' || lowered === '0' || lowered === 'no') return false;
  return true;
};

const asNullable = (value: unknown): string | number | null => {
  if (value === undefined || value === null || value === '') return null;
  return value as string | number;
};

const ensureAuthorizedUserAccess = (req: Request, userId: string): { allowed: boolean } => {
  const sessionUser = (req as any).user || {};
  const sessionUserId = Number(sessionUser.id);
  const requestedUserId = Number(userId);
  const role = String(sessionUser.role || '').toLowerCase();
  const isAdminLike = role === 'admin' || role === 'brgy_official' || role === 'lgu_official';

  if (!Number.isFinite(requestedUserId) || requestedUserId <= 0) {
    return { allowed: false };
  }

  if (isAdminLike || sessionUserId === requestedUserId) {
    return { allowed: true };
  }

  return { allowed: false };
};

const asBinaryFlag = (value: unknown, fallback = 1): 0 | 1 => {
  if (value === undefined || value === null || value === '') return fallback === 1 ? 1 : 0;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number') return value === 1 ? 1 : 0;
  const lowered = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(lowered)) return 1;
  if (['0', 'false', 'no', 'off'].includes(lowered)) return 0;
  return fallback === 1 ? 1 : 0;
};

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

const getBadgesByUserId = async (userId: number | string): Promise<any[]> => {
  try {
    await ensureBadgeTable();
    const [rows]: any = await db.execute(
      `SELECT fb.*, u.first_name AS issuer_first, u.last_name AS issuer_last
       FROM farmer_badges fb
       JOIN users_table u ON fb.issued_by = u.id
       WHERE fb.farmer_id = ? AND fb.revoked_at IS NULL
       ORDER BY fb.issued_at DESC`,
      [userId]
    );
    return rows || [];
  } catch {
    return [];
  }
};

export const updateOnboardingStatus = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const userIdParam = Array.isArray(userId) ? userId[0] : userId;
    const { 
      phone, address, city, province, zip_code, latitude, longitude,
      farm_address, farm_city, farm_province, farm_zip_code,
      farm_latitude, farm_longitude, farm_address_same_as_home
    } = req.body;

    if (!userIdParam) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    if (!ensureAuthorizedUserAccess(req, userIdParam).allowed) {
      return res.status(403).json({ message: 'You are not allowed to modify this user.' });
    }

    const userColumns = await getTableColumns('users_table');
    const farmColumnsInDb = await getTableColumns('farms_table');
    const requesterRole = String((req as any).user?.role || '').toLowerCase();
    const isBuyer = requesterRole === 'buyer';
    const isFarmer = requesterRole === 'farmer';

    // 1️⃣ Normalize inputs
    const rawPhone = String(phone ?? '').replace(/\D/g, '');
    if (rawPhone.length !== 11) {
      return res.status(400).json({ message: 'Mobile number must be exactly 11 digits.' });
    }
    const safePhone = rawPhone;
    const safeAddress = asNullable(address);
    const safeCity = isFarmer ? 'Minglanilla' : asNullable(city);
    const safeProvince = isFarmer ? 'Cebu' : asNullable(province);
    const safeZipCode = isFarmer ? '6046' : asNullable(zip_code);
    const safeLat = asNullable(latitude);
    const safeLng = asNullable(longitude);

    // 2️⃣ Update core user profile
    const userUpdates: Array<{ column: string; value: any }> = [
      { column: 'phone', value: safePhone },
      { column: 'address', value: safeAddress },
      { column: 'city', value: safeCity },
      { column: 'province', value: safeProvince },
      { column: 'zip_code', value: safeZipCode },
      { column: 'latitude', value: safeLat },
      { column: 'longitude', value: safeLng },
      { column: 'onboarding_completed', value: 1 },
    ].filter(u => userColumns.has(u.column));

    // Also update legacy farm columns in users_table for consistency if they exist
    const isSameAsHome = farm_address_same_as_home !== false;
    const legAddress = isSameAsHome ? safeAddress : asNullable(farm_address);
    const legLat = isSameAsHome ? safeLat : asNullable(farm_latitude);
    const legLng = isSameAsHome ? safeLng : asNullable(farm_longitude);
    
    const legacyFarmCols = [
      { column: 'farm_address', value: legAddress },
      { column: 'farm_city', value: safeCity },
      { column: 'farm_province', value: safeProvince },
      { column: 'farm_zip_code', value: safeZipCode },
      { column: 'farm_latitude', value: legLat },
      { column: 'farm_longitude', value: legLng },
      { column: 'farm_address_same_as_home', value: isSameAsHome ? 1 : 0 }
    ].filter(u => userColumns.has(u.column));

    const finalUserUpdates = [...userUpdates, ...legacyFarmCols];

    await db.execute(
      `UPDATE users_table SET ${finalUserUpdates.map(u => `${u.column} = ?`).join(', ')} WHERE id = ?`,
      [...finalUserUpdates.map(u => u.value), userIdParam]
    );

    // 3️⃣ Upsert farm details in farms_table (schema-safe)
    if (farmColumnsInDb.size > 0 && farmColumnsInDb.has('user_id')) {
      const finalFarmAddress = legAddress;
      const finalFarmCity = safeCity;
      const finalFarmProvince = safeProvince;
      const finalFarmZipCode = safeZipCode;
      const finalFarmLatitude = legLat;
      const finalFarmLongitude = legLng;

      const farmUpdates: Array<{ column: string; value: string | number | null }> = [
        { column: 'farm_address', value: finalFarmAddress as string | number | null },
        { column: 'farm_city', value: finalFarmCity as string | number | null },
        { column: 'farm_province', value: finalFarmProvince as string | number | null },
        { column: 'farm_zip_code', value: finalFarmZipCode as string | number | null },
        { column: 'farm_latitude', value: finalFarmLatitude as string | number | null },
        { column: 'farm_longitude', value: finalFarmLongitude as string | number | null },
        { column: 'is_same_as_home', value: isSameAsHome ? 1 : 0 },
      ].filter((entry) => farmColumnsInDb.has(entry.column));

      if (farmUpdates.length > 0) {
        const [existingFarmRows]: any = await db.execute(
          'SELECT id FROM farms_table WHERE user_id = ? LIMIT 1',
          [userIdParam]
        );

        if ((existingFarmRows || []).length > 0) {
          await db.execute(
            `UPDATE farms_table
             SET ${farmUpdates.map((entry) => `${entry.column} = ?`).join(', ')}
             WHERE user_id = ?`,
            [...farmUpdates.map((entry) => entry.value), userIdParam]
          );
        } else {
          const insertColumns = ['user_id', ...farmUpdates.map((entry) => entry.column)];
          const insertValues: Array<string | number | null> = [
            userIdParam as unknown as string | number,
            ...farmUpdates.map((entry) => entry.value),
          ];
          await db.execute(
            `INSERT INTO farms_table (${insertColumns.join(', ')})
             VALUES (${insertColumns.map(() => '?').join(', ')})`,
            insertValues
          );
        }
      }
    }

    return res.status(200).json({ message: 'Normalized onboarding completed' });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: err?.message || 'Error updating onboarding status in farms_table' });
  }
};

export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const userIdParam = Array.isArray(userId) ? userId[0] : userId;
    if (!userIdParam) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    if (!ensureAuthorizedUserAccess(req, userIdParam).allowed) {
      return res.status(403).json({ message: 'You are not allowed to view this user.' });
    }
    await notificationService.ensureNotificationPreferenceColumns();
    const includeFarmImage = await ensureFarmImageColumn();
    const includeBio = await hasColumn('users_table', 'bio');
    const includeRole = await hasColumn('users_table', 'role');
    const includeLegacyFarmName = await hasColumn('users_table', 'farm_name');
    const includeLegacyFarmAddress = await hasColumn('users_table', 'farm_address');
    const includeLegacyFarmCity = await hasColumn('users_table', 'farm_city');
    const includeLegacyFarmProvince = await hasColumn('users_table', 'farm_province');
    const includeLegacyFarmZip = await hasColumn('users_table', 'farm_zip_code');
    const includeLegacyFarmLat = await hasColumn('users_table', 'farm_latitude');
    const includeLegacyFarmLng = await hasColumn('users_table', 'farm_longitude');
    const includeLegacyFarmSameAsHome = await hasColumn('users_table', 'farm_address_same_as_home');

    const farmNameExpr = includeLegacyFarmName ? 'COALESCE(f.farm_name, u.farm_name) AS farm_name' : 'f.farm_name';
    const farmAddressExpr = includeLegacyFarmAddress
      ? 'COALESCE(f.farm_address, u.farm_address) AS farm_address'
      : 'f.farm_address';
    const farmCityExpr = includeLegacyFarmCity ? 'COALESCE(f.farm_city, u.farm_city) AS farm_city' : 'f.farm_city';
    const farmProvinceExpr = includeLegacyFarmProvince
      ? 'COALESCE(f.farm_province, u.farm_province) AS farm_province'
      : 'f.farm_province';
    const farmZipExpr = includeLegacyFarmZip
      ? 'COALESCE(f.farm_zip_code, u.farm_zip_code) AS farm_zip_code'
      : 'f.farm_zip_code';
    const farmLatExpr = includeLegacyFarmLat
      ? 'COALESCE(f.farm_latitude, u.farm_latitude) AS farm_latitude'
      : 'f.farm_latitude';
    const farmLngExpr = includeLegacyFarmLng
      ? 'COALESCE(f.farm_longitude, u.farm_longitude) AS farm_longitude'
      : 'f.farm_longitude';
    const farmSameAsHomeExpr = includeLegacyFarmSameAsHome
      ? 'COALESCE(f.is_same_as_home, u.farm_address_same_as_home) as farm_address_same_as_home'
      : 'f.is_same_as_home as farm_address_same_as_home';

    const [users]: any = await db.execute(
      `SELECT 
              u.*,
              a.email,
              ${includeRole ? 'u.role' : 'r.role_name AS role'},
              ${farmNameExpr}, ${farmAddressExpr}, ${farmCityExpr}, ${farmProvinceExpr}, 
              ${farmZipExpr}, ${farmLatExpr}, ${farmLngExpr}, ${farmSameAsHomeExpr}
              ${includeBio ? ', u.bio' : ''}
              ${includeFarmImage ? ', f.farm_image' : ''}
       FROM users_table u
       LEFT JOIN auth_table a ON u.auth_id = a.id
       LEFT JOIN role_table r ON a.role_id = r.id
       LEFT JOIN farms_table f ON u.id = f.user_id
       WHERE u.id = ?`,
      [userIdParam]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found in normalized view' });
    }

    const galleryImages = await getFarmGalleryImages(Number(userIdParam));
    const badges = await getBadgesByUserId(Number(userIdParam));

    return res.status(200).json({
      ...users[0],
      farm_gallery_images: galleryImages,
      badges,
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: 'Error fetching user profile' });
  }
};

export const getAlertPreferences = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const userIdParam = Array.isArray(userId) ? userId[0] : userId;
    if (!userIdParam) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    if (!ensureAuthorizedUserAccess(req, userIdParam).allowed) {
      return res.status(403).json({ message: 'You are not allowed to view this user.' });
    }

    await notificationService.ensureNotificationPreferenceColumns();
    const [rows]: any = await db.execute(
      `SELECT COALESCE(notify_orders, 1) AS notify_orders, COALESCE(notify_messages, 1) AS notify_messages
       FROM users_table
       WHERE id = ?
       LIMIT 1`,
      [userIdParam]
    );

    const row = rows?.[0];
    return res.status(200).json({
      orders: Number(row?.notify_orders ?? 1) === 1,
      messages: Number(row?.notify_messages ?? 1) === 1,
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: 'Error fetching alert preferences' });
  }
};

export const updateAlertPreferences = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const userIdParam = Array.isArray(userId) ? userId[0] : userId;
    if (!userIdParam) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    if (!ensureAuthorizedUserAccess(req, userIdParam).allowed) {
      return res.status(403).json({ message: 'You are not allowed to update this user.' });
    }

    const orders = asBinaryFlag((req.body as any)?.orders, 1);
    const messages = asBinaryFlag((req.body as any)?.messages, 1);

    await notificationService.ensureNotificationPreferenceColumns();
    await db.execute(
      `UPDATE users_table
       SET notify_orders = ?, notify_messages = ?
       WHERE id = ?`,
      [orders, messages, userIdParam]
    );

    return res.status(200).json({
      message: 'Alert preferences updated.',
      preferences: {
        orders: orders === 1,
        messages: messages === 1,
      },
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: 'Error updating alert preferences' });
  }
};

export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const userIdParam = Array.isArray(userId) ? userId[0] : userId;
    const {
      first_name, last_name, phone, address, city, province, zip_code,
      latitude, longitude,
      farm_name,
      farm_address, farm_city, farm_province, farm_zip_code,
      farm_latitude, farm_longitude, farm_address_same_as_home
    } = req.body;
    await ensureProfileImageColumn();
    const userColumns = await getTableColumns('users_table');
    await ensureFarmImageColumn();
    const farmColumnsInDb = await getTableColumns('farms_table');
    const hasFarmsTable = farmColumnsInDb.size > 0;
    const files = (req.files || {}) as Record<string, Express.Multer.File[]>;
    const farmImageFile = files?.farm_image?.[0];
    const farmGalleryFiles = files?.farm_gallery_images || [];
    const profileImageFile = files?.profile_image?.[0];
    const farmImagePath = farmImageFile ? `/uploads/${farmImageFile.filename}` : undefined;
    const profileImagePath = profileImageFile ? `/uploads/${profileImageFile.filename}` : undefined;

    if (!userIdParam) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    if (!ensureAuthorizedUserAccess(req, userIdParam).allowed) {
      return res.status(403).json({ message: 'You are not allowed to update this user.' });
    }
    const userIdValue = String(userIdParam);
    const [roleRows]: any = await db.execute(
      `SELECT LOWER(COALESCE(role, '')) AS role
       FROM users_table
       WHERE id = ?
       LIMIT 1`,
      [userIdValue]
    );
    const targetRole = String(roleRows?.[0]?.role || '').toLowerCase();
    const isFarmerTarget = targetRole === 'farmer';

    // Update core table
    const safeFirstName = asNullable(first_name);
    const safeLastName = asNullable(last_name);
    const normalizedPhone = phone !== undefined ? String(phone ?? '').replace(/\D/g, '') : undefined;
    const safeAddress = asNullable(address);
    const safeCity = isFarmerTarget ? 'Minglanilla' : asNullable(city);
    const safeProvince = isFarmerTarget ? 'Cebu' : asNullable(province);
    const safeZipCode = isFarmerTarget ? '6046' : asNullable(zip_code);
    const safeLatitude = asNullable(latitude);
    const safeLongitude = asNullable(longitude);
    const safeBio = asNullable((req.body as any).bio);

    if (phone !== undefined) {
      if ((normalizedPhone || '').length !== 11) {
        return res.status(400).json({ message: 'Mobile number must be exactly 11 digits.' });
      }
    }

    // if (safeFirstName === null || safeLastName === null) {
    //   return res.status(400).json({ message: 'First name and last name are required' });
    // }

    const userUpdates: Array<{ column: string; value: string | number | null | undefined }> = [];
    if (first_name !== undefined) userUpdates.push({ column: 'first_name', value: asNullable(first_name) });
    if (last_name !== undefined) userUpdates.push({ column: 'last_name', value: asNullable(last_name) });
    if (phone !== undefined) userUpdates.push({ column: 'phone', value: normalizedPhone });
    if (address !== undefined) userUpdates.push({ column: 'address', value: asNullable(address) });
    if (isFarmerTarget) {
      userUpdates.push({ column: 'city', value: 'Minglanilla' });
      userUpdates.push({ column: 'province', value: 'Cebu' });
      userUpdates.push({ column: 'zip_code', value: '6046' });
    } else {
      if (city !== undefined) userUpdates.push({ column: 'city', value: asNullable(city) });
      if (province !== undefined) userUpdates.push({ column: 'province', value: asNullable(province) });
      if (zip_code !== undefined) userUpdates.push({ column: 'zip_code', value: asNullable(zip_code) });
    }
    if (latitude !== undefined) userUpdates.push({ column: 'latitude', value: asNullable(latitude) });
    if (longitude !== undefined) userUpdates.push({ column: 'longitude', value: asNullable(longitude) });
    if (req.body.bio !== undefined) userUpdates.push({ column: 'bio', value: asNullable(req.body.bio) });

    if (profileImagePath) {
      // Persist profile photo in canonical column when available, fallback to legacy schema.
      if (userColumns.has('profile_image')) {
        userUpdates.push({ column: 'profile_image', value: profileImagePath });
      } else if (userColumns.has('image_path')) {
        userUpdates.push({ column: 'image_path', value: profileImagePath });
      }
    }

    const filteredUserUpdates = userUpdates.filter(({ column }) => userColumns.has(column));
    const persistedProfileImage =
      profileImagePath && (userColumns.has('profile_image') || userColumns.has('image_path'))
        ? profileImagePath
        : undefined;

    if (filteredUserUpdates.length > 0) {
      await db.execute(
        `UPDATE users_table 
         SET ${filteredUserUpdates.map((u) => `${u.column} = ?`).join(', ')}
         WHERE id = ?`,
        [...filteredUserUpdates.map((u) => u.value as string | number | null), userIdValue]
      );
    }

    // Update farm detail in separate table
    const isSameAsHome = normalizeBoolean(farm_address_same_as_home, true);
    const safeFarmName = asNullable(farm_name);
    const finalFarmAddress = isSameAsHome 
      ? (address !== undefined ? safeAddress : undefined) 
      : (farm_address !== undefined ? asNullable(farm_address) : undefined);
    const finalFarmCity = isFarmerTarget
      ? 'Minglanilla'
      : isSameAsHome
        ? (city !== undefined ? safeCity : undefined)
        : (farm_city !== undefined ? asNullable(farm_city) : undefined);
    const finalFarmProvince = isFarmerTarget
      ? 'Cebu'
      : isSameAsHome
        ? (province !== undefined ? safeProvince : undefined)
        : (farm_province !== undefined ? asNullable(farm_province) : undefined);
    const finalFarmZipCode = isFarmerTarget
      ? '6046'
      : isSameAsHome
        ? (zip_code !== undefined ? safeZipCode : undefined)
        : (farm_zip_code !== undefined ? asNullable(farm_zip_code) : undefined);
    const finalFarmLatitude = isSameAsHome 
      ? (latitude !== undefined ? safeLatitude : undefined) 
      : (farm_latitude !== undefined ? asNullable(farm_latitude) : undefined);
    const finalFarmLongitude = isSameAsHome 
      ? (longitude !== undefined ? safeLongitude : undefined) 
      : (farm_longitude !== undefined ? asNullable(farm_longitude) : undefined);
    const hasFarmAddressModeInput = (req.body as any).farm_address_same_as_home !== undefined;

    const hasFarmInput =
      hasFarmAddressModeInput ||
      safeFarmName !== null ||
      asNullable(farm_address) !== null ||
      asNullable(farm_city) !== null ||
      asNullable(farm_province) !== null ||
      asNullable(farm_zip_code) !== null ||
      asNullable(farm_latitude) !== null ||
      asNullable(farm_longitude) !== null ||
      farmImagePath !== undefined ||
      farmGalleryFiles.length > 0;

    if (!isSameAsHome && hasFarmInput) {
      if (finalFarmAddress === null || finalFarmCity === null || finalFarmProvince === null) {
        return res.status(400).json({
          message:
            'Farm address, city, and province are required when farm address is not the same as home address.',
        });
      }
    }

    const legacyFarmUpdates: Array<{ column: string; value: string | number | null | undefined }> = [
      { column: 'farm_name', value: safeFarmName },
      { column: 'farm_address', value: finalFarmAddress },
      { column: 'farm_city', value: finalFarmCity },
      { column: 'farm_province', value: finalFarmProvince },
      { column: 'farm_zip_code', value: finalFarmZipCode },
      { column: 'farm_latitude', value: finalFarmLatitude },
      { column: 'farm_longitude', value: finalFarmLongitude },
      { column: 'farm_address_same_as_home', value: isSameAsHome ? 1 : 0 },
    ];

    // Buyers commonly do not have a farms_table row. Skip farm upsert unless farmer or farm data is being provided.
    // Support both schemas:
    // 1) normalized farm data in farms_table
    // 2) legacy farm columns in users_table
    if (hasFarmsTable && hasFarmInput) {
      const farmEntries: Array<{ column: string; value: string | number | null | undefined }> = [];
      if (farm_name !== undefined) farmEntries.push({ column: 'farm_name', value: asNullable(farm_name) });
      if (finalFarmAddress !== undefined) farmEntries.push({ column: 'farm_address', value: asNullable(finalFarmAddress) });
      if (finalFarmCity !== undefined) farmEntries.push({ column: 'farm_city', value: asNullable(finalFarmCity) });
      if (finalFarmProvince !== undefined) farmEntries.push({ column: 'farm_province', value: asNullable(finalFarmProvince) });
      if (finalFarmZipCode !== undefined) farmEntries.push({ column: 'farm_zip_code', value: asNullable(finalFarmZipCode) });
      if (finalFarmLatitude !== undefined) farmEntries.push({ column: 'farm_latitude', value: asNullable(finalFarmLatitude) });
      if (finalFarmLongitude !== undefined) farmEntries.push({ column: 'farm_longitude', value: asNullable(finalFarmLongitude) });
      if (farm_address_same_as_home !== undefined) farmEntries.push({ column: 'is_same_as_home', value: isSameAsHome ? 1 : 0 });
      if (farmImagePath) farmEntries.push({ column: 'farm_image', value: farmImagePath });

      const filteredFarmEntries = farmEntries.filter(({ column }) => farmColumnsInDb.has(column));

      const filteredLegacyUpdates = legacyFarmUpdates.filter(
        (entry: { column: string; value: any }) => entry.value !== undefined && userColumns.has(entry.column)
      );
      
      const farmColumns = ['user_id', ...filteredFarmEntries.map((entry) => entry.column)];
      const farmValues: Array<string | number | null> = [userIdValue, ...filteredFarmEntries.map((entry) => entry.value as string | number | null)];
      const farmUpdates =
        filteredFarmEntries.length > 0
          ? filteredFarmEntries.map((entry) => `${entry.column} = VALUES(${entry.column})`)
          : ['user_id = user_id'];

      await db.execute(
        `INSERT INTO farms_table (${farmColumns.join(', ')})
         VALUES (${farmColumns.map(() => '?').join(', ')})
         ON DUPLICATE KEY UPDATE ${farmUpdates.join(', ')}`,
        farmValues
      );
    } else if (!hasFarmsTable && hasFarmInput) {
      const filteredLegacyUpdates = legacyFarmUpdates.filter(
        (entry) => entry.value !== undefined && userColumns.has(entry.column)
      );

      if (filteredLegacyUpdates.length > 0) {
        await db.execute(
          `UPDATE users_table
           SET ${filteredLegacyUpdates.map((entry: any) => `${entry.column} = ?`).join(', ')}
           WHERE id = ?`,
          [...filteredLegacyUpdates.map((entry: any) => entry.value as string | number | null), userIdValue]
        );
      }
    }

    if (farmGalleryFiles.length > 0) {
      await ensureFarmGalleryTable();

      const [existingRows]: any = await db.execute(
        'SELECT COALESCE(MAX(sort_order), 0) AS max_sort FROM farm_gallery_images WHERE user_id = ?',
        [userIdValue]
      );
      const startSort = Number(existingRows?.[0]?.max_sort || 0);

      for (let i = 0; i < farmGalleryFiles.length; i += 1) {
        const file = farmGalleryFiles[i];
        const imagePath = `/uploads/${file.filename}`;
        await db.execute(
          `INSERT INTO farm_gallery_images (user_id, image_path, sort_order)
           VALUES (?, ?, ?)`,
          [userIdValue, imagePath, startSort + i + 1]
        );
      }
    }

    const updatedGallery = await getFarmGalleryImages(userIdValue);
    const updatedBadges = await getBadgesByUserId(userIdValue);

    const userIdNum = Number(userIdValue);
    if (Number.isFinite(userIdNum) && userIdNum > 0) {
      const realtimePayload: Record<string, unknown> = {
        userId: userIdNum,
        first_name: safeFirstName,
        last_name: safeLastName,
        updated_at: Date.now(),
      };
      if (persistedProfileImage) {
        realtimePayload.profile_image = persistedProfileImage;
      }
      emitToAll('profile_updated', realtimePayload);
    }

    // System log: Profile update
    try {
      const { writeLog } = require('../services/systemLogService');
      const sessionUser = (req as any).user || {};
      writeLog({
        user_id: userIdValue, 
        user_name: `${first_name || ''} ${last_name || ''}`.trim() || 'User',
        user_role: sessionUser.role || 'user',
        action: 'Profile Update',
        event_type: 'update',
        module: 'User Management',
        description: `Profile information updated for user ID #${userIdValue}`,
        category: 'User',
        severity: 'info',
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
      }).catch(() => {});
    } catch (_) {}

    return res.status(200).json({
      message: 'Normalized profile updated successfully',
      ...(farmImagePath ? { farm_image: farmImagePath } : {}),
      ...(persistedProfileImage ? { profile_image: persistedProfileImage } : {}),
      farm_gallery_images: updatedGallery,
      badges: updatedBadges,
    });
  } catch (err: any) {
    // mysql2 errors often include `code` + `sqlMessage` (more useful than a generic message)
    console.error('[updateUserProfile] failed', err);
    const message =
      err?.sqlMessage ||
      err?.message ||
      (typeof err === 'string' ? err : undefined) ||
      'Error updating normalized profile';
    return res.status(500).json({ message });
  }
};

export const getPublicFarmerProfile = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const userIdParam = Array.isArray(userId) ? userId[0] : userId;
    const userIdValue = Number(userIdParam);

    if (!Number.isFinite(userIdValue) || userIdValue <= 0) {
      return res.status(400).json({ message: 'Invalid user ID.' });
    }

    const includeFarmImage = await ensureFarmImageColumn();
    const includeBio = await hasColumn('users_table', 'bio');
    const includeRole = await hasColumn('users_table', 'role');
    const includeProfileImage = await hasColumn('users_table', 'profile_image');
    const includeLegacyImagePath = await hasColumn('users_table', 'image_path');
    const includeOnboardingCompleted = await hasColumn('users_table', 'onboarding_completed');
    const includeEmailVerified = await hasColumn('auth_table', 'is_verified');
    const includeLegacyFarmName = await hasColumn('users_table', 'farm_name');
    const includeLegacyFarmAddress = await hasColumn('users_table', 'farm_address');
    const includeLegacyFarmCity = await hasColumn('users_table', 'farm_city');
    const includeLegacyFarmProvince = await hasColumn('users_table', 'farm_province');
    const includeLegacyFarmZip = await hasColumn('users_table', 'farm_zip_code');
    const includeLegacyFarmLat = await hasColumn('users_table', 'farm_latitude');
    const includeLegacyFarmLng = await hasColumn('users_table', 'farm_longitude');
    const includeLegacyFarmSameAsHome = await hasColumn('users_table', 'farm_address_same_as_home');

    const profileImageSelect =
      includeProfileImage && includeLegacyImagePath
        ? 'COALESCE(u.profile_image, u.image_path) AS profile_image'
        : includeProfileImage
          ? 'u.profile_image'
          : includeLegacyImagePath
            ? 'u.image_path AS profile_image'
            : 'NULL AS profile_image';
    const farmNameExpr = includeLegacyFarmName ? 'COALESCE(f.farm_name, u.farm_name) AS farm_name' : 'f.farm_name';
    const farmAddressExpr = includeLegacyFarmAddress
      ? 'COALESCE(f.farm_address, u.farm_address) AS farm_address'
      : 'f.farm_address';
    const farmCityExpr = includeLegacyFarmCity ? 'COALESCE(f.farm_city, u.farm_city) AS farm_city' : 'f.farm_city';
    const farmProvinceExpr = includeLegacyFarmProvince
      ? 'COALESCE(f.farm_province, u.farm_province) AS farm_province'
      : 'f.farm_province';
    const farmZipExpr = includeLegacyFarmZip
      ? 'COALESCE(f.farm_zip_code, u.farm_zip_code) AS farm_zip_code'
      : 'f.farm_zip_code';
    const farmLatExpr = includeLegacyFarmLat
      ? 'COALESCE(f.farm_latitude, u.farm_latitude) AS farm_latitude'
      : 'f.farm_latitude';
    const farmLngExpr = includeLegacyFarmLng
      ? 'COALESCE(f.farm_longitude, u.farm_longitude) AS farm_longitude'
      : 'f.farm_longitude';
    const farmSameAsHomeExpr = includeLegacyFarmSameAsHome
      ? 'COALESCE(f.is_same_as_home, u.farm_address_same_as_home) AS farm_address_same_as_home'
      : 'f.is_same_as_home AS farm_address_same_as_home';

    const [rows]: any = await db.execute(
      `SELECT
          u.id,
          u.first_name,
          u.last_name,
          ${profileImageSelect},
          u.phone,
          u.address,
          u.city,
          u.province,
          u.zip_code,
          u.created_at,
          ${includeOnboardingCompleted ? 'u.onboarding_completed,' : '1 AS onboarding_completed,'}
          ${includeEmailVerified ? 'a.is_verified,' : '1 AS is_verified,'}
          ${includeRole ? 'u.role' : 'r.role_name AS role'},
          u.latitude,
          u.longitude,
          ${includeBio ? 'u.bio,' : ''}
          ${includeFarmImage ? 'f.farm_image,' : ''}
          ${farmNameExpr},
          ${farmAddressExpr},
          ${farmCityExpr},
          ${farmProvinceExpr},
          ${farmZipExpr},
          ${farmLatExpr},
          ${farmLngExpr},
          ${farmSameAsHomeExpr}
       FROM users_table u
       LEFT JOIN auth_table a ON u.auth_id = a.id
       LEFT JOIN role_table r ON a.role_id = r.id
       LEFT JOIN farms_table f ON u.id = f.user_id
       WHERE u.id = ?
       LIMIT 1`,
      [userIdValue]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'Farmer profile not found.' });
    }

    const user = rows[0];

    const farmGalleryImages = await getFarmGalleryImages(userIdValue);

    await ensureFarmerServiceReviewTable();

    const [ratingRows]: any = await db.execute(
      `SELECT
          COALESCE(AVG(fsr.rating), 0) AS avg_rating,
          COUNT(fsr.fsr_id) AS review_count
       FROM farmer_service_reviews fsr
       WHERE fsr.farmer_id = ?`,
      [userIdValue]
    );
    const avgRating = Number(ratingRows?.[0]?.avg_rating || 0);
    const reviewCount = Number(ratingRows?.[0]?.review_count || 0);

    const [salesRows]: any = await db.execute(
      `SELECT
          COUNT(pt.req_id) AS completed_orders,
          COALESCE(SUM(pt.quantity), 0) AS completed_units
       FROM purchase_table pt
       JOIN product_table p ON pt.product_id = p.p_id
       WHERE p.u_id = ? AND pt.req_status = 'Completed'`,
      [userIdValue]
    );
    const completedOrders = Number(salesRows?.[0]?.completed_orders || 0);
    const completedUnits = Number(salesRows?.[0]?.completed_units || 0);

    const [recentReviews]: any = await db.execute(
      `SELECT
          fsr.fsr_id,
          fsr.req_id,
          fsr.rating,
          fsr.comment,
          fsr.created_at,
          fsr.product_name_snapshot AS product_name,
          u.first_name,
          u.last_name
       FROM farmer_service_reviews fsr
       JOIN users_table u ON fsr.reviewer_id = u.id
       WHERE fsr.farmer_id = ?
       ORDER BY fsr.created_at DESC
       LIMIT 8`,
      [userIdValue]
    );

    const parsedFarmLat = Number(user.farm_latitude);
    const parsedFarmLng = Number(user.farm_longitude);
    const parsedHomeLat = Number(user.latitude);
    const parsedHomeLng = Number(user.longitude);
    const resolvedLat = Number.isFinite(parsedFarmLat)
      ? parsedFarmLat
      : Number.isFinite(parsedHomeLat)
        ? parsedHomeLat
        : null;
    const resolvedLng = Number.isFinite(parsedFarmLng)
      ? parsedFarmLng
      : Number.isFinite(parsedHomeLng)
        ? parsedHomeLng
        : null;

    const badges = await getBadgesByUserId(userIdValue);

    return res.status(200).json({
      ...user,
      resolved_farm_address: user.farm_address || user.address || null,
      resolved_farm_city: user.farm_city || user.city || null,
      resolved_farm_province: user.farm_province || user.province || null,
      resolved_farm_zip_code: user.farm_zip_code || user.zip_code || null,
      resolved_latitude: resolvedLat,
      resolved_longitude: resolvedLng,
      farm_gallery_images: farmGalleryImages,
      rating: {
        average: Number.isFinite(avgRating) ? avgRating : 0,
        count: Number.isFinite(reviewCount) ? reviewCount : 0,
      },
      sales: {
        completed_orders: Number.isFinite(completedOrders) ? completedOrders : 0,
        completed_units: Number.isFinite(completedUnits) ? completedUnits : 0,
      },
      reviews: Array.isArray(recentReviews) ? recentReviews : [],
      badges: badges,
      // Keeping this for backward compatibility if any component uses it, 
      // but moving to actual badges array above
      badge: badges.length > 0 ? {
        implemented: true,
        label: badges[0].badge_label,
        status: 'Active',
        description: badges[0].notes || 'Verified by local officials.'
      } : {
        implemented: false,
        label: 'Farmer Verification Badge',
        status: 'Unverified',
        description: 'This farmer has not yet been verified by local officials.',
      },
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: 'Error fetching public farmer profile.' });
  }
};

export const getMessagingContact = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const userIdParam = Array.isArray(userId) ? userId[0] : userId;
    const userIdValue = Number(userIdParam);

    if (!Number.isFinite(userIdValue) || userIdValue <= 0) {
      return res.status(400).json({ message: 'Invalid user ID.' });
    }

    const includeRole = await hasColumn('users_table', 'role');
    const includeProfileImage = await hasColumn('users_table', 'profile_image');
    const includeLegacyImagePath = await hasColumn('users_table', 'image_path');
    const includeOnboardingCompleted = await hasColumn('users_table', 'onboarding_completed');
    const includeEmailVerified = await hasColumn('auth_table', 'is_verified');

    const profileImageSelect =
      includeProfileImage && includeLegacyImagePath
        ? 'COALESCE(u.profile_image, u.image_path) AS profile_image'
        : includeProfileImage
          ? 'u.profile_image'
          : includeLegacyImagePath
            ? 'u.image_path AS profile_image'
            : 'NULL AS profile_image';

    const [rows]: any = await db.execute(
      `SELECT
          u.id,
          u.first_name,
          u.last_name,
          ${profileImageSelect},
          u.phone,
          u.address,
          u.city,
          u.province,
          u.zip_code,
          ${includeOnboardingCompleted ? 'u.onboarding_completed' : '1 AS onboarding_completed'},
          ${includeEmailVerified ? 'a.is_verified' : '1 AS is_verified'},
          ${includeRole ? 'u.role' : 'r.role_name AS role'}
       FROM users_table u
       LEFT JOIN auth_table a ON u.auth_id = a.id
       LEFT JOIN role_table r ON a.role_id = r.id
       WHERE u.id = ?
       LIMIT 1`,
      [userIdValue]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.status(200).json(rows[0]);
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: 'Error fetching messaging contact.' });
  }
};

export const getAllFarmers = async (req: Request, res: Response) => {
  try {
    const includeLegacyFarmAddress = await hasColumn('users_table', 'farm_address');
    const includeLegacyFarmCity = await hasColumn('users_table', 'farm_city');
    const includeLegacyFarmProvince = await hasColumn('users_table', 'farm_province');
    const includeLegacyFarmLat = await hasColumn('users_table', 'farm_latitude');
    const includeLegacyFarmLng = await hasColumn('users_table', 'farm_longitude');
    const includeLegacyFarmSameAsHome = await hasColumn('users_table', 'farm_address_same_as_home');
    const includeRole = await hasColumn('users_table', 'role');
    const includeOnboardingCompleted = await hasColumn('users_table', 'onboarding_completed');

    const includeProfileImage = await hasColumn('users_table', 'profile_image');
    const includeLegacyImagePath = await hasColumn('users_table', 'image_path');
    const farmAddressExpr = includeLegacyFarmAddress
      ? 'COALESCE(f.farm_address, u.farm_address) AS farm_address'
      : 'f.farm_address';
    const farmCityExpr = includeLegacyFarmCity ? 'COALESCE(f.farm_city, u.farm_city) AS farm_city' : 'f.farm_city';
    const farmProvinceExpr = includeLegacyFarmProvince
      ? 'COALESCE(f.farm_province, u.farm_province) AS farm_province'
      : 'f.farm_province';
    const farmLatExpr = includeLegacyFarmLat
      ? 'COALESCE(f.farm_latitude, u.farm_latitude) AS farm_latitude'
      : 'f.farm_latitude';
    const farmLngExpr = includeLegacyFarmLng
      ? 'COALESCE(f.farm_longitude, u.farm_longitude) AS farm_longitude'
      : 'f.farm_longitude';
    const farmSameAsHomeExpr = includeLegacyFarmSameAsHome
      ? 'COALESCE(f.is_same_as_home, u.farm_address_same_as_home) as farm_address_same_as_home'
      : 'f.is_same_as_home as farm_address_same_as_home';

    const profileImageSelect =
      includeProfileImage && includeLegacyImagePath
        ? 'COALESCE(u.profile_image, u.image_path) AS profile_image'
        : includeProfileImage
          ? 'u.profile_image'
          : includeLegacyImagePath
            ? 'u.image_path AS profile_image'
            : 'NULL AS profile_image';

    const [farmers]: any = await db.execute(
      `SELECT u.id, u.first_name, u.last_name, 
              u.address, u.city, u.province,
              u.latitude, u.longitude,
              u.phone,
              ${profileImageSelect},
              f.farm_image,
              ${farmAddressExpr}, ${farmCityExpr}, ${farmProvinceExpr},
              ${farmLatExpr}, ${farmLngExpr},
              ${farmSameAsHomeExpr},
              (SELECT COALESCE(AVG(fsr.rating), 0) FROM farmer_service_reviews fsr WHERE fsr.farmer_id = u.id) as avg_rating,
              (SELECT COUNT(*) FROM farmer_service_reviews fsr WHERE fsr.farmer_id = u.id) as review_count,
              (SELECT badge_label FROM farmer_badges fb WHERE fb.farmer_id = u.id AND fb.revoked_at IS NULL LIMIT 1) as badge_label
       FROM users_table u
       LEFT JOIN auth_table a ON u.auth_id = a.id
       LEFT JOIN role_table r ON a.role_id = r.id
       LEFT JOIN farms_table f ON u.id = f.user_id
       WHERE (${includeRole ? "u.role = 'farmer'" : "LOWER(COALESCE(r.role_name, '')) = 'farmer'"})
         OR (${includeRole ? "u.role = 'Farmer'" : "1=0"})`
    );

    // Map to return the effective farm location
    const mapped = farmers.map((f: any) => {
      // Prioritize farm coordinates, then home coordinates
      let lat = parseFloat(f.farm_latitude || f.latitude);
      let lng = parseFloat(f.farm_longitude || f.longitude);

      // Fallback to Minglanilla center if coordinates are missing or explicitly 0
      if (!lat || isNaN(lat) || lat === 0) lat = 10.245;
      if (!lng || isNaN(lng) || lng === 0) lng = 123.792;

      return {
        id: f.id,
        name: `${f.first_name || ''} ${f.last_name || ''}`.trim(),
        first_name: f.first_name,
        last_name: f.last_name,
        farm_address: f.farm_address || f.address,
        farm_city: f.farm_city || f.city,
        farm_province: f.farm_province || f.province,
        latitude: lat,
        longitude: lng,
        phone: f.phone,
        profile_image: f.profile_image,
        farm_image: f.farm_image,
        rating: parseFloat(f.avg_rating) || 0,
        review_count: parseInt(f.review_count) || 0,
        badge_label: f.badge_label || null
      };
    });

    return res.status(200).json(mapped);
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: 'Error fetching farmers' });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const sessionUser = (req as any).user || {};
    const role = String(sessionUser.role || '').toLowerCase();
    const isBrgy = role === 'brgy_official';
    const isFarmer = role === 'farmer';
    const isAdmin = role === 'admin';

    if (!isBrgy && !isAdmin) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const includeRole = await hasColumn('users_table', 'role');
    const includeProfileImage = await hasColumn('users_table', 'profile_image');
    const includeLegacyImagePath = await hasColumn('users_table', 'image_path');
    const hasStatusCol = await hasColumn('auth_table', 'status');

    if (!hasStatusCol) {
      await db.execute("ALTER TABLE auth_table ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'");
      invalidateTableColumns('auth_table');
    }

    const profileImageSelect =
      includeProfileImage && includeLegacyImagePath
        ? 'COALESCE(u.profile_image, u.image_path) AS profile_image'
        : includeProfileImage
          ? 'u.profile_image'
          : includeLegacyImagePath
            ? 'u.image_path AS profile_image'
            : 'NULL AS profile_image';

    // Farmer/Brgy can only see types relevant to them or all if they are managing.
    // However, the prompt says Farmer is responsible for creating accounts for brgy officials.
    // So farmer should be able to see Brgy officials.
    
    let query = `
      SELECT u.id, u.first_name, u.last_name, 
             u.role, u.city, u.province, u.created_at,
             a.email, COALESCE(a.status, 'active') as status,
             ${profileImageSelect}
      FROM users_table u
      LEFT JOIN auth_table a ON u.auth_id = a.id
      LEFT JOIN role_table r ON a.role_id = r.id
      WHERE u.role != 'admin'
      ORDER BY u.created_at DESC
    `;

    const [users]: any = await db.execute(query);
    
    const mapped = users.map((u: any) => ({
      id: u.id,
      name: `${u.first_name} ${u.last_name}`,
      firstName: u.first_name,
      lastName: u.last_name,
      email: u.email,
      type: u.role,
      location: `${u.city || ''}${u.city && u.province ? ', ' : ''}${u.province || ''}` || 'Not set',
      status: u.status,
      profile_image: u.profile_image
    }));

    return res.status(200).json(mapped);
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: 'Error fetching users' });
  }
};

export const inviteOfficial = async (req: Request, res: Response) => {
  try {
    const { email, brgy, magicLink } = req.body;
    if (!email || !magicLink) {
      return res.status(400).json({ message: 'Email and link are required' });
    }

    await sendEmail({
      to: email,
      subject: 'AgriLink - Official Account Access Invitation',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #eee; border-radius: 20px; padding: 40px; background-color: #fff;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #5ba409; margin: 0; font-size: 28px;">AgriLink</h1>
            <p style="color: #666; font-size: 14px; margin-top: 5px;">Empowering Communities Through Agriculture</p>
          </div>
          
          <h2 style="color: #333; font-size: 20px;">Role Invitation</h2>
          <p>You have been invited to join the AgriLink platform as a <strong>Barangay Official</strong> for <strong>${brgy}</strong>.</p>
          <p>This account will allow you to manage and verify local farmers and award badges within your community.</p>
          
          <div style="text-align: center; margin: 40px 0;">
            <a href="${magicLink}" style="background-color: #5ba409; color: white; padding: 18px 35px; text-decoration: none; border-radius: 15px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 10px rgba(91, 164, 9, 0.2);">Complete Your Registration</a>
          </div>
          
          <p style="font-size: 14px; color: #666;">If the button above does not work, please copy and paste the following link into your web browser:</p>
          <p style="font-size: 12px; color: #5ba409; word-break: break-all; background-color: #f9f9f9; padding: 15px; border-radius: 10px;">${magicLink}</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 40px 0;" />
          <p style="font-size: 12px; color: #999; text-align: center;">This is an automated invitation from the AgriLink Administrative Panel.</p>
        </div>
      `
    });

    // System log: official invitation
    const { writeLog } = require('../services/systemLogService');
    const sessionUser = (req as any).user || {};
    writeLog({
        user_id: sessionUser.id,
        user_name: sessionUser.firstName ? `${sessionUser.firstName} ${sessionUser.lastName}` : 'Admin',
        user_role: sessionUser.role || 'admin',
        action: 'Official Invitation Sent',
        event_type: 'invite',
        module: 'Administration',
        detail: `Invitation sent to ${email} for Barangay ${brgy}`,
        category: 'Security',
        severity: 'info',
        ip_address: req.ip,
        user_agent: req.headers['user-agent']
    }).catch(() => {});

    return res.status(200).json({ message: 'Invitation sent successfully' });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: 'Error sending invitation: ' + err.message });
  }
};

export const updateUserStatus = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { status } = req.body; // 'active', 'suspended', 'archived'
    const sessionUser = (req as any).user || {};
    const role = String(sessionUser.role || '').toLowerCase();

    if (role !== 'admin' && role !== 'brgy_official') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    // Status logic: 
    // In our current auth_table, we have is_verified. 
    // We might need a dedicated 'status' column in auth_table.
    // For now, let's assume we use a 'status' column if it exists, or just handle it logic-wise.
    
    const hasStatusCol = await hasColumn('auth_table', 'status');
    if (!hasStatusCol) {
      // If we don't have it, let's just mock it or add it.
      await db.execute("ALTER TABLE auth_table ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'");
    }

    await db.execute(
      `UPDATE auth_table a
       JOIN users_table u ON a.id = u.auth_id
       SET a.status = ?
       WHERE u.id = ?`,
      [status, userId]
    );

    // Fetch name for log detail
    try {
      const [targetRows]: any = await db.execute(
        'SELECT first_name, last_name, role FROM users_table WHERE id = ? LIMIT 1',
        [userId]
      );
      const targetName = targetRows[0]
        ? `${targetRows[0].first_name} ${targetRows[0].last_name}` 
        : `User #${userId}`;
      const targetRole = targetRows[0]?.role || 'user';
      const severityMap: Record<string, 'info'|'warning'|'error'> = {
        active: 'info',
        suspended: 'warning',
        archived: 'error'
      };
      await writeLog({
        user_name: `${sessionUser.firstName || ''} ${sessionUser.lastName || ''}`.trim() || 'Admin',
        user_role: role,
        action: `User Account ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        detail: `${targetName} (${targetRole}) account status changed to "${status}"`,
        category: 'Security',
        severity: severityMap[status] ?? 'info',
        ip_address: req.ip || '127.0.0.1'
      });
    } catch (_) {}

    return res.status(200).json({ message: `User status updated to ${status}` });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: 'Error updating user status' });
  }
};

export const getAdminStats = async (req: Request, res: Response) => {
  try {
    const sessionUser = (req as any).user || {};
    if (String(sessionUser.role || '').toLowerCase() !== 'admin') {
      return res.status(403).json({ message: 'Unauthorised' });
    }

    // 1. Total Earnings (Market Sales)
    const [earnings]: any = await db.execute(
      `SELECT COALESCE(SUM(pt.quantity * p.p_price), 0) as total
       FROM purchase_table pt
       JOIN product_table p ON pt.product_id = p.p_id
       WHERE pt.req_status = 'Completed'`
    );

    // 2. Total Orders
    const [orders]: any = await db.execute('SELECT COUNT(*) as count FROM purchase_table');

    // 3. Platform Users
    const [users]: any = await db.execute('SELECT COUNT(*) as count FROM users_table');

    // 4. Role Distribution
    const [distribution]: any = await db.execute(
      `SELECT r.role_name as type, COUNT(*) as count
       FROM users_table u
       JOIN auth_table a ON u.auth_id = a.id
       JOIN role_table r ON a.role_id = r.id
       GROUP BY r.role_name`
    );

    // 5. Active Users (Verified)
    const [active]: any = await db.execute(
      "SELECT COUNT(*) as count FROM auth_table WHERE COALESCE(status, 'active') = 'active'"
    );

    return res.status(200).json({
      revenue: earnings[0]?.total || 0,
      orders: orders[0]?.count || 0,
      users: users[0]?.count || 0,
      active: active[0]?.count || 0,
      distribution: distribution.map((d: any) => ({ type: d.type, count: d.count }))
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: 'Error fetching stats' });
  }
};

export const getAdminActivityHistory = async (req: Request, res: Response) => {
  try {
     const sessionUser = (req as any).user || {};
     if (String(sessionUser.role || '').toLowerCase() !== 'admin') {
       return res.status(403).json({ message: 'Unauthorised' });
     }

     // Fetch recent purchases as proxy for "activity"
     const [recent]: any = await db.execute(
       `SELECT pt.req_id, pt.req_status, pt.quantity, pt.req_date,
               p.p_name, p.p_price,
               bu.first_name as buyer_first, bu.last_name as buyer_last,
               fu.first_name as farmer_first, fu.last_name as farmer_last
        FROM purchase_table pt
        JOIN product_table p ON pt.product_id = p.p_id
        JOIN users_table bu ON pt.buyer_id = bu.id
        JOIN users_table fu ON p.u_id = fu.id
        ORDER BY pt.req_date DESC
        LIMIT 10`
     );

     const mapped = recent.map((r: any) => ({
       id: r.req_id,
       actor: `${r.buyer_first} ${r.buyer_last}`,
       farmer: `${r.farmer_first} ${r.farmer_last}`,
       type: r.req_status,
       amount: r.quantity * r.p_price,
       product: r.p_name,
       time: r.req_date,
     }));

     return res.status(200).json(mapped);
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: 'Error fetching activity' });
  }
};
