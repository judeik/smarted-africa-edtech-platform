import nodemailer from 'nodemailer';
import env from '../config/env.js';
import { info, error as logError } from '../utils/logger.js';

const createTransporter = () => {
  if (env.nodeEnv === 'test') {
    return nodemailer.createTransport({ jsonTransport: true });
  }
  if (!env.smtpHost || !env.smtpUser) {
    // Fall back to Ethereal preview transport in development
    return nodemailer.createTransport({ jsonTransport: true });
  }
  return nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: { user: env.smtpUser, pass: env.smtpPass },
  });
};

const transporter = createTransporter();

export async function sendEmail({ to, subject, html, text }) {
  const msg = {
    from: `"SmartEd Africa" <${env.emailFrom || 'no-reply@smarted.africa'}>`,
    to,
    subject,
    html,
    text,
  };

  try {
    const result = await transporter.sendMail(msg);
    info('[emailService] Sent to:', to, '| Subject:', subject);
    return result;
  } catch (err) {
    logError('[emailService] Failed to send to:', to, err.message);
    throw err;
  }
}
