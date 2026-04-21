import { hashPassword, comparedPassword } from '../utils/hash';
import { db } from '../database/database';
import { sendEmail } from './emailService';
import jwt from 'jsonwebtoken';
import { getEmailVerificationTemplate } from '../templates/emailTemplates';


export interface RegisterInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role_name: string;
  city?: string;
  province?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}


export const registerUser = async (data: RegisterInput) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Check if email exists in auth_table
    const [existingUser] = await connection.execute(
      'SELECT id FROM auth_table WHERE email = ?',
      [data.email]
    );

    if ((existingUser as any[]).length > 0) {
      throw new Error('Email already registered');
    }

    // 2. Lookup role_id from role_table
    const [roles] = await connection.execute(
      'SELECT id FROM role_table WHERE role_name = ?',
      [data.role_name]
    );

    if ((roles as any[]).length === 0) {
      throw new Error(`Invalid role specified: ${data.role_name}`);
    }
    const roleId = (roles as any[])[0].id;

    // 3. Hash the password
    const password_hash = await hashPassword(data.password);

    // 4. Insert into auth_table
    const [authResult] = await connection.execute(
      'INSERT INTO auth_table (email, password_hash, role_id) VALUES (?, ?, ?)',
      [data.email, password_hash, roleId]
    );

    const authId = (authResult as any).insertId;

    // 5. Insert into users_table
    const [userResult] = await connection.execute(
      'INSERT INTO users_table (auth_id, first_name, last_name, role, city, province) VALUES (?, ?, ?, ?, ?, ?)',
      [authId, data.firstName || '', data.lastName || '', data.role_name, data.city || '', data.province || '']
    );

    const userId = (userResult as any).insertId;

    await connection.commit();


    const verificationToken = jwt.sign(
      { email: data.email, userId: authId },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '10m' }
    );

    const confirmationURL = `http://localhost:${process.env.PORT || 5002}/api/auth/verify?token=${verificationToken}`;


    const logoUrl = process.env.LOGO_URL || 'https://osgogrbrjlnslgdinhgl.supabase.co/storage/v1/object/public/email-assets/AgriLinkGREEN.png';
    const emailHtml = getEmailVerificationTemplate(confirmationURL, logoUrl);

    console.log('Registering user, preparing email for:', data.email);

    sendEmail({
      to: data.email,
      subject: 'Welcome to AgriLink! Please Confirm Your Email',
      html: emailHtml
    })
      .then(info => console.log('EmailService response in authService:', info?.messageId))
      .catch(err => console.error('CRITICAL: Failed to send welcome email in authService catch:', err));

    return { id: userId, authId, email: data.email };

  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

export const loginUser = async (data: LoginInput) => {
  const [users]: any = await db.execute(
    `SELECT a.id as auth_id, u.id as user_id, a.password_hash, a.is_verified, r.role_name, u.first_name, u.last_name, u.onboarding_completed
     FROM auth_table a 
     JOIN role_table r ON a.role_id = r.id 
     LEFT JOIN users_table u ON a.id = u.auth_id
     WHERE a.email = ?`,
    [data.email]
  );

  if (users.length === 0) {
    throw new Error('User not found');
  }

  const user = users[0];

  // 1. Automatic Resend Verification if not verified
  if (user.is_verified === 0) {
    const verificationToken = jwt.sign(
      { email: data.email, userId: user.auth_id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '15m' }
    );
    const confirmationURL = `http://localhost:${process.env.PORT || 5002}/api/auth/verify?token=${verificationToken}`;
    const logoUrl = process.env.LOGO_URL || 'https://osgogrbrjlnslgdinhgl.supabase.co/storage/v1/object/public/email-assets/AgriLinkGREEN.png';
    const emailHtml = getEmailVerificationTemplate(confirmationURL, logoUrl);

    console.log('[Auth] Auto-resending verification email to:', data.email);
    sendEmail({
      to: data.email,
      subject: 'Verify Your AgriLink Account',
      html: emailHtml
    }).catch(err => console.error('[Auth] Failed to auto-resend verification', err));

    throw new Error('Please verify your email address. We have just sent a fresh verification link to your inbox.');
  }

  const isPasswordValid = await comparedPassword(data.password, user.password_hash);

  if (!isPasswordValid) {
    throw new Error('Invalid password');
  }

  return {
    id: user.user_id,
    auth_id: user.auth_id,
    email: data.email,
    role_name: user.role_name,
    first_name: user.first_name,
    last_name: user.last_name,
    onboarding_completed: user.onboarding_completed
  };
};

export const forgotPassword = async (email: string) => {
  const [users]: any = await db.execute('SELECT id, is_verified FROM auth_table WHERE email = ?', [email]);
  if (users.length === 0) return; // Silent return for security

  const user = users[0];
  const resetToken = jwt.sign({ email, type: 'reset' }, process.env.JWT_SECRET || 'secret', { expiresIn: '20m' });
  const resetURL = `http://localhost:5173/reset-password?token=${resetToken}`;
  
  await sendEmail({
    to: email,
    subject: 'AgriLink Password Reset Request',
    html: `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2>Password Reset</h2>
        <p>You requested a password reset for your AgriLink account. Click the button below to set a new password:</p>
        <a href="${resetURL}" style="display: inline-block; padding: 12px 24px; background-color: #5ba409; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
        <p style="margin-top: 20px; font-size: 12px; color: #999;">This link will expire in 20 minutes. If you did not request this, please ignore this email.</p>
      </div>
    `
  });
};

export const resetPasswordByToken = async (token: string, newPass: string) => {
  const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret');
  if (decoded.type !== 'reset') throw new Error('Invalid token type');
  
  const h = await hashPassword(newPass);
  await db.execute('UPDATE auth_table SET password_hash = ? WHERE email = ?', [h, decoded.email]);
};

export const updatePassword = async (authId: number, currentPassword: string, newPassword: string) => {
    // 1. Get current password hash
    const [users]: any = await db.execute(
        'SELECT password_hash FROM auth_table WHERE id = ?',
        [authId]
    );

    if (users.length === 0) {
        throw new Error('User not found');
    }

    const { password_hash } = users[0];

    // 2. Verify current password
    const isMatch = await comparedPassword(currentPassword, password_hash);
    if (!isMatch) {
        throw new Error('Current password is incorrect');
    }

    // 3. Hash new password
    const newHash = await hashPassword(newPassword);

    // 4. Update
    await db.execute(
        'UPDATE auth_table SET password_hash = ? WHERE id = ?',
        [newHash, authId]
    );

    return { message: 'Password updated successfully' };
};
