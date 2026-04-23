import { Request, Response } from 'express';
import { registerUser, loginUser, updatePassword, forgotPassword, resetPasswordByToken } from '../services/authService';
import jwt from 'jsonwebtoken';
import { db } from '../database/database';
import { getVerificationSuccessTemplate, getVerificationExpiredTemplate } from '../templates/webTemplates';
import { writeLog } from '../services/systemLogService';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;
const PASSWORD_COMPLEXITY_MESSAGE =
  'Your password must contain a mix of uppercase and lowercase letters, numbers, and special characters.';

const normalizeEmail = (value: unknown) => String(value ?? '').trim().toLowerCase();
const normalizeLoginIdentifier = (value: unknown) => {
  const raw = String(value ?? '').trim();
  if (raw.toLowerCase() === 'agrilink') return 'AgriLink';
  return raw.toLowerCase();
};

export const registerController = async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, role_name, city, province } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password || !role_name) {
      return res.status(400).json({ message: 'Email, password, and role are required' });
    }
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }
    if (!PASSWORD_COMPLEXITY_REGEX.test(String(password))) {
      return res.status(400).json({ message: PASSWORD_COMPLEXITY_MESSAGE });
    }

    const result = await registerUser({ email: normalizedEmail, password, firstName, lastName, role_name, city, province });

    // System log: new user registration
    writeLog({
      user_name: `${firstName || ''} ${lastName || ''}`.trim() || normalizedEmail,
      user_role: role_name || 'buyer',
      action: 'New User Registered',
      event_type: 'register',
      module: 'Authentication',
      detail: `Account created for ${normalizedEmail} with role "${role_name}"`,
      category: 'User',
      severity: 'info',
      ip_address: req.ip || '127.0.0.1',
      user_agent: req.headers['user-agent'],
    }).catch(() => {});

    return res.status(201).json({ message: 'User registered successfully', result });
  } catch (err: any) {
    console.error(err);
    if (err.message === 'Email already registered') {
      return res.status(409).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message || 'Service temporarily unavailable. Please try again later.' });
  }
};

export const updatePasswordController = async (req: Request, res: Response) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userFromToken = (req as any).user || {};
        let authId = Number(userFromToken.auth_id);
        const userId = Number(userFromToken.id);

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current and new passwords are required' });
        }
        if (String(newPassword).length < 8) {
            return res.status(400).json({ message: 'New password must be at least 8 characters.' });
        }
        if (!PASSWORD_COMPLEXITY_REGEX.test(String(newPassword))) {
            return res.status(400).json({ message: PASSWORD_COMPLEXITY_MESSAGE });
        }
        if (currentPassword === newPassword) {
            return res.status(400).json({ message: 'New password must be different from current password.' });
        }

        // Backward compatibility for tokens that may not include auth_id.
        if (!Number.isFinite(authId) || authId <= 0) {
            if (!Number.isFinite(userId) || userId <= 0) {
                return res.status(401).json({ message: 'Invalid session token.' });
            }
            const [rows]: any = await db.execute(
                'SELECT auth_id FROM users_table WHERE id = ? LIMIT 1',
                [userId]
            );
            authId = Number(rows?.[0]?.auth_id);
            if (!Number.isFinite(authId) || authId <= 0) {
                return res.status(404).json({ message: 'User not found' });
            }
        }

        const result = await updatePassword(authId, currentPassword, newPassword);
        return res.status(200).json(result);
    } catch (err: any) {
        console.error(err);
        const message = err.message || 'Error updating password';
        if (message === 'Current password is incorrect') {
            return res.status(401).json({ message });
        }
        if (message === 'User not found') {
            return res.status(404).json({ message });
        }
        return res.status(500).json({ message });
    }
};

export const checkEmailController = async (req: Request, res: Response) => {
  try {
    const normalizedEmail = normalizeEmail(req.query.email);
    if (!normalizedEmail) {
      return res.status(400).json({ message: 'Email is required' });
    }
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    const [existing]: any = await db.execute(
      'SELECT id FROM auth_table WHERE email = ?',
      [normalizedEmail]
    );

    return res.status(200).json({ exists: existing.length > 0 });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: 'Error checking email' });
  }
};

export const verifyController = async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    // Verify token
    const decoded: any = jwt.verify(token as string, process.env.JWT_SECRET || 'secret');
    const email = decoded.email;

    // Update the user's is_verified status in the database
    // Also fetch the role for auto-login
    const [users]: any = await db.execute(`
      SELECT a.id as auth_id, u.id as user_id, r.role_name, u.first_name, u.last_name, u.onboarding_completed
      FROM auth_table a 
      JOIN role_table r ON a.role_id = r.id 
      LEFT JOIN users_table u ON a.id = u.auth_id
      WHERE a.email = ?
    `, [email]);

    if (users.length === 0) {
      return res.status(404).json({ message: 'You are not registered' });
    }

    const user = users[0];
    const role = user.role_name.toLowerCase();

    await db.execute('UPDATE auth_table SET is_verified = 1 WHERE email = ?', [email]);

    // Generate a proper session JWT for auto-login
    const loginToken = jwt.sign(
      { id: user.user_id, email: email, role: role, firstName: user.first_name, lastName: user.last_name, onboarding_completed: user.onboarding_completed },
      process.env.JWT_SECRET || 'supersecretkey',
      { expiresIn: '1d' }
    );

    return res.send(getVerificationSuccessTemplate(loginToken, role, user.first_name, user.last_name, user.user_id));
  } catch (err: any) {
    console.error(err);
    if (err.name === 'TokenExpiredError') {
      return res.status(401).send(getVerificationExpiredTemplate());
    }
    return res.status(400).json({ message: 'Invalid token' });
  }
};

