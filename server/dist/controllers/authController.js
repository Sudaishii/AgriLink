"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordByTokenController = exports.forgotPasswordController = exports.logoutController = exports.loginController = exports.verifyController = exports.checkEmailController = exports.updatePasswordController = exports.registerController = void 0;
const authService_1 = require("../services/authService");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../database/database");
const webTemplates_1 = require("../templates/webTemplates");
const systemLogService_1 = require("../services/systemLogService");
const registerController = async (req, res) => {
    try {
        const { email, password, firstName, lastName, role_name, city, province } = req.body;
        if (!email || !password || !role_name) {
            return res.status(400).json({ message: 'Email, password, and role are required' });
        }
        const result = await (0, authService_1.registerUser)({ email, password, firstName, lastName, role_name, city, province });
        // System log: new user registration
        (0, systemLogService_1.writeLog)({
            user_name: `${firstName || ''} ${lastName || ''}`.trim() || email,
            user_role: role_name || 'buyer',
            action: 'New User Registered',
            event_type: 'register',
            module: 'Authentication',
            detail: `Account created for ${email} with role "${role_name}"`,
            category: 'User',
            severity: 'info',
            ip_address: req.ip || '127.0.0.1',
            user_agent: req.headers['user-agent'],
        }).catch(() => { });
        return res.status(201).json({ message: 'User registered successfully', result });
    }
    catch (err) {
        console.error(err);
        if (err.message === 'Email already registered') {
            return res.status(409).json({ message: err.message });
        }
        return res.status(500).json({ message: err.message || 'Service temporarily unavailable. Please try again later.' });
    }
};
exports.registerController = registerController;
const updatePasswordController = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userFromToken = req.user || {};
        let authId = Number(userFromToken.auth_id);
        const userId = Number(userFromToken.id);
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current and new passwords are required' });
        }
        if (String(newPassword).length < 8) {
            return res.status(400).json({ message: 'New password must be at least 8 characters.' });
        }
        if (currentPassword === newPassword) {
            return res.status(400).json({ message: 'New password must be different from current password.' });
        }
        // Backward compatibility for tokens that may not include auth_id.
        if (!Number.isFinite(authId) || authId <= 0) {
            if (!Number.isFinite(userId) || userId <= 0) {
                return res.status(401).json({ message: 'Invalid session token.' });
            }
            const [rows] = await database_1.db.execute('SELECT auth_id FROM users_table WHERE id = ? LIMIT 1', [userId]);
            authId = Number(rows?.[0]?.auth_id);
            if (!Number.isFinite(authId) || authId <= 0) {
                return res.status(404).json({ message: 'User not found' });
            }
        }
        const result = await (0, authService_1.updatePassword)(authId, currentPassword, newPassword);
        return res.status(200).json(result);
    }
    catch (err) {
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
exports.updatePasswordController = updatePasswordController;
const checkEmailController = async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }
        const [existing] = await database_1.db.execute('SELECT id FROM auth_table WHERE email = ?', [email]);
        return res.status(200).json({ exists: existing.length > 0 });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error checking email' });
    }
};
exports.checkEmailController = checkEmailController;
const verifyController = async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) {
            return res.status(400).json({ message: 'Token is required' });
        }
        // Verify token
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
        const email = decoded.email;
        // Update the user's is_verified status in the database
        // Also fetch the role for auto-login
        const [users] = await database_1.db.execute(`
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
        await database_1.db.execute('UPDATE auth_table SET is_verified = 1 WHERE email = ?', [email]);
        // Generate a proper session JWT for auto-login
        const loginToken = jsonwebtoken_1.default.sign({ id: user.user_id, email: email, role: role, firstName: user.first_name, lastName: user.last_name, onboarding_completed: user.onboarding_completed }, process.env.JWT_SECRET || 'supersecretkey', { expiresIn: '1d' });
        return res.send((0, webTemplates_1.getVerificationSuccessTemplate)(loginToken, role, user.first_name, user.last_name, user.user_id));
    }
    catch (err) {
        console.error(err);
        if (err.name === 'TokenExpiredError') {
            return res.status(401).send((0, webTemplates_1.getVerificationExpiredTemplate)());
        }
        return res.status(400).json({ message: 'Invalid token' });
    }
};
exports.verifyController = verifyController;
const loginController = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        const result = await (0, authService_1.loginUser)({ email, password });
        // System log: successful login
        (0, systemLogService_1.writeLog)({
            user_id: result.id,
            user_name: `${result.first_name || ''} ${result.last_name || ''}`.trim() || email,
            user_role: result.role_name || 'user',
            action: 'User Login',
            event_type: 'login',
            module: 'Authentication',
            detail: `Successful login for ${email}`,
            category: 'Security',
            severity: 'info',
            ip_address: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '127.0.0.1',
            user_agent: req.headers['user-agent'],
            http_status: 200,
        }).catch(() => { });
        // Generate session JWT
        const token = jsonwebtoken_1.default.sign({
            id: result.id,
            auth_id: result.auth_id,
            email: result.email,
            role: result.role_name,
            firstName: result.first_name,
            lastName: result.last_name,
            onboarding_completed: result.onboarding_completed
        }, process.env.JWT_SECRET || 'supersecretkey', { expiresIn: '1d' });
        return res.status(200).json({
            message: 'User logged in successfully',
            token,
            result
        });
    }
    catch (err) {
        console.error(err);
        const { email } = req.body || {};
        const isInvalidPassword = err.message === 'Invalid password';
        const isNotFound = err.message === 'User not found';
        // Security log: failed login attempts
        if (isInvalidPassword || isNotFound) {
            (0, systemLogService_1.writeLog)({
                user_name: email || 'Unknown',
                user_role: 'anonymous',
                action: 'Failed Login Attempt',
                event_type: 'login',
                module: 'Authentication',
                detail: isInvalidPassword
                    ? `Incorrect password for ${email}`
                    : `Login attempted for non-existent account: ${email}`,
                category: 'Security',
                severity: 'warning',
                ip_address: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '127.0.0.1',
                user_agent: req.headers['user-agent'],
                http_status: 401,
                error_message: err.message,
            }).catch(() => { });
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
exports.loginController = loginController;
const logoutController = async (req, res) => {
    try {
        const user = req.user || {};
        const userId = user.id;
        const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';
        // System log: logout
        (0, systemLogService_1.writeLog)({
            user_id: userId,
            user_name: userName,
            user_role: user.role || 'user',
            action: 'User Logout',
            event_type: 'logout',
            module: 'Authentication',
            detail: `Successful logout for ${userName}`,
            category: 'Security',
            severity: 'info',
            ip_address: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '127.0.0.1',
            user_agent: req.headers['user-agent'],
            http_status: 200,
        }).catch(() => { });
        return res.status(200).json({ message: 'Logged out' });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error during logout' });
    }
};
exports.logoutController = logoutController;
const forgotPasswordController = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email)
            return res.status(400).json({ message: 'Email is required' });
        await (0, authService_1.forgotPassword)(email);
        // Audit Log
        (0, systemLogService_1.writeLog)({
            user_name: email,
            user_role: 'anonymous',
            action: 'Password Reset Requested',
            event_type: 'security',
            module: 'Authentication',
            category: 'Security',
            severity: 'info',
            ip_address: req.ip,
        }).catch(() => { });
        return res.status(200).json({ message: 'If that email is in our system, a reset link has been sent.' });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Error processing request' });
    }
};
exports.forgotPasswordController = forgotPasswordController;
const resetPasswordByTokenController = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword)
            return res.status(400).json({ message: 'Token and new password required' });
        await (0, authService_1.resetPasswordByToken)(token, newPassword);
        // Audit Log
        (0, systemLogService_1.writeLog)({
            user_name: 'System',
            user_role: 'User',
            action: 'Password Successfully Reset',
            event_type: 'security',
            module: 'Authentication',
            category: 'Security',
            severity: 'success',
            ip_address: req.ip,
        }).catch(() => { });
        return res.status(200).json({ message: 'Password has been reset successfully.' });
    }
    catch (err) {
        console.error(err);
        if (err.name === 'TokenExpiredError')
            return res.status(400).json({ message: 'Reset link has expired.' });
        return res.status(400).json({ message: 'Invalid or expired reset token.' });
    }
};
exports.resetPasswordByTokenController = resetPasswordByTokenController;
