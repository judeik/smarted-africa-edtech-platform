import crypto from 'crypto';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, revokeRefreshToken } from '../services/tokenService.js';
import { makeToken, saveToken, getUserIdForToken, revokeToken } from '../services/authTokenService.js';
import { sendEmail } from '../services/emailService.js';
import env from '../config/env.js';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'Strict',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  path: '/',
};

// POST /api/auth/register
export const register = async (req, res, next) => {
  try {
    const { name, email } = req.body;
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });

    if (existing) {
      if (existing.confirmed) {
        return res.status(409).json({ success: false, message: 'Email already registered.' });
      }
      // Resend confirmation
      const token = makeToken(32);
      await saveToken('emailConfirm', token, existing._id, 24 * 60 * 60);
      await sendEmail({
        to: normalizedEmail,
        subject: 'Confirm your SmartEd Africa account',
        html: buildConfirmEmail(token, existing.name),
      });
      return res.status(200).json({ success: true, message: 'Confirmation email resent.' });
    }

    const user = await User.create({ name, email: normalizedEmail, confirmed: false });
    const token = makeToken(32);
    await saveToken('emailConfirm', token, user._id, 24 * 60 * 60);
    await sendEmail({
      to: normalizedEmail,
      subject: 'Confirm your SmartEd Africa account',
      html: buildConfirmEmail(token, user.name),
    });

    return res.status(201).json({ success: true, message: 'Registration successful. Check your email.' });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/confirm/:token
export const confirmEmail = async (req, res, next) => {
  try {
    const userId = await getUserIdForToken('emailConfirm', req.params.token);
    if (!userId) {
      return res.status(400).json({ success: false, message: 'Invalid or expired confirmation link.' });
    }
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    user.confirmed = true;
    await user.save();
    await revokeToken('emailConfirm', req.params.token);

    return res.json({
      success: true,
      message: 'Email verified. Please set your password.',
      userId: user._id,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/set-password/:id
export const setPassword = async (req, res, next) => {
  try {
    const { password, confirmPassword } = req.body;
    if (!password || password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be 8+ chars with uppercase, lowercase, number, and special character.',
      });
    }
    const userId = req.params.id.trim();
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID.' });
    }
    const user = await User.findById(userId);
    if (!user || !user.confirmed) {
      return res.status(400).json({ success: false, message: 'Invalid user or email not confirmed.' });
    }

    user.password = password;
    await user.save();

    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user);
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

    return res.json({
      success: true,
      message: 'Password set.',
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      accessToken,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password +loginAttempts +lockUntil');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }
    if (!user.confirmed) {
      return res.status(403).json({ success: false, message: 'Please confirm your email first.' });
    }
    if (user.isLocked()) {
      const remaining = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(429).json({
        success: false,
        message: `Account locked. Try again in ${remaining} minute(s).`,
      });
    }
    if (!user.password) {
      return res.status(403).json({ success: false, message: 'Password not set. Check your email.' });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      await user.incrementLoginAttempts();
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Reset failed attempts on success
    user.loginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user);
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

    return res.json({
      success: true,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      accessToken,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/refresh
export const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ success: false, message: 'No refresh token.' });

    const { id } = await verifyRefreshToken(token);
    const user = await User.findById(id);
    if (!user) return res.status(401).json({ success: false, message: 'User not found.' });

    // Rotate: revoke old, issue new
    await revokeRefreshToken(token);
    const newRefresh = await generateRefreshToken(user);
    const accessToken = generateAccessToken(user);

    res.cookie('refreshToken', newRefresh, REFRESH_COOKIE_OPTIONS);
    return res.json({ success: true, accessToken });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/logout
export const logout = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    if (token) await revokeRefreshToken(token);
    res.clearCookie('refreshToken', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'Strict', path: '/' });
    return res.json({ success: true, message: 'Logged out.' });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/forgot-password
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    // Always return 200 to prevent user enumeration
    if (!user || !user.confirmed) {
      return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    }

    const token = makeToken(32);
    await saveToken('passwordReset', token, user._id, 60 * 60); // 1 hour

    await sendEmail({
      to: user.email,
      subject: 'SmartEd Africa – Reset your password',
      html: buildResetEmail(token, user.name),
    });

    return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/reset-password/:token
export const resetPassword = async (req, res, next) => {
  try {
    const { password, confirmPassword } = req.body;
    if (!password || password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }
    const userId = await getUserIdForToken('passwordReset', req.params.token);
    if (!userId) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset link.' });
    }
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    user.password = password;
    user.loginAttempts = 0;
    user.lockUntil = null;
    await user.save();
    await revokeToken('passwordReset', req.params.token);

    await sendEmail({
      to: user.email,
      subject: 'SmartEd Africa – Password changed',
      html: `<p>Hi ${user.name}, your password has been changed successfully.</p>`,
    });

    return res.json({ success: true, message: 'Password reset successful.' });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/resend-confirmation
export const resendConfirmation = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || user.confirmed) {
      return res.json({ success: true, message: 'If that email exists and is unconfirmed, a link has been sent.' });
    }
    const token = makeToken(32);
    await saveToken('emailConfirm', token, user._id, 24 * 60 * 60);
    await sendEmail({
      to: user.email,
      subject: 'Confirm your SmartEd Africa account',
      html: buildConfirmEmail(token, user.name),
    });
    return res.json({ success: true, message: 'If that email exists and is unconfirmed, a link has been sent.' });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me  (requires protect middleware)
export const getMe = async (req, res) => {
  return res.json({
    success: true,
    user: { id: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role },
  });
};

// ── Email templates ──────────────────────────────────────────────────────────

function buildConfirmEmail(token, name) {
  const url = `${env.frontendUrl}/confirm/${token}`;
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h2>Welcome to SmartEd Africa, ${name}!</h2>
      <p>Click the button below to confirm your email address.</p>
      <a href="${url}" style="display:inline-block;padding:12px 24px;background:#16a34a;color:#fff;border-radius:6px;text-decoration:none">
        Confirm Email
      </a>
      <p style="color:#888;font-size:12px">This link expires in 24 hours.</p>
    </div>`;
}

function buildResetEmail(token, name) {
  const url = `${env.frontendUrl}/reset-password/${token}`;
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h2>Reset your SmartEd Africa password</h2>
      <p>Hi ${name}, click below to reset your password. This link expires in 1 hour.</p>
      <a href="${url}" style="display:inline-block;padding:12px 24px;background:#16a34a;color:#fff;border-radius:6px;text-decoration:none">
        Reset Password
      </a>
      <p style="color:#888;font-size:12px">If you didn't request this, ignore this email.</p>
    </div>`;
}