export const loginController = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeLoginIdentifier(email);
    const isAdminLoginKey = normalizedEmail === 'AgriLink';

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    if (!isAdminLoginKey && !EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }
    const result = await loginUser({ email: normalizedEmail, password });

    // System log: successful login
    writeLog({
      user_id:    result.id,
      user_name:  `${result.first_name || ''} ${result.last_name || ''}`.trim() || normalizedEmail,
      user_role:  result.role_name || 'user',
      action:     'User Login',
      event_type: 'login',
      module:     'Authentication',
      detail:     `Successful login for ${normalizedEmail}`,
      category:   'Security',
      severity:   'info',
      ip_address: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '127.0.0.1',
      user_agent: req.headers['user-agent'],
      http_status: 200,
    }).catch(() => {});

    // Generate session JWT
    const token = jwt.sign(
      {
        id: result.id,
        auth_id: result.auth_id,
        email: result.email,
        role: result.role_name,
        firstName: result.first_name,
        lastName: result.last_name,
        onboarding_completed: result.onboarding_completed
      },
      process.env.JWT_SECRET || 'supersecretkey',
      { expiresIn: '1d' }
    );

    return res.status(200).json({
      message: 'User logged in successfully',
      token,
      result
    });
  } catch (err: any) {
    console.error(err);
    const { email } = req.body || {};
    const isInvalidPassword = err.message === 'Invalid password';
    const isNotFound = err.message === 'User not found';

    // Security log: failed login attempts
    if (isInvalidPassword || isNotFound) {
      writeLog({
        user_name:  email || 'Unknown',
        user_role:  'anonymous',
        action:     'Failed Login Attempt',
        event_type: 'login',
        module:     'Authentication',
        detail:     isInvalidPassword
                      ? `Incorrect password for ${email}`
                      : `Login attempted for non-existent account: ${email}`,
        category:   'Security',
        severity:   'warning',
        ip_address: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '127.0.0.1',
        user_agent: req.headers['user-agent'],
        http_status: 401,
        error_message: err.message,
      }).catch(() => {});
    }

    if (isNotFound) {
      return res.status(401).json({ message: 'You are not registered' });
    }
    if (isInvalidPassword) {
      return res.status(401).json({ message: err.message });
    }
    if (err.message.includes('Please verify your email')) {
      return res.status(403).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message || 'Service temporarily unavailable. Please try again later.' });
  }
};

export const logoutController = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user || {};
    const userId = user.id;
    const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';

    // System log: logout
    writeLog({
      user_id:    userId,
      user_name:  userName,
      user_role:  user.role || 'user',
      action:     'User Logout',
      event_type: 'logout',
      module:     'Authentication',
      detail:     `Successful logout for ${userName}`,
      category:   'Security',
      severity:   'info',
      ip_address: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '127.0.0.1',
      user_agent: req.headers['user-agent'],
      http_status: 200,
    }).catch(() => {});

    return res.status(200).json({ message: 'Logged out' });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: 'Error during logout' });
  }
};

export const forgotPasswordController = async (req: Request, res: Response) => {
  try {
    const normalizedEmail = normalizeEmail(req.body?.email);
    if (!normalizedEmail) return res.status(400).json({ message: 'Email is required' });
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    await forgotPassword(normalizedEmail);
    
    // Audit Log
    writeLog({
      user_name: normalizedEmail,
      user_role: 'anonymous',
      action: 'Password Reset Requested',
      event_type: 'security',
      module: 'Authentication',
      category: 'Security',
      severity: 'info',
      ip_address: req.ip,
    }).catch(() => {});

    return res.status(200).json({ message: 'If that email is in our system, a reset link has been sent.' });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: 'Error processing request' });
  }
};

export const resetPasswordByTokenController = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ message: 'Token and new password required' });
    if (!PASSWORD_COMPLEXITY_REGEX.test(String(newPassword))) {
      return res.status(400).json({ message: PASSWORD_COMPLEXITY_MESSAGE });
    }

    await resetPasswordByToken(token, newPassword);

    // Audit Log
    writeLog({
      user_name: 'System',
      user_role: 'User',
      action: 'Password Successfully Reset',
      event_type: 'security',
      module: 'Authentication',
      category: 'Security',
      severity: 'success',
      ip_address: req.ip,
    }).catch(() => {});

    return res.status(200).json({ message: 'Password has been reset successfully.' });
  } catch (err: any) {
    console.error(err);
    if (err.name === 'TokenExpiredError') return res.status(400).json({ message: 'Reset link has expired.' });
    return res.status(400).json({ message: 'Invalid or expired reset token.' });
  }
};
